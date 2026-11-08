import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { authorized, createWorkerServer, validateWorkerConfig, workerContext, qualifiedPlacement } from "./rental_worker.mjs";

const token = "a".repeat(64), model = "gemma4:e4b-it-q4_K_M";
const digest = createHash("sha256").update(token).digest("hex");
const config = () => ({ schema: 1, model, keySha256: digest, leaseId: randomUUID(), manifestDigest: `sha256:${"b".repeat(64)}`,
  admittedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 600000).toISOString() });
async function fixture(t, stage = "ready", extra = {}, options = {}) {
  const requests = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    requests.push({ path: req.url, body: Buffer.concat(chunks).toString(), auth: req.headers.authorization });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ model, message: { content: "Synthetic fixture reply" }, done: true, prompt_eval_count: 1, eval_count: 2 }));
  });
  await new Promise(r => upstream.listen(0, "127.0.0.1", r));
  const state = { stage, ...extra };
  const worker = createWorkerServer(config(), state, { upstream: `http://127.0.0.1:${upstream.address().port}`, ...options });
  await new Promise(r => worker.server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${worker.server.address().port}`;
  t.after(async () => {
    worker.server.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(r => worker.server.close(r)), new Promise(r => upstream.close(r))]);
  });
  return { requests, state, url, request: (path, init = {}) => fetch(url + path, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) } }) };
}
test("lease validation preserves an absolute deadline and rejects extensions, unknown fields and expired starts", () => {
  const valid = config(); assert.deepEqual(validateWorkerConfig(valid), valid);
  for (const invalid of [{ ...valid, model: "another-model" }, { ...valid, keySha256: "bad" }, { ...valid, secret: "not allowed" },
    { ...valid, admittedAt: "yesterday" }, { ...valid, deadlineAt: new Date(Date.parse(valid.admittedAt) + 1800001).toISOString() },
    { ...valid, deadlineAt: valid.admittedAt }]) assert.throws(() => validateWorkerConfig(invalid));
  assert.throws(() => validateWorkerConfig(valid, Date.parse(valid.deadlineAt) + 1));
});
test("authorization rejects wrong, missing, array and malformed credentials", () => {
  assert.equal(authorized(`Bearer ${token}`, digest), true);
  for (const value of [undefined, [token], token, `Bearer ${"b".repeat(64)}`, `Bearer ${token} `]) assert.equal(authorized(value, digest), false);
});
test("explicit context8192 is bounded and readiness requires matching actual context and GPU placement", () => {
  const c = {...config(),contextWindowTokens:8192}; assert.equal(workerContext(validateWorkerConfig(c)),8192);
  assert.equal(workerContext(validateWorkerConfig(config())),4096);
  for(const contextWindowTokens of [null,"8192",8193,32768,NaN]) assert.throws(()=>validateWorkerConfig({...config(),contextWindowTokens}));
  const m={name:model,digest:c.manifestDigest,size:10,sizeVram:10,contextLength:8192};
  assert.equal(qualifiedPlacement([m],c),true);
  for(const patch of [{contextLength:4096},{contextLength:null},{sizeVram:5},{size:NaN},{digest:"bad"}]) assert.equal(qualifiedPlacement([{...m,...patch}],c),false);
});
test("unauthenticated diagnostics, completion, generation and model lists never reach the backend", async t => {
  const f = await fixture(t);
  for (const [path, method] of [["/trial-status", "GET"], ["/trial-complete", "POST"], ["/api/chat", "POST"], ["/v1/models", "GET"]]) {
    const r = await fetch(f.url + path, { method }); assert.equal(r.status, 401); await r.body.cancel();
  }
  assert.equal(f.requests.length, 0);
});
test("diagnostics select explicit public fields and omit secrets, paths, raw samples and unknown nested fields", async t => {
  const secret = "synthetic-do-not-export";
  const f = await fixture(t, "verifying", { env: { key: secret }, versions: { node: "v22.fixture", secret },
    placement: [{ name: model, digest: "b".repeat(64), size: 10, sizeVram: 10, path: secret }],
    telemetry: { status: "started", sampleCount: 1, elapsedSeconds: 1, raw: secret, sampledMaxima: [{ name: "Synthetic GPU", sampledMaxUsedMiB: 10, env: secret }] },
    verification: { status: "completed", weightsBytesVerified: true, manifestDigest: "b".repeat(64), raw: secret } });
  const r = await f.request("/trial-status"); const body = await r.text(); assert.equal(r.status, 200);
  assert.equal(body.includes(secret), false); assert.equal(JSON.parse(body).paidComputeUsd, null); assert.equal(f.requests.length, 0);
});
test("unready and failed workers refuse generation while authenticated diagnostics remain readable", async t => {
  const f = await fixture(t, "pulling");
  for (const stage of ["pulling", "failed", "stopping", "stopped"]) {
    f.state.stage = stage;
    const r = await f.request("/api/chat", { method: "POST", body: JSON.stringify({ model }) });
    assert.equal(r.status, 503); await r.body.cancel();
    assert.equal((await (await f.request("/trial-status")).json()).stage, stage);
  }
  assert.equal(f.requests.length, 0);
});

test("live telemetry exports maxima and baseline before collector finalization without raw identity or samples", async t => {
  const secret = "synthetic-hidden-device-id";
  const device = {index:0,name:"Synthetic GPU",uuid:secret,driverVersion:"fixture.1",memoryTotalMiB:24576,memoryUsedMiB:100,utilizationPercent:90,powerWatts:null};
  const f = await fixture(t,"ready",{telemetry:{status:"started",sampleCount:2,failures:[],samples:[
    {elapsedSeconds:1,devices:[device]},
    {elapsedSeconds:2,devices:[{...device,memoryUsedMiB:200,utilizationPercent:50,powerWatts:120}]}]}});
  const raw = await (await f.request("/trial-status")).text(); const value=JSON.parse(raw).telemetry;
  assert.equal(raw.includes(secret),false); assert.equal(value.samples,undefined);
  assert.equal(value.finalized,false); assert.equal(value.elapsedSeconds,2);
  assert.equal(value.baseline[0].memoryUsedMiB,100); assert.equal(value.baseline[0].memoryTotalMiB,24576);
  assert.deepEqual(value.sampledMaxima[0],{index:0,name:"Synthetic GPU",sampledMaxUsedMiB:200,sampledMaxUtilizationPercent:90,sampledMaxPowerWatts:120});
});
test("ready traffic reaches the existing gate and upstream never receives the community bearer", async t => {
  const f = await fixture(t);
  const r = await f.request("/api/chat", { method: "POST", body: JSON.stringify({ model, messages: [{ role: "user", content: "Synthetic" }] }) });
  assert.equal(r.status, 200); assert.equal((await r.json()).message.content, "Synthetic fixture reply");
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].auth, undefined);
});
test("wrong model and operator mutation routes are rejected without backend calls", async t => {
  const f = await fixture(t);
  for (const [path, body] of [["/api/chat", { model: "wrong" }], ["/api/pull", { model }], ["/api/delete", { model }], ["/trial-status?file=env", {}]]) {
    const r = await f.request(path, { method: "POST", body: JSON.stringify(body) }); assert.equal(r.status, 403); await r.body.cancel();
  }
  assert.equal(f.requests.length, 0);
});
test("oversized request bodies are refused at the gate", async t => {
  const f = await fixture(t);
  const r = await f.request("/api/chat", { method: "POST", body: JSON.stringify({ model, prompt: "x".repeat(65536) }) });
  assert.equal(r.status, 413); await r.body.cancel(); assert.equal(f.requests.length, 0);
});
test("completion requires authentication and an empty body before invoking shutdown", async t => {
  let count = 0; const f = await fixture(t, "ready", {}, { completed: () => { count++; } });
  const invalid = await f.request("/trial-complete", { method: "POST", body: "payload" }); assert.equal(invalid.status, 400); await invalid.body.cancel(); assert.equal(count, 0);
  const valid = await f.request("/trial-complete", { method: "POST" }); assert.equal(valid.status, 202); await valid.body.cancel(); assert.equal(count, 1);
});
test("worker proxy cannot be configured to an external or credentialed backend", () => {
  for (const upstream of ["https://example.com", "http://user:pass@127.0.0.1:9999", "http://127.0.0.1:9999/private", "http://127.0.0.1:9999/?x=1"]) {
    assert.throws(() => createWorkerServer(config(), { stage: "ready" }, { upstream }));
  }
});
test("model startup waits for an authenticated, empty, one-time arm after supervision is ready", async t => {
  let calls = 0; const f = await fixture(t, "awaiting-arm", {}, { armed: () => { calls++; } });
  const missing = await fetch(f.url + "/trial-arm", { method: "POST" }); assert.equal(missing.status, 401); await missing.body.cancel();
  const bad = await f.request("/trial-arm", { method: "POST", body: "not-empty" }); assert.equal(bad.status, 400); await bad.body.cancel();
  assert.equal(calls, 0);
  const valid = await f.request("/trial-arm", { method: "POST" }); assert.equal(valid.status, 202); await valid.body.cancel();
  assert.equal((await (await f.request("/trial-status")).json()).armed,true);
  const twice = await f.request("/trial-arm", { method: "POST" }); assert.equal(twice.status, 409); await twice.body.cancel();
  assert.equal(calls, 1); assert.equal(f.requests.length, 0);
});
