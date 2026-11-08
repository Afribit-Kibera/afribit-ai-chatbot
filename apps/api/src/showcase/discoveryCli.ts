import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { hash } from "./protocol.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { PublicModelMetadata, validateCatalog } from "./discovery.js";

let trial: TrialRecord | undefined;
try {
  trial = new TrialRecord(TRIAL_DIRECTORY, "public-model-discovery", "pnpm --filter @afribit/api showcase:discover [recorded catalog path] [--fetch-metadata]");
  trial.event("revision", revisionIdentity());
  const values = new Map<string, string>(), args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!["--catalog", "--fetch-metadata"].includes(key) || values.has(key)) throw new Error("Invalid discovery arguments");
    if (key === "--fetch-metadata") values.set(key, "true");
    else { const value = args[++i]; if (!value || value.startsWith("--")) throw new Error("Missing catalog path"); values.set(key, value); }
  }
  const catalogPath = resolve(values.get("--catalog") ?? `${REPOSITORY_ROOT}/docs/evaluation/model-candidates.json`);
  const catalog = validateCatalog(JSON.parse(readFileSync(catalogPath, "utf8")));
  trial.event("catalog-validated", { catalogPath, catalogHash: hash(catalog), candidates: catalog.models.length });
  if (!values.has("--fetch-metadata")) {
    const result = { dryRun: true, candidates: catalog.models.length, metadataRequests: 0, modelCalls: 0, weightDownloads: 0, paidComputeUsd: 0 };
    console.log(JSON.stringify({ ...result, trial: trial.filename }, null, 2)); trial.finish("completed", 0, result);
  } else {
    const client = new PublicModelMetadata(), results: unknown[] = []; let failed = 0;
    const dir = join(REPOSITORY_ROOT, "output/discovery", trial.id); mkdirSync(dir, { recursive: true });
    for (const candidate of catalog.models) {
      trial.event("metadata-started", { candidateId: candidate.id, repository: candidate.repository });
      try {
        const record = await client.read(candidate); results.push(record);
        writeFileSync(join(dir, `${candidate.id}.json`), JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });
        trial.event("metadata-recorded", { candidateId: candidate.id, revision: record.revision, metadataHash: record.metadataHash, files: record.files.length, activated: false });
      } catch {
        failed++; results.push({ candidateId: candidate.id, status: "metadata-failed", activated: false });
        trial.event("metadata-failed", { candidateId: candidate.id });
      }
    }
    writeFileSync(join(dir, "summary.json"), JSON.stringify({ trialId: trial.id, catalogHash: hash(catalog), results, modelCalls: 0, weightDownloads: 0, paidComputeUsd: 0 }, null, 2) + "\n", { mode: 0o600 });
    trial.finish(failed ? "failed" : "completed", 0, { artifacts: dir, candidates: catalog.models.length, failed, modelCalls: 0, weightDownloads: 0 });
    console.log(JSON.stringify({ artifacts: dir, candidates: catalog.models.length, failed, modelCalls: 0, weightDownloads: 0, paidComputeUsd: 0 }, null, 2));
    if (failed) process.exitCode = 1;
  }
} catch {
  try { trial?.finish("failed", 0, { reason: "catalog-or-metadata-failed", modelCalls: 0, weightDownloads: 0 }); } catch { /* Keep the unfinished record. */ }
  console.error("Model discovery failed; inspect its documented trial. No model or provider credentials are used."); process.exitCode = 1;
}
