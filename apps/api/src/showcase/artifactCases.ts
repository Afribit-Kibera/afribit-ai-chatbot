import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { revisionIdentity, REPOSITORY_ROOT } from "./revision.js";
import { downloadVerified, extractZipSafely, fileSha256 } from "./artifacts.js";

const trial = new TrialRecord(TRIAL_DIRECTORY, "verified-artifact-fixtures", "pnpm --filter @afribit/api test:artifacts");
trial.event("revision", revisionIdentity());
const dir = mkdtempSync(join(tmpdir(), "afribit-verified-artifacts-")), body = Buffer.from("synthetic model bytes");
const sha256 = createHash("sha256").update(body).digest("hex");
let checks = 0, passed = false, mode = "ok", calls = 0, sequence = 0;
const server = createServer((_req, res) => {
  calls++;
  if (mode === "redirect") { res.writeHead(302, { location: "/artifact" }); res.end(); return; }
  if (mode === "foreign") { res.writeHead(302, { location: "http://unapproved.invalid/payload" }); res.end(); return; }
  res.writeHead(200); res.end(mode === "short" ? "short" : mode === "oversize" ? Buffer.concat([body, body]) : body);
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/artifact`;
const artifact = { url, bytes: body.length, sha256 }, file = () => join(dir, `file-${++sequence}.bin`);
const ok = async (name: string, work: () => Promise<void> | void) => {
  trial.event("case-started", { name });
  try { await work(); checks++; trial.event("case-passed", { name }); console.log(`  ok  ${name}`); }
  catch (error) { trial.event("case-failed", { name }); throw error; }
};
try {
  await ok("artifact: writes and re-reads exact bytes/SHA-256 before promotion", async () => {
    const target = file(), r = await downloadVerified(artifact, target, () => {}, true);
    assert.equal(r.cached, false); assert.equal(await fileSha256(target), sha256); assert.deepEqual(readFileSync(target), body);
  });
  await ok("artifact: cached files are rehashed; corrupt files never get silently overwritten", async () => {
    const target = file(); writeFileSync(target, body); const before = calls;
    assert.equal((await downloadVerified(artifact, target, () => {}, true)).cached, true); assert.equal(calls, before);
    writeFileSync(target, Buffer.alloc(body.length, 0)); await assert.rejects(() => downloadVerified(artifact, target, () => {}, true)); assert.equal(readFileSync(target)[0], 0);
  });
  await ok("artifact: short/oversized/corrupted payloads retain failure evidence but never promote", async () => {
    for (const failure of ["short", "oversize", "digest"]) {
      mode = failure; const target = file(); await assert.rejects(() => downloadVerified(failure === "digest" ? { ...artifact, sha256: "a".repeat(64) } : artifact, target, () => {}, true)); assert.equal(existsSync(target), false);
    } mode = "ok";
  });
  await ok("artifact: redirect origin/count and public transport bounds are checked", async () => {
    for (const failure of ["redirect", "foreign"]) { mode = failure; await assert.rejects(() => downloadVerified(artifact, file(), () => {}, true)); }
    mode = "ok";
    await assert.rejects(() => downloadVerified(artifact, file()));
    await assert.rejects(() => downloadVerified({ ...artifact, url: "https://user:password@huggingface.co/file" }, file()));
    await assert.rejects(() => downloadVerified({ ...artifact, bytes: 1_000_000_001 }, file(), () => {}, true));
  });
  if (process.platform === "win32") await ok("archive: actual extraction accepts local files and refuses parent paths/alternate streams", () => {
    for (const name of ["safe.txt", "../escape.txt", "payload:stream", "link"]) {
      const zip = join(dir, `archive-${++sequence}.zip`), destination = join(dir, `extract-${sequence}`); mkdirSync(destination);
      const create = `Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($env:AFRIBIT_TEST_ZIP, [IO.Compression.ZipArchiveMode]::Create)
try { $entry = $zip.CreateEntry($env:AFRIBIT_TEST_ENTRY); if ($env:AFRIBIT_TEST_ENTRY -eq 'link') { $entry.ExternalAttributes = -1610612736 }; $writer = New-Object IO.StreamWriter($entry.Open()); $writer.Write('synthetic'); $writer.Dispose() } finally { $zip.Dispose() }`;
      execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", create], { windowsHide: true,
        env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, AFRIBIT_TEST_ZIP: zip, AFRIBIT_TEST_ENTRY: name } });
      if (name === "safe.txt") { extractZipSafely(zip, destination); assert.equal(readFileSync(join(destination, name), "utf8"), "synthetic"); }
      else assert.throws(() => extractZipSafely(zip, destination));
      assert.equal(existsSync(join(dir, "escape.txt")), false);
    }
  });
  passed = true;
  const proof = join(REPOSITORY_ROOT, "output/proof"); mkdirSync(proof, { recursive: true });
  writeFileSync(join(proof, "p4-artifact-verification-proof.json"), JSON.stringify({ trialId: trial.id, trialRecord: trial.filename, synthetic: true, checks,
    localhostOnly: true, modelCalls: 0, paidComputeUsd: 0, windowsArchiveCheck: process.platform === "win32" }, null, 2) + "\n");
  console.log(`artifacts: ${checks} checks passed; synthetic fixture only; paid compute USD 0`);
} finally { try { trial.finish(passed ? "completed" : "failed", 0, { checks, fixtureRequests: calls, modelCalls: 0 }); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } }
