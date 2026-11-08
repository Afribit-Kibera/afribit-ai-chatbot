import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "./protocol.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
const trial = new TrialRecord(TRIAL_DIRECTORY, "rental-worker-authentication-fixtures", "pnpm --filter @afribit/api test:rental-worker");
try {
  trial.event("revision", revisionIdentity());
  const files = ["tools/showcase/rental_worker.mjs", "tools/showcase/rental_worker.test.mjs", "deploy/gpu-server/gate/gate.mjs"];
  const helperHash = hash(files.map(name => [name, readFileSync(join(REPOSITORY_ROOT, name), "utf8")]));
  const run = spawnSync(process.execPath, ["--test", "tools/showcase/rental_worker.test.mjs"], { cwd: REPOSITORY_ROOT,
    encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 65536 });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`, checks = Number(output.match(/(?:#|ℹ) tests (\d+)/)?.[1] ?? 0);
  const passed = run.status === 0 && checks === 13;
  const artifacts = join(REPOSITORY_ROOT, "output/rental-worker", trial.id); mkdirSync(artifacts, { recursive: true });
  writeFileSync(join(artifacts, "fixtures.txt"), output, { mode: 0o600 });
  writeFileSync(join(artifacts, "summary.json"), JSON.stringify({ trial: trial.id, helperHash, checks, passed, accountCalls: 0,
    actualGpuCalls: 0, modelDownloads: 0, paidComputeUsd: 0 }, null, 2) + "\n", { mode: 0o600 });
  trial.finish(passed ? "completed" : "failed", 0, { artifacts, helperHash, checks, accountCalls: 0, actualGpuCalls: 0 });
  console.log(output.trim()); console.log(JSON.stringify({ trial: trial.id, artifacts, checks, passed }));
  if (!passed) process.exitCode = 1;
} catch { trial.finish("failed", 0, { reason: "worker-fixtures-failed", accountCalls: 0 }); process.exitCode = 1; }
