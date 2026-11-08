import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "./protocol.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";

const trial = new TrialRecord(TRIAL_DIRECTORY, "ollama-store-verifier-fixtures", "pnpm --filter @afribit/api test:ollama-store");
try {
  trial.event("revision", revisionIdentity());
  const directory = join(REPOSITORY_ROOT, "tools/showcase");
  const helperHash = hash(["verify_ollama_store.py", "test_verify_ollama_store.py"].map(name => [name, readFileSync(join(directory, name), "utf8")]));
  trial.event("fixture-inputs", { helperHash, actualModelBytes: 0, networkRequests: 0 });
  const run = spawnSync(process.platform === "win32" ? "python" : "python3", ["test_verify_ollama_store.py"],
    { cwd: directory, encoding: "utf8", timeout: 30000, windowsHide: true, maxBuffer: 65536,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const match = output.match(/Ran (\d+) tests? in/);
  const passed = run.status === 0 && match && /\bOK\b/.test(output);
  const artifacts = join(REPOSITORY_ROOT, "output/ollama-store", trial.id); mkdirSync(artifacts, { recursive: true });
  writeFileSync(join(artifacts, "fixture-results.txt"), output, { mode: 0o600 });
  writeFileSync(join(artifacts, "summary.json"), JSON.stringify({ trial: trial.id, helperHash, checks: Number(match?.[1] ?? 0), passed: !!passed,
    actualModelBytes: 0, networkRequests: 0, paidComputeUsd: 0, hardwareClaim: false }, null, 2) + "\n", { mode: 0o600 });
  trial.finish(passed ? "completed" : "failed", 0, { artifacts, checks: Number(match?.[1] ?? 0), helperHash, actualModelBytes: 0 });
  console.log(output.trim());
  console.log(JSON.stringify({ trial: trial.id, artifacts, paidComputeUsd: 0 }));
  if (!passed) process.exitCode = 1;
} catch {
  trial.finish("failed", 0, { reason: "ollama-store-fixtures-failed", actualModelBytes: 0 });
  console.error("Store verifier fixtures failed; inspect retained trial."); process.exitCode = 1;
}
