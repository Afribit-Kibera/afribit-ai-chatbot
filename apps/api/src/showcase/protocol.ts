import { createHash } from "node:crypto";
import type { AfribitChatMessage, ModelProfile } from "@afribit/shared";
import { validateComputePolicy, selectRoute, type ComputePolicy, type ComputeRoute } from "../compute/policy.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { buildCompactPrompt } from "../prompt/compactPrompt.js";
import { contextHeadroom } from "./context.js";
import type { CommunityPack } from "../pack/types.js";

export interface BenchmarkCase {
  id: string;
  question: string;
  languageMode: string;
  passages: { id: string; text: string }[];
  must: string[];
  mustNot: string[];
}
export interface Benchmark { schema: 1; synthetic: true; cases: BenchmarkCase[] }
export interface Candidate { id: string; modelRevision: string; route: ComputeRoute }
export interface Plan {
  schema: 1;
  budgetMicrousd: number;
  heldAsideMicrousd: number;
  externalChargesMicrousd: number;
  upstreamLimitReference: string;
  maxOutputTokens: number;
  answerWordLimit: number;
  timeoutMs: number;
  maxDurationMs: number;
  concurrency: 1 | 4;
  repetitions: number;
  candidates: Candidate[];
  promptMode?: "full" | "compact";
  contextWindowTokens?: number;
}
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const only = (x: object, keys: string[]) => Object.keys(x).every(k => keys.includes(k));
const integer = (x: unknown, min: number, max: number) => typeof x === "number" && Number.isSafeInteger(x) && x >= min && x <= max;
const text = (x: unknown, max: number): x is string => typeof x === "string" && x.length > 0 && Buffer.byteLength(x, "utf8") <= max;
const id = (x: unknown): x is string => typeof x === "string" && /^[a-zA-Z0-9_-]{1,48}$/.test(x);
const points = (x: unknown): x is string[] => Array.isArray(x) && x.length <= 12 && x.every(s => text(s, 1000));

export function validateBenchmark(value: unknown, pack: CommunityPack): Benchmark {
  if (!object(value) || !only(value, ["schema", "synthetic", "cases"]) || value.schema !== 1 || value.synthetic !== true || !Array.isArray(value.cases) || !integer(value.cases.length, 1, 12)) throw new Error("Invalid synthetic benchmark");
  for (const c of value.cases) {
    if (!object(c) || !only(c, ["id", "question", "languageMode", "passages", "must", "mustNot"]) || !id(c.id) || !text(c.question, 8000)
      || !pack.modes.some(m => m.id === c.languageMode) || !points(c.must) || !points(c.mustNot) || !Array.isArray(c.passages) || c.passages.length > 5
      || c.passages.some(p => !object(p) || !only(p, ["id", "text"]) || !id(p.id) || !text(p.text, 8000))) throw new Error("Invalid benchmark case or supplied passage");
  }
  if (new Set(value.cases.map(c => c.id)).size !== value.cases.length) throw new Error("Duplicate benchmark case");
  return structuredClone(value) as unknown as Benchmark;
}
export function validatePlan(value: unknown): Plan {
  if (!object(value) || !only(value, ["schema", "budgetMicrousd", "heldAsideMicrousd", "externalChargesMicrousd", "upstreamLimitReference", "maxOutputTokens", "answerWordLimit", "timeoutMs", "maxDurationMs", "concurrency", "repetitions", "candidates", "promptMode", "contextWindowTokens"])
    || value.schema !== 1 || !integer(value.budgetMicrousd, 2_000_000, 10_000_000) || !integer(value.heldAsideMicrousd, 2_000_000, 10_000_000)
    || !integer(value.externalChargesMicrousd, 0, 8_000_000) || Number(value.heldAsideMicrousd) + Number(value.externalChargesMicrousd) > Number(value.budgetMicrousd)
    || typeof value.upstreamLimitReference !== "string" || value.upstreamLimitReference.length > 500
    || !integer(value.maxOutputTokens, 1, 4096) || !integer(value.answerWordLimit, 20, 500) || !integer(value.timeoutMs, 20, 300_000)
    || !integer(value.maxDurationMs, 100, 3_600_000) || (value.concurrency !== 1 && value.concurrency !== 4) || !integer(value.repetitions, 1, 4)
    || ("promptMode" in value && !["full", "compact"].includes(value.promptMode as string))
    || ("contextWindowTokens" in value && (!integer(value.contextWindowTokens, 512, 131072) || Number(value.contextWindowTokens) <= Number(value.maxOutputTokens)))
    || !Array.isArray(value.candidates) || !integer(value.candidates.length, 1, 2)) throw new Error("Invalid showcase plan or budget");
  for (const c of value.candidates) {
    if (!object(c) || !only(c, ["id", "modelRevision", "route"]) || !id(c.id) || !text(c.modelRevision, 200)) throw new Error("Invalid candidate");
    const policy = validateComputePolicy({ dailyBudgetMicrousd: value.budgetMicrousd, dailyAttemptLimit: 192, routes: [c.route] });
    c.route = policy.routes[0];
    if (policy.routes[0]!.kind !== "chat") throw new Error("Showcase candidates must be chat routes");
  }
  if (new Set(value.candidates.map(c => c.id)).size !== value.candidates.length) throw new Error("Duplicate candidate ID");
  if (new Set(value.candidates.map(c => JSON.stringify([c.route.provider, c.route.model, c.route.baseUrl]))).size !== value.candidates.length) throw new Error("Duplicate model route");
  return structuredClone(value) as unknown as Plan;
}
export const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
export interface Task { id: string; candidate: Candidate; case: BenchmarkCase; variant: "bare" | "supplied-context"; repetition: number; messages: AfribitChatMessage[]; profile: ModelProfile; context: ReturnType<typeof contextHeadroom> | null }

