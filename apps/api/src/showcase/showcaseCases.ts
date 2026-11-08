import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { DEFAULT_PACK_DIR } from "../pack/active.js";
import { loadPack } from "../pack/load.js";
import { getModelProfile, withModelProfiles } from "../config/modelProfiles.js";
import { enforceComputePolicies, withIsolatedComputePolicy, computeCall, type ComputeAccounting } from "../compute/admission.js";
import { withProcessingPolicy } from "../privacy/contextPolicy.js";
import { OpenRouterProvider } from "../providers/openRouterProvider.js";
import { ExperimentLedger } from "./ledger.js";
import { validateBenchmark, validatePlan, prepare, hash, type Plan } from "./protocol.js";
import { runShowcase as rawRunShowcase, runtimeIdentity } from "./runner.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { revisionIdentity } from "./revision.js";
import { contextHeadroom } from "./context.js";
import { buildCompactPrompt } from "../prompt/compactPrompt.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const trial = new TrialRecord(TRIAL_DIRECTORY, "showcase-localhost-fixtures", "pnpm --filter @afribit/api test:showcase");
trial.event("revision", revisionIdentity());
const runShowcase = (...args: Parameters<typeof rawRunShowcase>) => { args[6] = trial; return rawRunShowcase(...args); };
const pack = loadPack(DEFAULT_PACK_DIR).pack!;
const benchmark = validateBenchmark(JSON.parse(readFileSync(join(root, "docs/evaluation/showcase-synthetic-v1.json"), "utf8")), pack);
const example = validatePlan(JSON.parse(readFileSync(join(root, "docs/examples/showcase-plan.json"), "utf8")));
const dir = mkdtempSync(join(tmpdir(), "afribit-showcase-"));
const original = { ...env }, prior = enforceComputePolicies(false);
let checks = 0, suitePassed = false;
const ok = async (name: string, fn: () => Promise<void> | void) => {
  trial.event("case-started", { name });
  try { await fn(); checks++; trial.event("case-passed", { name }); console.log(`  ok  ${name}`); }
  catch (error) { trial.event("case-failed", { name }); throw error; }
};
let mode = "ok", closed = false;
const seen: any[] = [];
const server = createServer(async (req, res) => {
  const buffers: Buffer[] = []; for await (const chunk of req) buffers.push(Buffer.from(chunk));
  const body = JSON.parse(Buffer.concat(buffers).toString()); seen.push(body);
  if (mode === "error") { res.writeHead(503); res.end("Synthetic provider error"); return; }
  if (mode === "hang") { res.on("close", () => { closed = true; }); return; }
  if (mode === "native-compact") {
    res.writeHead(200,{"content-type":"application/x-ndjson"});
    res.end(JSON.stringify({model:body.model,message:{content:"SYNTHETIC-COMPACT"},done:false})+"\n"+
      JSON.stringify({model:body.model,message:{content:""},done:true,done_reason:"stop",prompt_eval_count:50,eval_count:5})+"\n");return;
  }
  res.writeHead(200, { "content-type": "text/event-stream" });
  const delta = (content: string) => `data: ${JSON.stringify({ model: body.model, choices: [{ delta: { content } }] })}\n\n`;
  res.write(delta(mode === "oversized" ? "x".repeat(66_000) : "SYNTHETIC-ANSWER"));
  if (mode === "partial") { setTimeout(() => res.destroy(), 15); return; }
  if (mode === "stall") { res.on("close", () => { closed = true; }); return; }
  res.end(`data: ${JSON.stringify({ model: body.model, choices: [{ delta: {}, finish_reason: mode === "truncated" ? "length" : "stop" }], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5, ...(mode === "missing-cost" ? {} : { cost: mode === "overrun" ? 1 : 0.000001 }) } })}\n\ndata: [DONE]\n\n`);
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
Object.assign(env, { openRouterBaseUrl: baseUrl, openRouterApiKey: "SYNTHETIC-CREDENTIAL", localLlmBaseUrl: baseUrl, localLlmApiKey: "SYNTHETIC-CREDENTIAL", localLlmApi: "openai", localLlmModel: "deployment-default-should-not-win" });
const candidate = { id: "candidate-secret-a", modelRevision: "synthetic-revision", route: { ...example.candidates[0]!.route, provider: "openrouter" as const, model: "synthetic-model-a", baseUrl, region: "unrestricted" as const, reservationMicrousd: 100,
  billingBoundConfirmed: true, upstreams: ["synthetic-upstream"], promptPriceMicrousdPerMillion: 1000, completionPriceMicrousdPerMillion: 1000 } };
function plan(patch: Partial<Plan> = {}): Plan { return validatePlan({ ...example, timeoutMs: 150, maxDurationMs: 3000, upstreamLimitReference: "synthetic limit and shutdown evidence; no rental", candidates: [candidate], ...patch }); }
let sequence = 0;
const paths = () => ({ ledger: join(dir, `experiment-${++sequence}.json`), artifacts: join(dir, "artifacts") });
const revision = { commit: "synthetic-revision", dirty: true, sourceHash: hash("synthetic-source") };
const waitClosed = async () => { for (let n = 0; n < 100 && !closed; n++) await new Promise(r => setTimeout(r, 10)); assert.equal(closed, true); };
try {
  await ok("showcase protocol: shipped examples validate; hashes and paired settings are stable", () => {
    const a = prepare(example, benchmark, pack), b = prepare(example, benchmark, pack);
    assert.equal(a.fingerprint, b.fingerprint); assert.equal(a.tasks.length, 8);
    assert.notEqual(a.fingerprint, prepare({ ...example, answerWordLimit: 100 }, benchmark, pack).fingerprint);
    assert.notEqual(a.fingerprint, prepare(example, benchmark, pack, { wireFormat: "different" }).fingerprint);
    for (let i = 0; i < a.tasks.length; i += 2) {
      const bare = a.tasks[i]!, supplied = a.tasks[i + 1]!;
      assert.deepEqual(bare.profile, supplied.profile); assert.equal(bare.profile.temperature, 0); assert.equal(bare.profile.fallbackProfile, null);
      assert.equal(bare.messages.at(-1)!.content, supplied.messages.at(-1)!.content);
      assert.equal(bare.messages.length, 2);
    }
  });
  await ok("showcase protocol: rejects non-synthetic, duplicate, private/unknown fields and invalid bounds", () => {
    for (const bad of [{ ...benchmark, synthetic: false }, { ...benchmark, cases: [benchmark.cases[0], benchmark.cases[0]] }, { ...benchmark, privateMemory: "no" }, { ...benchmark, cases: [{ ...benchmark.cases[0], question: "x".repeat(8001) }] }]) assert.throws(() => validateBenchmark(bad, pack));
    for (const bad of [{ ...example, apiKey: "no" }, { ...example, budgetMicrousd: 10_000_001 }, { ...example, heldAsideMicrousd: 0 }, { ...example, concurrency: "4" }, { ...example, candidates: [candidate, candidate] }]) assert.throws(() => validatePlan(bad));
    assert.throws(() => prepare(plan({ candidates: [{ ...candidate, route: { ...candidate.route, maxInputBytes: 256 } }] }), benchmark, pack));
    assert.throws(() => prepare(plan({ externalChargesMicrousd: 7_999_999 }), benchmark, pack), /envelope/);
  });
  await ok("context admission: UTF-8, framing and full output reservation count at exact boundaries", () => {
    const messages = [{role: "user" as const, content: "é🙂"}];
    const estimate = contextHeadroom(messages, 300, 626);
    assert.equal(estimate.contentBytes, 6); assert.equal(estimate.promptEstimate, 326);
    assert.equal(estimate.remainingEstimate, 0); assert.equal(estimate.exactTokenizer, false);
    assert.equal(contextHeadroom(messages, 301, 626).remainingEstimate, -1);
    assert.equal(contextHeadroom([...messages, ...messages], 300, 626).promptEstimate, 396);
    const unbounded = prepare(plan(), benchmark, pack).tasks;
    const exact = Math.max(...unbounded.map(t => contextHeadroom(t.messages, 300, 131072).promptEstimate)) + 300;
    assert.doesNotThrow(() => prepare(plan({maxOutputTokens:300, contextWindowTokens:exact}), benchmark, pack));
    assert.throws(() => prepare(plan({maxOutputTokens:300, contextWindowTokens:exact-1}), benchmark, pack), /headroom/);
  });
  await ok("context admission: old full/4096 refuses; compact/8192 preserves questions and supplied facts", () => {
    assert.throws(() => prepare(plan({maxOutputTokens:300, contextWindowTokens:4096}), benchmark, pack), /headroom/);
    const p = plan({promptMode:"compact", maxOutputTokens:300, contextWindowTokens:8192});
    const compact = prepare(p, benchmark, pack), full = prepare(plan(), benchmark, pack);
    assert.notEqual(compact.fingerprint, full.fingerprint);
    for (const t of compact.tasks) {
      assert.ok(t.context && t.context.remainingEstimate >= 0);
      assert.equal(t.messages.at(-1)!.content, t.case.question);
      if (t.variant === "supplied-context") {
        for (const passage of t.case.passages) assert.ok(t.messages[0]!.content.includes(passage.text));
        assert.ok(t.messages[0]!.content.includes(pack.prompts.safetyCompact));
        const expected = buildCompactPrompt({languageMode:t.case.languageMode,explanationLevel:"simple",retrieval:t.case.passages.map(p=>({conceptId:p.id,authoritativeContent:p.text,safetyWarnings:[],confidence:1,approvedExamples:[],languageGuidance:null,sourceVersion:1,freshnessDate:"synthetic-fixture-v1",relatedConcepts:[]})),conversationHistory:[],userMessage:t.case.question},pack);
        assert.ok(t.messages[0]!.content.startsWith(expected[0]!.content));
      }
    }
    for (const patch of [{promptMode:"automatic"},{contextWindowTokens:null},{contextWindowTokens:NaN},{contextWindowTokens:511},{contextWindowTokens:131073},{contextWindowTokens:1024.5},{maxOutputTokens:1024,contextWindowTokens:1024}]) assert.throws(()=>validatePlan({...example,...patch}));
  });
  await ok("context admission: native runtime window applies without plan hint and mismatches refuse before dispatch", async () => {
    const local = {...candidate, route:{...candidate.route,provider:"local" as const,region:"community" as const,reservationMicrousd:0,upstreams:[]}};
    const native = {localApi:"ollama", numCtx:4096};
    assert.throws(()=>prepare(plan({candidates:[local]}),benchmark,pack,native),/headroom/);
    assert.throws(()=>prepare(plan({candidates:[local],promptMode:"compact",contextWindowTokens:8192}),benchmark,pack,native),/does not match/);
    const previous = {...env}, before=seen.length, files=paths();
    try {
      Object.assign(env,{localLlmApi:"ollama",localLlmNumCtx:4096});
      await assert.rejects(()=>runShowcase(plan({candidates:[local]}),benchmark,pack,files,revision),/headroom/);
      assert.equal(seen.length,before); assert.equal(existsSync(files.ledger),false);
    } finally {Object.assign(env,previous);}
  });
  await ok("runner: length finish retains partial answer and usage but fails blind review and summary", async () => {
    mode="truncated";
    try {
      const result=await runShowcase(plan(),{...benchmark,cases:[benchmark.cases[0]!]},pack,paths(),revision);
      assert.equal(result.completed,0); assert.equal(result.failed,2); assert.equal(result.truncated,2);
      const operator=JSON.parse(readFileSync(join(result.artifacts,"operator.json"),"utf8"));
      assert.ok(operator.results.every((r:any)=>r.failureCode==="truncated" && r.answer==="SYNTHETIC-ANSWER" && r.response.finishReason==="length" && r.response.usage.totalTokens===5));
      const review=JSON.parse(readFileSync(join(result.artifacts,"blind-review.json"),"utf8"));
      assert.ok(review.entries.every((r:any)=>r.complete===false));
    } finally {mode="ok";}
  });
  await ok("runner: explicit compact/native context reaches adapter and persists headroom evidence", async () => {
    const previous={...env},before=seen.length;
    const local={...candidate,route:{...candidate.route,provider:"local" as const,region:"community" as const,reservationMicrousd:0,upstreams:[]}};
    mode="native-compact";
    try {
      Object.assign(env,{localLlmApi:"ollama",localLlmNumCtx:8192,localLlmDisableThinking:true});
      const p=plan({candidates:[local],promptMode:"compact",contextWindowTokens:8192,maxOutputTokens:300});
      const result=await runShowcase(p,benchmark,pack,paths(),revision);
      assert.equal(result.completed,8); assert.equal(result.truncated,0);
      assert.ok(seen.slice(before).every(b=>b.options.num_ctx===8192 && b.options.num_predict===300 && b.think===false));
      const manifest=JSON.parse(readFileSync(join(result.artifacts,"manifest.json"),"utf8"));
      assert.equal(manifest.promptMode,"compact"); assert.equal(manifest.providerRuntime.numCtx,8192);
      assert.equal(manifest.contextAdmission.length,8);
      assert.ok(manifest.contextAdmission.every((a:any)=>a.context.reservedOutputTokens===300 && a.context.remainingEstimate>=0 && a.context.exactTokenizer===false));
    } finally {mode="ok";Object.assign(env,previous);}
  });
  await ok("experiment ledger: exclusive process lock, persistent reservations and immutable envelope", async () => {
    const path = paths().ledger, envelope = { fingerprint: hash("plan"), budgetMicrousd: 2_000_100, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: 0, maxAttempts: 4 };
    let ledger = ExperimentLedger.open(path, envelope);
    assert.throws(() => ExperimentLedger.open(path, envelope));
    const id = await ledger.reserve(candidate.route); await ledger.finish(id, "failed", null); ledger.close();
    assert.equal(existsSync(`${path}.lock`), false);
    ledger = ExperimentLedger.open(path, envelope); await assert.rejects(() => ledger.reserve(candidate.route), /exhausted/); ledger.close();
    assert.throws(() => ExperimentLedger.open(path, { ...envelope, budgetMicrousd: 3_000_000 }));
    assert.throws(() => ExperimentLedger.open(path, { ...envelope, maxAttempts: 5 }));
    assert.equal(existsSync(`${path}.lock`), false);
  });
  await ok("experiment ledger: concurrent admission shares money and attempt caps; overrun persists stop", async () => {
    const p = paths().ledger, envelope = { fingerprint: hash("concurrent"), budgetMicrousd: 2_000_100, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: 0, maxAttempts: 1 };
    let ledger = ExperimentLedger.open(p, envelope);
    const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => ledger.reserve(candidate.route)));
    assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1);
    await ledger.finish(ledger.snapshot().attempts[0]!.id, "completed", 1); ledger.close();
    ledger = ExperimentLedger.open(p, envelope); assert.equal(ledger.snapshot().stopped, true); await assert.rejects(() => ledger.reserve(candidate.route)); ledger.close();
  });
  await ok("experiment ledger: orphan lock/corrupt ledger and persistence failure deny new permits", async () => {
    const p = paths().ledger, envelope = { fingerprint: hash("corrupt"), budgetMicrousd: 3_000_000, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: 0, maxAttempts: 2 };
    writeFileSync(`${p}.lock`, "crash lock"); assert.throws(() => ExperimentLedger.open(p, envelope)); assert.equal(readFileSync(`${p}.lock`, "utf8"), "crash lock");
    const corrupt = paths().ledger; writeFileSync(corrupt, "not-json"); assert.throws(() => ExperimentLedger.open(corrupt, envelope));
    const active = paths().ledger, ledger = ExperimentLedger.open(active, envelope);
    // A destination that cannot be replaced forces persistence to fail before any permit is returned.
    const fs = await import("node:fs"); fs.renameSync(active, `${active}.original`); mkdirSync(active);
    await assert.rejects(() => ledger.reserve(candidate.route)); assert.equal(ledger.snapshot().stopped, true); await assert.rejects(() => ledger.reserve(candidate.route));
    assert.throws(() => ledger.close(), /uncertain/); assert.equal(existsSync(`${active}.lock`), true);
  });
  await ok("experiment ledger: settlement drain keeps the lock, and overdue cleanup leaves a persistent stop", async () => {
    const p = paths().ledger, envelope = { fingerprint: hash("drain"), budgetMicrousd: 3_000_000, heldAsideMicrousd: 2_000_000, externalChargesMicrousd: 0, maxAttempts: 2 };
    const ledger = ExperimentLedger.open(p, envelope), id = await ledger.reserve(candidate.route);
    assert.throws(() => ledger.close(), /outstanding/);
    setTimeout(() => { void ledger.finish(id, "failed", null); }, 10);
    await ledger.drain(); assert.equal(ledger.snapshot().attempts[0]!.status, "failed");
    const second = await ledger.reserve(candidate.route);
    await assert.rejects(() => ledger.drain(10), /lock retained/);
    assert.equal(existsSync(`${p}.lock`), true); assert.equal(ledger.snapshot().stopped, true);
    await ledger.finish(second, "cancelled", null); ledger.close();
  });
  await ok("scoped profiles: concurrent experiments do not change configured defaults or each other", async () => {
    const baseline = getModelProfile("default_chat").model;
    await Promise.all(["one", "two"].map(model => withModelProfiles([{ ...getModelProfile("default_chat"), model, fallbackProfile: null }], async () => {
      await new Promise(r => setTimeout(r, 5)); assert.equal(getModelProfile("default_chat").model, model);
    })));
    assert.equal(getModelProfile("default_chat").model, baseline);
    assert.throws(() => withModelProfiles([{ ...getModelProfile("default_chat"), fallbackProfile: "fallback_chat" }], () => null));
  });
  await ok("isolated admission: cannot replace API/nested policy or override local-only processing", async () => {
    const policy = { dailyBudgetMicrousd: 100, dailyAttemptLimit: 1, routes: [candidate.route] };
    const accounting: ComputeAccounting = { reserve: async () => "synthetic", finish: async () => {} };
    enforceComputePolicies(true); try { assert.throws(() => withIsolatedComputePolicy(policy, accounting, () => null)); } finally { enforceComputePolicies(false); }
    const before = seen.length;
    await withIsolatedComputePolicy(policy, accounting, async () => {
      assert.throws(() => withIsolatedComputePolicy(policy, accounting, () => null));
      await assert.rejects(() => computeCall({ ...candidate.route, model: "forbidden" }, {}, 1, async () => "no"));
      await withProcessingPolicy({ localOnly: true, reviewedOnly: false }, () => assert.rejects(() => new OpenRouterProvider().chat({ requestId: "no", messages: [], maxOutputTokens: 1, modelProfile: "default_chat", temperature: 0, privacyProfile: "strict", languageMode: "sheng", explanationLevel: "simple" }), /Local-only/));
    });
    assert.equal(seen.length, before);
  });
  await ok("runner: real streaming yields paired evidence, anonymous review files and no DB/credential output", async () => {
    const p = plan(), files = paths(), before = seen.length;
    const result = await runShowcase(p, benchmark, pack, files, revision);
    assert.equal(result.completed, 8); assert.equal(result.failed, 0); assert.equal(seen.length, before + 8);
    const review = readFileSync(join(result.artifacts, "blind-review.json"), "utf8");
    for (const forbidden of [candidate.id, candidate.route.model, "supplied-context", "SYNTHETIC-CREDENTIAL"]) assert.equal(review.includes(forbidden), false);
    const operator = JSON.parse(readFileSync(join(result.artifacts, "operator.json"), "utf8"));
    const events = JSON.parse(readFileSync(trial.filename, "utf8")).events;
    const starts = events.filter((e: any) => e.phase === "attempt-started" && e.details.artifacts === result.artifacts);
    const finishes = events.filter((e: any) => e.phase === "attempt-result" && e.details.artifacts === result.artifacts);
    assert.equal(starts.length, 8); assert.equal(finishes.length, 8); assert.equal(operator.trialId, trial.id);
    assert.ok(operator.results.every((r: any) => r.firstTokenMs !== null && r.fullMs >= r.firstTokenMs && r.response.usage.totalTokens === 5));
    assert.equal(JSON.stringify(operator).includes("SYNTHETIC-CREDENTIAL"), false);
    assert.ok(seen.slice(before).every(b => b.temperature === 0 && b.max_tokens === p.maxOutputTokens && b.provider.allow_fallbacks === false));
    const resumed = await runShowcase(p, benchmark, pack, files, revision); assert.equal(resumed.completed, 0); assert.equal(seen.length, before + 8);
  });
  await ok("runner: four-worker mode shares ledger and honors both local scoped model selections", async () => {
    const local = (id: string) => ({ ...candidate, id, route: { ...candidate.route, provider: "local" as const, region: "community" as const, model: `synthetic-${id}`, reservationMicrousd: 0, upstreams: [] } });
    const p = plan({ candidates: [local("local-one"), local("local-two")], concurrency: 4 }), before = seen.length;
    const result = await runShowcase(p, benchmark, pack, paths(), revision); assert.equal(result.completed, 16);
    assert.deepEqual(new Set(seen.slice(before).map(b => b.model)), new Set(["synthetic-local-one", "synthetic-local-two"]));
  });
  await ok("runner: missing reported cost retains allowance; an overrun stops later calls", async () => {
    mode = "missing-cost"; const files = paths();
    const result = await runShowcase(plan(), benchmark, pack, files, revision); assert.equal(result.completed, 8);
    const state = JSON.parse(readFileSync(files.ledger, "utf8")); assert.ok(state.attempts.every((a: any) => a.reservedMicrousd === 100 && a.reportedMicrousd === null));
    mode = "overrun"; const before = seen.length, stopped = await runShowcase(plan(), benchmark, pack, paths(), revision);
    assert.equal(stopped.stopped, true); assert.equal(seen.length, before + 1); assert.equal(stopped.skipped, 7); mode = "ok";
  });
  await ok("runner: interrupted, timed-out and oversized answers are failures without implicit retries", async () => {
    for (const failure of ["error", "partial", "hang", "oversized"]) {
      mode = failure; closed = false; const before = seen.length;
      const result = await runShowcase(plan({ timeoutMs: 50 }), { ...benchmark, cases: [benchmark.cases[0]!] }, pack, paths(), revision);
      assert.equal(result.failed, 2); assert.equal(seen.length, before + 2);
      const operator = JSON.parse(readFileSync(join(result.artifacts, "operator.json"), "utf8"));
      assert.ok(operator.results.every((r: any) => r.failureCode === (failure === "hang" ? "timeout" : failure === "oversized" ? "bounds" : "provider")));
      if (failure === "hang") await waitClosed();
    } mode = "ok";
  });
  await ok("runner: cancellation and whole-experiment deadline stop later dispatch and close sockets", async () => {
    mode = "stall"; closed = false; const before = seen.length, controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40);
    try { const result = await runShowcase(plan({ timeoutMs: 1000 }), benchmark, pack, paths(), revision, controller.signal); assert.equal(result.cancelled, true); assert.equal(result.skipped, 7); }
    finally { clearTimeout(timer); }
    await waitClosed(); assert.equal(seen.length, before + 1);
    const result = await runShowcase(plan({ timeoutMs: 1000, maxDurationMs: 100 }), benchmark, pack, paths(), revision); assert.equal(result.cancelled, true); assert.equal(result.skipped, 7); mode = "ok";
  });
  await ok("runner: unmatched endpoint/auth/evidence and already-aborted work fail before dispatch", async () => {
    const before = seen.length, p = plan();
    await assert.rejects(() => runShowcase({ ...p, candidates: [{ ...candidate, route: { ...candidate.route, baseUrl: "https://unmatched.invalid" } }] }, benchmark, pack, paths(), revision));
    await assert.rejects(() => runShowcase({ ...p, upstreamLimitReference: "" }, benchmark, pack, paths(), revision));
    const key = env.openRouterApiKey; Object.assign(env, { openRouterApiKey: "" }); try { await assert.rejects(() => runShowcase(p, benchmark, pack, paths(), revision)); } finally { Object.assign(env, { openRouterApiKey: key }); }
    const controller = new AbortController(); controller.abort(); await assert.rejects(() => runShowcase(p, benchmark, pack, paths(), revision, controller.signal)); assert.equal(seen.length, before);
  });
  const proofDir = join(root, "output/proof"); mkdirSync(proofDir, { recursive: true });
  writeFileSync(join(proofDir, "p4-showcase-runner-proof.json"), JSON.stringify({ synthetic: true, localhostOnly: true, externalModelCalls: 0, paidComputeUsd: 0, checks, fixtureCalls: seen.length, trialRecord: trial.filename,
    limitations: ["No model quality result", "No human review", "No actual retrieval selection", "No real rental/shutdown/bill or upstream-limit verification"] }, null, 2) + "\n");
  console.log(`showcase: ${checks} checks passed; external model calls 0; paid compute USD 0`);
  suitePassed = true;
} finally {
  try { trial.finish(suitePassed ? "completed" : "failed", 0, { checks, externalModelCalls: 0, fixtureCalls: seen.length }); }
  finally { Object.assign(env, original); enforceComputePolicies(prior); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
