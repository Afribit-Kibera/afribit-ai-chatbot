import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import "../config/env.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { hash, validatePlan } from "./protocol.js";
import { RunPodV2, shutdownAt, validateLease, watchRental } from "./rental.js";

let trial: TrialRecord | undefined;
let attemptedAccountCall = false;
try {
  trial = new TrialRecord(TRIAL_DIRECTORY, "rental-watchdog", "pnpm --filter @afribit/api showcase:rental [recorded input paths; secrets omitted]");
  trial.event("revision", revisionIdentity());
  const values = new Map<string, string>(), args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!["--lease", "--plan", "--state", "--completed-file", "--transport", "--execute"].includes(key) || values.has(key)) throw new Error("Invalid rental arguments");
    if (key === "--execute") values.set(key, "true");
    else { const value = args[++i]; if (!value || value.startsWith("--")) throw new Error("Missing rental argument"); values.set(key, value); }
  }
  const transport = values.get("--transport") ?? "fetch";
  if (transport !== "fetch" && transport !== "https-tls12") throw new Error("Invalid rental transport");
  const leasePath = resolve(values.get("--lease") ?? `${REPOSITORY_ROOT}/docs/examples/showcase-rental-lease.json`);
  const planPath = resolve(values.get("--plan") ?? `${REPOSITORY_ROOT}/docs/examples/showcase-plan.json`);
  trial.event("inputs", { leasePath, planPath, executeRequested: values.has("--execute"), transport });
  const lease = validateLease(JSON.parse(readFileSync(leasePath, "utf8"))), plan = validatePlan(JSON.parse(readFileSync(planPath, "utf8")));
  const fundingCovered = plan.externalChargesMicrousd >= lease.maxRentalMicrousd;
  trial.event("validated", { leaseHash: hash(lease), planHash: hash(plan), fundingCovered, shutdownAt: new Date(shutdownAt(lease)).toISOString() });
  if (!values.has("--execute")) {
    const preview = { dryRun: true, accountCalls: 0, paidComputeUsd: 0, transport, fundingCovered, shutdownAt: new Date(shutdownAt(lease)).toISOString(),
      exampleExpired: Date.now() >= shutdownAt(lease), note: "Example rates and Pod ID are placeholders. No resource is read, created or terminated." };
    console.log(JSON.stringify(preview, null, 2)); trial.finish("completed", 0, preview);
  } else {
    if (!fundingCovered || !plan.upstreamLimitReference.trim() || !values.has("--state") || !values.has("--completed-file") || lease.podId.startsWith("REPLACE")) throw new Error("Unreviewed rental scope or allowance");
    const stateFile = resolve(values.get("--state")!), completedFile = resolve(values.get("--completed-file")!);
    if (stateFile === completedFile || `${stateFile}.lock` === completedFile) throw new Error("Completion marker cannot be watchdog state");
    const client = new RunPodV2(process.env.RUNPOD_API_KEY ?? "", lease.requestTimeoutMs, undefined, transport);
    mkdirSync(dirname(stateFile), { recursive: true });
    const controller = new AbortController(), stop = () => controller.abort();
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
    try {
      attemptedAccountCall = true;
      const result = await watchRental(lease, client, stateFile, trial, { signal: controller.signal, completed: () => existsSync(completedFile) });
      trial.finish(result.needsAttention ? "needs-attention" : "completed", null, result);
      console.log(JSON.stringify({ ...result, trial: trial.filename }, null, 2));
      if (result.needsAttention || !result.podAbsenceConfirmed) process.exitCode = 1;
    } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
  }
} catch {
  try { trial?.finish("failed", attemptedAccountCall ? null : 0, { reason: "validation-or-watchdog-failed", billReconciled: false }); } catch { /* Preserve an unfinished record. */ }
  console.error("Rental watchdog failed; inspect its trial and lease state. No provider response body is printed."); process.exitCode = 1;
}
