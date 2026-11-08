import { mkdirSync, writeFileSync } from "node:fs";
import { randomInt, randomUUID } from "node:crypto";
import { join } from "node:path";
import type { AfribitChatResponse } from "@afribit/shared";
import { createGateway } from "../gateway/registry.js";
import { withModelProfiles } from "../config/modelProfiles.js";
import { withIsolatedComputePolicy } from "../compute/admission.js";
import { normalizedBase } from "../compute/policy.js";
import { env } from "../config/env.js";
import type { CommunityPack } from "../pack/types.js";
import { runWithPack } from "../pack/active.js";
import { ExperimentLedger } from "./ledger.js";
import { hash, prepare, type Plan, type Benchmark } from "./protocol.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";

interface Result {
  taskId: string;
  reviewId: string;
  status: "ok" | "failed";
  failureCode: "cancelled" | "allowance" | "timeout" | "bounds" | "policy" | "provider" | "truncated" | null;
  answer: string;
  firstTokenMs: number | null;
  fullMs: number;
  response: Omit<AfribitChatResponse, "content" | "requestId"> | null;
}
function failureCode(error: unknown, cancelled: boolean): Result["failureCode"] {
  if (cancelled) return "cancelled";
  const messages: string[] = [];
  for (let depth = 0; depth < 8 && error instanceof Error; depth++) {
    messages.push(error.message);
    error = (error as Error & { cause?: unknown }).cause;
  }
  const message = messages.join(" ");
  if (/allowance|stopped|settlement/i.test(message)) return "allowance";
  if (/timed out/i.test(message)) return "timeout";
  if (/exceeds|limit|oversized/i.test(message)) return "bounds";
  if (/not allowed|not permitted|forbid|policy/i.test(message)) return "policy";
  return "provider";
}
export function runtimeIdentity(sourceHash = "not-recorded") {
  return { sourceHash, localApi: env.localLlmApi, numCtx: env.localLlmNumCtx, disableThinking: env.localLlmDisableThinking, numGpu: env.localLlmNumGpu ?? null };
}
export function checkEndpoints(plan: Plan) {
  for (const { route } of plan.candidates) {
    const actual = route.provider === "openrouter" ? env.openRouterBaseUrl : env.localLlmBaseUrl;
    if (normalizedBase(actual) !== route.baseUrl) throw new Error("Configured endpoint does not match the frozen candidate route");
    if (!(route.provider === "openrouter" ? env.openRouterApiKey : env.localLlmApiKey)) throw new Error("Authenticated showcase endpoint credentials are required");
    if (route.region !== "community" && !plan.upstreamLimitReference.trim()) throw new Error("Record upstream account limit and rental shutdown evidence before remote execution");
  }
}
export async function runShowcase(plan: Plan, benchmark: Benchmark, pack: CommunityPack, paths: { ledger: string; artifacts: string }, revision: { commit: string; dirty: boolean; sourceHash?: string }, signal?: AbortSignal, parentTrial?: TrialRecord) {
  const trial = parentTrial ?? new TrialRecord(TRIAL_DIRECTORY, "showcase-library-execution", "runShowcase(frozen plan, benchmark, pack)");
  try {
    trial.event("execution-requested", { planHash: hash(plan), benchmarkHash: hash(benchmark), packHash: hash(pack), commit: revision.commit, dirty: revision.dirty, sourceHash: revision.sourceHash ?? "not-recorded" });
    const result = await runShowcaseCore(plan, benchmark, pack, paths, revision, signal, trial);
    if (!parentTrial) trial.finish(result.cancelled ? "cancelled" : result.failed || result.skipped || result.stopped ? "failed" : "completed", null, result);
    return result;
  } catch (error) {
    if (!parentTrial) { try { trial.finish("failed", null, { reason: "validation-or-execution-failed" }); } catch { /* Keep unfinished evidence. */ } }
    throw error;
  }
}
async function runShowcaseCore(plan: Plan, benchmark: Benchmark, pack: CommunityPack, paths: { ledger: string; artifacts: string }, revision: { commit: string; dirty: boolean; sourceHash?: string }, signal: AbortSignal | undefined, trial: TrialRecord) {
  const runtime = runtimeIdentity(revision.sourceHash);
  const prepared = prepare(plan, benchmark, pack, runtime);
  checkEndpoints(plan);
  if (signal?.aborted) throw new Error("Showcase cancelled before execution");
  const ledger = ExperimentLedger.open(paths.ledger, { fingerprint: prepared.fingerprint, budgetMicrousd: plan.budgetMicrousd,
    heldAsideMicrousd: plan.heldAsideMicrousd, externalChargesMicrousd: plan.externalChargesMicrousd, maxAttempts: prepared.tasks.length });
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), plan.maxDurationMs);
  const results: Result[] = [];
  let cursor = 0;
  const gateway = createGateway();
  // Create a fresh directory before dispatch, so a rerun cannot overwrite earlier review evidence.
  const dir = join(paths.artifacts, randomUUID());
  try {
    trial.event("artifact-directory", { artifacts: dir, fingerprint: prepared.fingerprint });
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ schema: 1, trialId: trial.id, synthetic: true, startedAt: new Date().toISOString(), revision,
      fingerprint: prepared.fingerprint, planHash: hash(plan), benchmarkHash: hash(benchmark), packHash: hash(pack),
      protocol: "bare vs product prompt with supplied passages; no retrieval selection, safety post-filter or account/memory pipeline",
      plan, benchmark, packId: pack.id, plannedAttempts: prepared.tasks.length, concurrency: plan.concurrency,
      providerRuntime: runtime,
      promptMode: plan.promptMode ?? "full", contextAdmission: prepared.tasks.map(t => ({ taskId: t.id, context: t.context })),
      humanReview: "pending", peakMemory: null, actualRentalBill: null }, null, 2) + "\n", { mode: 0o600 });
    const policy = { routes: plan.candidates.map(c => c.route), dailyBudgetMicrousd: plan.budgetMicrousd, dailyAttemptLimit: prepared.tasks.length };
    await runWithPack(pack, () => withModelProfiles(prepared.tasks.filter((t, i, all) => all.findIndex(x => x.profile.profile === t.profile.profile) === i).map(t => t.profile),
      () => withIsolatedComputePolicy(policy, ledger, async () => {
        const worker = async () => {
          while (cursor < prepared.tasks.length && !combined.aborted && !ledger.snapshot().stopped) {
            const task = prepared.tasks[cursor++]!;
            try { trial.event("attempt-started", { artifacts: dir, taskId: task.id, candidate: task.candidate.id, caseId: task.case.id, variant: task.variant }); }
            catch (error) { controller.abort(); throw error; }
            const started = performance.now(); let firstTokenMs: number | null = null, answer = "", response: AfribitChatResponse | null = null;
            let status: Result["status"] = "ok";
            let failed: Result["failureCode"] = null;
            try {
              const gen = gateway.chatStream({ requestId: randomUUID(), modelProfile: task.profile.profile, messages: task.messages,
                maxOutputTokens: plan.maxOutputTokens, temperature: 0, privacyProfile: "strict", languageMode: task.case.languageMode,
                explanationLevel: "simple", signal: combined });
              let next = await gen.next();
              while (!next.done) {
                if (next.value && firstTokenMs === null) firstTokenMs = performance.now() - started;
                answer += next.value;
                if (Buffer.byteLength(answer, "utf8") > 65_536) {
                  await gen.return(undefined as never);
                  throw new Error("Showcase output exceeds its evidence limit");
                }
                next = await gen.next();
              }
              response = next.value;
              if (response.finishReason === "length") { status = "failed"; failed = "truncated"; }
              else if (response.finishReason === "error") { status = "failed"; failed = "provider"; }
            } catch (error) { status = "failed"; failed = failureCode(error, combined.aborted); }
            const { content: _, requestId: __, ...metadata } = response ?? {} as AfribitChatResponse;
            results.push({ taskId: task.id, reviewId: randomUUID(), status, failureCode: failed, answer, firstTokenMs, fullMs: performance.now() - started, response: response ? metadata : null });
            // Partial evidence survives a later crash, independent of final review-sheet generation.
            try {
              writeFileSync(join(dir, `${task.id}.json`), JSON.stringify(results.at(-1), null, 2) + "\n", { mode: 0o600 });
              trial.event("attempt-result", { artifacts: dir, taskId: task.id, status, failureCode: failed, firstTokenMs, fullMs: performance.now() - started,
                reportedCostUsd: response?.estimatedCostUsd ?? null });
            }
            catch (error) { controller.abort(); throw error; }
          }
        };
        const workers = await Promise.allSettled(Array.from({ length: plan.concurrency }, worker));
        const failure = workers.find(w => w.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      })));
  } finally {
    clearTimeout(timer);
    try {
      await ledger.drain();
      const operator = results.map(r => ({ ...r, candidate: prepared.tasks.find(t => t.id === r.taskId)!.candidate.id, variant: prepared.tasks.find(t => t.id === r.taskId)!.variant }));
      const review = results.map(r => {
        const c = prepared.tasks.find(t => t.id === r.taskId)!.case;
        return { reviewId: r.reviewId, question: c.question, answer: r.answer, complete: r.status === "ok", must: c.must, mustNot: c.mustNot,
          scores: { correctness: null, safety: null, naturalLanguage: null, usefulness: null }, reviewer: null, notes: "" };
      });
      for (let i = review.length - 1; i > 0; i--) { const j = randomInt(i + 1); [review[i], review[j]] = [review[j]!, review[i]!]; }
      writeFileSync(join(dir, "operator.json"), JSON.stringify({ trialId: trial.id, fingerprint: prepared.fingerprint, finishedAt: new Date().toISOString(),
        cancelled: combined.aborted, skipped: prepared.tasks.length - results.length, ledger: ledger.snapshot(), results: operator }, null, 2) + "\n", { mode: 0o600 });
      writeFileSync(join(dir, "blind-review.json"), JSON.stringify({ synthetic: true, humanReview: "pending", entries: review }, null, 2) + "\n", { mode: 0o600 });
    } finally { ledger.close(); }
  }
  return { artifacts: dir, completed: results.filter(r => r.status === "ok").length, failed: results.filter(r => r.status === "failed").length,
    truncated: results.filter(r => r.failureCode === "truncated").length,
    skipped: prepared.tasks.length - results.length, cancelled: combined.aborted, stopped: ledger.snapshot().stopped };
}
