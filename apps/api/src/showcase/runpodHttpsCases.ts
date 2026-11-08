import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { EventEmitter } from "node:events";
import type { AddressInfo } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runpodHttpsRequest } from "./runpodHttps.js";
import { RunPodV2 } from "./rental.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";

const trial = new TrialRecord(TRIAL_DIRECTORY, "runpod-https-compatibility-fixtures", "pnpm --filter @afribit/api test:runpod-https");
trial.event("revision", revisionIdentity());
let mode = "ok", requests = 0, redirects = 0, deletions = 0, checks = 0;
const server = http.createServer((request, response) => {
  requests++;
  if (request.url === "/capture") { redirects++; response.end(); return; }
  if (request.headers.authorization !== "Bearer SYNTHETIC_KEY") { response.writeHead(401).end(); return; }
  if (mode === "timeout") return;
  if (mode === "body-timeout") { response.writeHead(200, { "content-type": "application/json" }); response.write("{"); return; }
  if (mode === "redirect") { response.writeHead(307, { location: `http://127.0.0.1:${(server.address() as AddressInfo).port}/capture` }).end(); return; }
  if (mode === "oversized") { response.writeHead(200).end("x".repeat(1_048_577)); return; }
  if (request.method === "DELETE") { deletions++; response.writeHead(204).end(); return; }
  response.writeHead(mode === "unavailable" ? 503 : 200, { "content-type": "application/json" });
  response.end(JSON.stringify({ id: "synthetic-pod", name: "synthetic", createdAt: "2026-10-27T00:00:00.000Z", status: "RUNNING", cost: 0.34,
    locked: false, actions: ["terminate"], mounts: { persistent: { size: 20 } }, env: { PRIVATE: "SYNTHETIC_PROVIDER_SECRET" } }));
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const read = (path = "/v2/pods/synthetic-pod", timeout = 1000) => runpodHttpsRequest(`${base}${path}`, "GET", "SYNTHETIC_KEY", timeout);
const ok = async (name: string, work: () => Promise<void>) => {
  trial.event("case-started", { name });
  try { await work(); checks++; trial.event("case-passed", { name }); console.log(`  ok ${name}`); }
  catch (error) { trial.event("case-failed", { name }); throw error; }
};
try {
  await ok("authenticated GET and no-body DELETE work through the existing sanitized adapter", async () => {
    const client = new RunPodV2("SYNTHETIC_KEY", 1000, `${base}/v2`, "https-tls12");
    const value = await client.get("synthetic-pod"); assert.ok(value?.disposable); assert.ok(!JSON.stringify(value).includes("SYNTHETIC_PROVIDER_SECRET"));
    await client.terminate("synthetic-pod"); assert.equal(deletions, 1);
  });
  await ok("scope rejects foreign origins, credentials, query/hash, bad paths and unsupported methods", async () => {
    const before = requests;
    for (const url of ["https://example.com/v2/pods/x", "http://api.runpod.io/v2/pods/x", `${base}/capture`, `${base}/v2/pods/x?q=key`, `${base}/v2/pods/x#x`, "https://user:pass@api.runpod.io/v2/pods/x"])
      await assert.rejects(() => runpodHttpsRequest(url, "GET", "SYNTHETIC_KEY", 1000));
    await assert.rejects(() => runpodHttpsRequest(`${base}/v2/pods/x`, "POST" as "GET", "SYNTHETIC_KEY", 1000));
    await assert.rejects(() => runpodHttpsRequest(`${base}/v2/pods/x`, "GET", "KEY\r\nInjected: x", 1000));
    assert.equal(requests, before);
  });
  await ok("redirect status is returned without a second request or forwarded Location", async () => {
    mode = "redirect"; const response = await read(); assert.equal(response.status, 307); assert.equal(response.headers.get("location"), null); assert.equal(redirects, 0);
    mode = "ok";
  });
  await ok("headers and body stalls both obey the whole-request deadline", async () => {
    for (const value of ["timeout", "body-timeout"]) { mode = value; const started = performance.now(); await assert.rejects(() => read(undefined, 100)); assert.ok(performance.now() - started < 1500); }
    mode = "ok";
  });
  await ok("oversized responses reject before being accepted as JSON", async () => {
    mode = "oversized"; await assert.rejects(() => read()); mode = "ok";
  });
  await ok("non-success statuses remain visible and do not trigger retries", async () => {
    mode = "unavailable"; const before = requests; const response = await read(); assert.equal(response.status, 503); assert.equal(requests, before + 1); mode = "ok";
  });
  await ok("TLS 1.2 compatibility keeps certificate verification enabled and rejects certificate errors", async () => {
    const original = https.request; let captured: any;
    Object.assign(https, { request: (_url: unknown, options: unknown) => {
      captured = options;
      const request = new EventEmitter() as any;
      request.destroy = () => request;
      request.end = () => queueMicrotask(() => request.emit("error", Object.assign(new Error("SYNTHETIC_CERT_SECRET"), { code: "CERT_HAS_EXPIRED" })));
      return request;
    } });
    try {
      await assert.rejects(() => runpodHttpsRequest("https://api.runpod.io/v2/pods/x", "GET", "SYNTHETIC_KEY", 500), error => error instanceof Error && !error.message.includes("SECRET"));
      assert.equal(captured.rejectUnauthorized, true); assert.equal(captured.minVersion, "TLSv1.2"); assert.equal(captured.maxVersion, "TLSv1.2");
      assert.equal(captured.agent.options.rejectUnauthorized, true); assert.equal(captured.headers.Authorization, "Bearer SYNTHETIC_KEY");
    } finally { Object.assign(https, { request: original }); }
  });
  const artifacts = join(REPOSITORY_ROOT, "output/runpod-https", trial.id); mkdirSync(artifacts, { recursive: true });
  writeFileSync(join(artifacts, "summary.json"), JSON.stringify({ trial: trial.id, checks, requests, redirects, actualAccountCalls: 0, paidComputeUsd: 0, certificateErrorsMocked: true }, null, 2) + "\n", { mode: 0o600 });
  trial.finish("completed", 0, { artifacts, checks, actualAccountCalls: 0 }); console.log(JSON.stringify({ trial: trial.id, checks, actualAccountCalls: 0 }));
} catch {
  trial.finish("failed", 0, { checks, reason: "compatibility-fixtures-failed" }); console.error("RunPod HTTPS fixtures failed; inspect trial events."); process.exitCode = 1;
} finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
