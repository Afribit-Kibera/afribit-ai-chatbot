import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { PublicModelMetadata, inspectMetadata, validateCatalog } from "./discovery.js";

const trial = new TrialRecord(TRIAL_DIRECTORY, "model-discovery-fixtures", "pnpm --filter @afribit/api test:discovery");
trial.event("revision", revisionIdentity());
const catalog = validateCatalog(JSON.parse(readFileSync(join(REPOSITORY_ROOT, "docs/evaluation/model-candidates.json"), "utf8"))), candidate = catalog.models[0]!;
const metadata = () => ({ id: candidate.repository, sha: "a".repeat(40), pipeline_tag: "text-generation", cardData: { license: "apache-2.0" },
  siblings: [{ rfilename: candidate.filename, size: 512000000, lfs: { sha256: "b".repeat(64), size: 512000000 } }, { rfilename: "README.md" }], secret: "SYNTHETIC-UNEXPECTED-FIELD" });
let checks = 0, passed = false, mode = "ok", calls = 0, authHeaders = 0, weightRequests = 0;
const server = createServer((req, res) => {
  calls++; if (req.headers.authorization || req.headers.cookie) authHeaders++;
  if (!req.url?.startsWith("/api/models/")) { weightRequests++; res.end("unexpected"); return; }
  if (mode === "redirect") { res.writeHead(302, { location: "/resolve/main/file.gguf" }); res.end(); return; }
  if (mode === "hang") return;
  if (mode === "error") { res.writeHead(429); res.end("SYNTHETIC-SECRET-BODY"); return; }
  res.writeHead(200, { "content-type": "application/json" }); res.end(mode === "invalid" ? "not-json" : mode === "large" ? "x".repeat(5000) : JSON.stringify(metadata()));
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const ok = async (name: string, work: () => Promise<void> | void) => {
  trial.event("case-started", { name });
  try { await work(); checks++; trial.event("case-passed", { name }); console.log(`  ok  ${name}`); }
  catch (error) { trial.event("case-failed", { name }); throw error; }
};
try {
  await ok("catalog: task/weight/data license fields validate without enabling a model", () => {
    assert.equal(catalog.models.length, 5);
    for (const bad of [{ ...catalog, apiKey: "no" }, { ...catalog, models: [candidate, candidate] }, { ...catalog, models: [{ ...candidate, repository: "../../private" }] },
      { ...catalog, models: [{ ...candidate, source: "https://arbitrary.invalid" }] }, { ...catalog, models: [{ ...candidate, filename: "../weights.gguf" }] }]) assert.throws(() => validateCatalog(bad));
  });
  await ok("metadata: pinned revision, filename/bytes and advertised digest are not runtime/integrity proof", () => {
    const r = inspectMetadata(candidate, metadata());
    assert.equal(r.revision, "a".repeat(40)); assert.equal(r.files[0]!.bytes, 512000000); assert.equal(r.files[0]!.publisherReportedSha256, "b".repeat(64));
    assert.ok(r.files[0]!.pinnedUrl.includes(`/resolve/${r.revision}/`));
    assert.equal(r.integrityVerified, false); assert.equal(r.inferenceTested, false); assert.equal(r.activated, false);
    assert.equal(r.generalChatReviewCandidate, false); assert.equal(JSON.stringify(r).includes("SYNTHETIC-UNEXPECTED-FIELD"), false);
  });
  await ok("metadata: rejects wrong repository/revision and unsafe weight paths", () => {
    for (const bad of [{ ...metadata(), id: "wrong/repo" }, { ...metadata(), sha: "main" }, { ...metadata(), siblings: null }]) assert.throws(() => inspectMetadata(candidate, bad));
    assert.throws(() => inspectMetadata({ ...candidate, filename: null }, { ...metadata(), siblings: [{ rfilename: "../foreign.gguf" }] }));
  });
  await ok("metadata: unknown license, absent filename/size/hash and base/adapter purpose remain explicit", () => {
    const unknown = inspectMetadata(candidate, { ...metadata(), cardData: {}, siblings: [{ rfilename: candidate.filename }] });
    assert.ok(unknown.issues.includes("license-unknown")); assert.equal(unknown.files[0]!.bytes, null); assert.equal(unknown.files[0]!.publisherReportedSha256, null);
    assert.ok(inspectMetadata(candidate, { ...metadata(), siblings: [] }).issues.includes("no-matching-weight-artifact"));
    for (const kind of ["base-research", "adapter"] as const) assert.equal(inspectMetadata({ ...candidate, purpose: "chat-baseline", artifactKind: kind }, metadata()).generalChatReviewCandidate, false);
    const baseline = inspectMetadata({ ...candidate, purpose: "chat-baseline", artifactKind: "instruction" }, metadata()); assert.equal(baseline.generalChatReviewCandidate, true); assert.equal(baseline.activated, false);
  });
  await ok("public reader: requests metadata only, with no authorization/cookies or weight downloads", async () => {
    const r = await new PublicModelMetadata(base).read(candidate); assert.equal(r.revision, "a".repeat(40)); assert.equal(authHeaders, 0); assert.equal(weightRequests, 0);
    assert.throws(() => new PublicModelMetadata("https://arbitrary.invalid"));
  });
  await ok("public reader: redirects, HTTP errors, invalid JSON, size and timeout fail without following weights", async () => {
    for (const failure of ["redirect", "error", "invalid", "large", "hang"]) {
      mode = failure; await assert.rejects(() => new PublicModelMetadata(base, 50, 2000).read(candidate));
    }
    mode = "ok"; assert.equal(weightRequests, 0); assert.equal(authHeaders, 0);
  });
  passed = true;
  const proof = join(REPOSITORY_ROOT, "output/proof"); mkdirSync(proof, { recursive: true });
  writeFileSync(join(proof, "p4-model-discovery-proof.json"), JSON.stringify({ trialId: trial.id, trialRecord: trial.filename, synthetic: true, localhostOnly: true,
    checks, publicMetadataRequests: 0, weightDownloads: 0, modelCalls: 0, paidComputeUsd: 0 }, null, 2) + "\n");
  console.log(`discovery: ${checks} checks passed; weight downloads/model calls 0; paid compute USD 0`);
} finally {
  try { trial.finish(passed ? "completed" : "failed", 0, { checks, fixtureRequests: calls, weightDownloads: weightRequests, authHeaders }); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
