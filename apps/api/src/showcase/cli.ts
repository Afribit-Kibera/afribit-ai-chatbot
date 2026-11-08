import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { DEFAULT_PACK_DIR } from "../pack/active.js";
import { loadPack } from "../pack/load.js";
import { hash, prepare, validateBenchmark, validatePlan } from "./protocol.js";
import { runShowcase, runtimeIdentity } from "./runner.js";
import { sourceFingerprint, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
async function main(trial: TrialRecord) {
  const args = process.argv.slice(2);
  const allowed = ["--plan", "--benchmark", "--pack", "--ledger", "--out", "--execute"];
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!allowed.includes(key) || values.has(key)) throw new Error("Unknown or repeated showcase argument");
    if (key === "--execute") values.set(key, "true");
    else { const value = args[++i]; if (!value || value.startsWith("--")) throw new Error("Missing showcase argument value"); values.set(key, value); }
  }
  const read = (filename: string) => JSON.parse(readFileSync(filename, "utf8"));
  trial.event("inputs", { planPath: resolve(values.get("--plan") ?? `${root}/docs/examples/showcase-plan.json`), benchmarkPath: resolve(values.get("--benchmark") ?? `${root}/docs/evaluation/showcase-synthetic-v1.json`),
    packPath: resolve(values.get("--pack") ?? DEFAULT_PACK_DIR), ledgerPath: values.has("--ledger") ? resolve(values.get("--ledger")!) : null });
  const loaded = loadPack(resolve(values.get("--pack") ?? DEFAULT_PACK_DIR));
  if (!loaded.ok || !loaded.pack) throw new Error("Showcase pack validation failed");
  const pack = loaded.pack;
  const plan = validatePlan(read(resolve(values.get("--plan") ?? `${root}/docs/examples/showcase-plan.json`)));
  const benchmark = validateBenchmark(read(resolve(values.get("--benchmark") ?? `${root}/docs/evaluation/showcase-synthetic-v1.json`)), pack);
  const sourceHash = sourceFingerprint();
  const prepared = prepare(plan, benchmark, pack, runtimeIdentity(sourceHash));
  trial.event("validated", { fingerprint: prepared.fingerprint, sourceHash, planHash: hash(plan), benchmarkHash: hash(benchmark), packHash: hash(pack), plannedAttempts: prepared.tasks.length });
  if (!values.has("--execute")) {
    console.log(JSON.stringify({ dryRun: true, modelCalls: 0, paidComputeUsd: 0, fingerprint: prepared.fingerprint,
      attempts: prepared.tasks.length, plannedEnvelopeMicrousd: prepared.reservedMicrousd, candidateIds: plan.candidates.map(c => c.id),
      promptMode: plan.promptMode ?? "full", contextAdmission: prepared.tasks.map(t => ({taskId: t.id, context: t.context})),
      note: "No model or DB connection. Before execution: confirm upstream account limits, rental shutdown and synthetic-input provenance." }, null, 2));
    trial.finish("completed", 0, { dryRun: true, modelCalls: 0, estimatedMicrousd: prepared.reservedMicrousd });
    return;
  }
  if (!values.has("--ledger")) throw new Error("Execution requires an explicit persistent experiment --ledger path; reuse it for every invocation");
  const ledger = resolve(values.get("--ledger")!);
  mkdirSync(dirname(ledger), { recursive: true });
  const controller = new AbortController(), stop = () => controller.abort();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    const revision = revisionIdentity();
    executionStarted = true;
    const summary = await runShowcase(plan, benchmark, pack, { ledger, artifacts: resolve(values.get("--out") ?? `${root}/output/showcase`) }, revision, controller.signal, trial);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed || summary.skipped || summary.cancelled || summary.stopped) process.exitCode = 1;
    trial.finish(summary.cancelled ? "cancelled" : process.exitCode ? "failed" : "completed", null, { ...summary });
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
let trial: TrialRecord | undefined;
let executionStarted = false;
try {
  trial = new TrialRecord(TRIAL_DIRECTORY, "showcase-evaluation", "pnpm --filter @afribit/api showcase:eval [validated input paths; secrets omitted]");
  trial.event("revision", revisionIdentity());
  trial.event("invoked", { executeRequested: process.argv.includes("--execute") });
  await main(trial);
} catch (error) {
  const message = error instanceof Error && ["Prepared context exceeds window with reserved output headroom", "Declared context window does not match native Ollama runtime", "Invalid native Ollama context window"].includes(error.message) ? error.message : null;
  try { trial?.finish("failed", executionStarted ? null : 0, { reason: "validation-or-execution-failed", contextRefusal: message }); } catch { /* Preserve the unfinished record on storage failure. */ }
  console.error(message ? `Showcase refused: ${message}. Use a reviewed prompt/window configuration.` : "Showcase failed; inspect its trial record and local inputs. Provider error bodies are not printed."); process.exitCode = 1;
}