export function prepare(plan: Plan, benchmark: Benchmark, pack: CommunityPack, runtime: unknown = {}) {
  const tasks: Task[] = [];
  const native = object(runtime) && runtime.localApi === "ollama";
  const nativeWindow = native ? runtime.numCtx : undefined;
  if (native && plan.candidates.some(c => c.route.provider === "local") && !integer(nativeWindow, 512, 131072)) throw new Error("Invalid native Ollama context window");
  const builder = plan.promptMode === "compact" ? buildCompactPrompt : buildPrompt;
  for (const candidate of plan.candidates) for (const c of benchmark.cases) for (let repetition = 0; repetition < plan.repetitions; repetition++) for (const variant of ["bare", "supplied-context"] as const) {
    const common = `Answer the question in the requested language mode (${c.languageMode}) using at most ${plan.answerWordLimit} words. Be accurate, explain uncertainty and never ask for passwords, PINs or recovery phrases. Avoid promises of profit.`;
    const messages: AfribitChatMessage[] = variant === "bare" ? [{ role: "system", content: `You are a helpful Bitcoin education assistant. ${common}` }, { role: "user", content: c.question }]
      : builder({ languageMode: c.languageMode, explanationLevel: "simple", conversationHistory: [], userMessage: c.question,
        retrieval: c.passages.map(p => ({ conceptId: p.id, authoritativeContent: p.text, safetyWarnings: [], confidence: 1,
          approvedExamples: [], languageGuidance: null, sourceVersion: 1, freshnessDate: "synthetic-fixture-v1", relatedConcepts: [] })) }, pack);
    if (variant === "supplied-context") messages[0]!.content += `\n\n${common}`;
    const policy: ComputePolicy = { dailyBudgetMicrousd: plan.budgetMicrousd, dailyAttemptLimit: 192, routes: [candidate.route] };
    selectRoute(policy, candidate.route, { messages, responseFormat: undefined }, plan.maxOutputTokens);
    if (Buffer.byteLength(JSON.stringify({ messages }), "utf8") > 131_072 || messages.length > 64) throw new Error("Prepared context exceeds hard service limits");
    if (candidate.route.provider === "local" && native && plan.contextWindowTokens !== undefined && plan.contextWindowTokens !== nativeWindow) throw new Error("Declared context window does not match native Ollama runtime");
    const windowTokens = candidate.route.provider === "local" && native ? nativeWindow as number : plan.contextWindowTokens;
    const context = windowTokens === undefined ? null : contextHeadroom(messages, plan.maxOutputTokens, windowTokens);
    if (context && context.remainingEstimate < 0) throw new Error("Prepared context exceeds window with reserved output headroom");
    tasks.push({ id: `attempt-${tasks.length + 1}`, candidate, case: c, repetition, variant, messages, context,
      profile: { profile: `showcase-${candidate.id}`, provider: candidate.route.provider, model: candidate.route.model, fallbackProfile: null,
        maxOutputTokens: plan.maxOutputTokens, temperature: 0, privacyProfile: "strict", timeoutMs: plan.timeoutMs } });
  }
  const reserved = plan.externalChargesMicrousd + plan.heldAsideMicrousd + tasks.reduce((sum, t) => sum + t.candidate.route.reservationMicrousd, 0);
  if (reserved > plan.budgetMicrousd || tasks.length > 192) throw new Error("Planned attempts exceed the experiment envelope");
  return { tasks, reservedMicrousd: reserved, fingerprint: hash({ plan, benchmark, pack, runtime,
    contextProtocol: "utf8-bytes-plus-message64-template256-v1", completionProtocol: "length-is-incomplete-v1" }) };
}
