// node --test deploy/gpu-server/gate/   (part of `pnpm test`)
// The gate's contract (docs/features/F-006-afribit-gpu-server.md) against a fake Ollama. No GPU, no network.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createGate, parseKeys, countTokens, sha256 } from "./gate.mjs";

const CANARY = "CANARY-7f3a91-do-not-log";
const seen = []; // what the fake Ollama received
let psModels = [];
let hold = null; // when set, chat answers wait for this promise (concurrency test)

const fake = http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  seen.push({ method: req.method, url: req.url, headers: req.headers, body });
  if (req.url === "/api/ps") return res.end(JSON.stringify({ models: psModels }));
  if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [{ name: "gemma4:26b" }] }));
  if (hold) await hold;
  const parsed = body ? JSON.parse(body) : {};
  const said = parsed.messages?.at(-1)?.content ?? "";
  if (req.url === "/v1/chat/completions") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ choices: [{ message: { content: `echo ${said}` } }], usage: { prompt_tokens: 11, completion_tokens: 5 } }));
  }
  if (req.url === "/api/chat" && parsed.stream === false) {
    return res.end(JSON.stringify({ message: { content: `echo ${said}` }, done: true, prompt_eval_count: 40, eval_count: 6 }));
  }
  res.setHeader("content-type", "application/x-ndjson");
  res.write(`${JSON.stringify({ message: { content: "echo " } })}\n`);
  res.write(`${JSON.stringify({ message: { content: said } })}\n`);
  res.end(`${JSON.stringify({ done: true, prompt_eval_count: 42, eval_count: 7 })}\n`);
});

const keys = parseKeys({
  communities: [
    { id: "kibera", keySha256: sha256("kibera-key") },
    { id: "bound", keySha256: sha256("bound-key"), peer: "10.77.0.9" },
    { id: "tight", keySha256: sha256("tight-key"), perMinute: 2, concurrent: 1 },
    { id: "single", keySha256: sha256("single-key"), concurrent: 1 },
    { id: "old", keySha256: sha256("old-key"), disabled: true },
  ],
  operatorKeySha256: sha256("operator-key"),
});
const logs = [];
const usageDir = fs.mkdtempSync(path.join(os.tmpdir(), "gate-usage-"));
let clock = Date.UTC(2026, 9, 8, 12, 0, 10);
let gate;
let base;

before(async () => {
  await new Promise((r) => fake.listen(0, "127.0.0.1", r));
  gate = createGate({
    upstream: `http://127.0.0.1:${fake.address().port}`,
    keys,
    allowedModels: ["gemma4:26b"],
    usageDir,
    maxBody: 64 * 1024,
    log: (line) => logs.push(line),
    now: () => clock,
  });
  await new Promise((r) => gate.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${gate.server.address().port}`;
});
after(() => {
  gate.server.close();
  fake.close();
  fs.rmSync(usageDir, { recursive: true, force: true });
});

const call = (method, p, { key, body, raw } = {}) =>
  fetch(base + p, {
    method,
    headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body || raw ? { "content-type": "application/json", "x-forwarded-for": "1.2.3.4", cookie: "s=1" } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
const chat = (o = {}) => ({ model: "gemma4:26b", messages: [{ role: "user", content: `Bitcoin ni nini? ${CANARY}` }], ...o });

test("keys.json is checked: ids, duplicates, hashes, peers; disabled keys are dropped; limits default", () => {
  assert.throws(() => parseKeys({ communities: [{ id: "Bad Id", keySha256: sha256("x") }] }), /bad community id/);
  assert.throws(() => parseKeys({ communities: [{ id: "a", keySha256: sha256("x") }, { id: "a", keySha256: sha256("y") }] }), /twice/);
  assert.throws(() => parseKeys({ communities: [{ id: "a", keySha256: "plain-key" }] }), /64 hex/);
  assert.throws(() => parseKeys({ communities: [{ id: "a", keySha256: sha256("x"), peer: "8.8.8.8" }] }), /peer/);
  assert.equal(keys.byHash.has(sha256("old-key")), false);
  assert.deepEqual(keys.byHash.get(sha256("kibera-key")), { id: "kibera", peer: null, perMinute: 30, concurrent: 4 });
});

test("token counts come from Ollama's own final numbers, or OpenAI-style usage", () => {
  assert.deepEqual(countTokens('{"message":{}}\n{"done":true,"prompt_eval_count":42,"eval_count":7}\n'), { tokensIn: 42, tokensOut: 7 });
  assert.deepEqual(countTokens('{"usage":{"prompt_tokens":11,"completion_tokens":5}}'), { tokensIn: 11, tokensOut: 5 });
  assert.deepEqual(countTokens("no counts here"), { tokensIn: null, tokensOut: null });
});

test("401: no key, a wrong key, a revoked key, or a key used from another community's address", async () => {
  for (const key of [undefined, "wrong-key", "old-key", "bound-key"]) {
    const r = await call("POST", "/api/chat", { key, body: chat() });
    assert.equal(r.status, 401, String(key));
  }
});

test("403: only chat and model-list requests pass; embeddings, pulls, deletes and others never reach Ollama", async () => {
  const before = seen.length;
  for (const [m, p] of [["POST", "/api/pull"], ["POST", "/api/embed"], ["POST", "/api/embeddings"], ["POST", "/api/generate"], ["DELETE", "/api/delete"], ["POST", "/api/create"], ["POST", "/api/copy"], ["GET", "/api/ps"], ["GET", "/"]]) {
    const r = await call(m, p, { key: "kibera-key", body: m === "GET" ? undefined : { model: "gemma4:26b" } });
    assert.equal(r.status, 403, `${m} ${p}`);
  }
  assert.equal(seen.length, before);
});

test("403: a model the server does not serve", async () => {
  const r = await call("POST", "/api/chat", { key: "kibera-key", body: chat({ model: "llama3:70b" }) });
  assert.equal(r.status, 403);
});

test("a streamed chat goes through; Ollama gets the body and nothing else from the box", async () => {
  const r = await call("POST", "/api/chat", { key: "kibera-key", body: chat() });
  assert.equal(r.status, 200);
  const text = await r.text();
  assert.match(text, new RegExp(CANARY));
  assert.match(text, /"done":true/);
  const got = seen.at(-1);
  assert.equal(got.url, "/api/chat");
  assert.deepEqual(JSON.parse(got.body), chat());
  for (const h of ["authorization", "x-forwarded-for", "cookie"]) assert.equal(got.headers[h], undefined, h);
  const line = logs.at(-1);
  assert.deepEqual([line.community, line.path, line.model, line.status, line.tokensIn, line.tokensOut], ["kibera", "/api/chat", "gemma4:26b", 200, 42, 7]);
});

test("non-streamed and OpenAI-style answers are counted too; model lists pass", async () => {
  let r = await call("POST", "/api/chat", { key: "kibera-key", body: chat({ stream: false }) });
  assert.equal((await r.json()).eval_count, 6);
  assert.deepEqual([logs.at(-1).tokensIn, logs.at(-1).tokensOut], [40, 6]);
  r = await call("POST", "/v1/chat/completions", { key: "kibera-key", body: chat() });
  assert.equal(r.status, 200);
  await r.text();
  assert.deepEqual([logs.at(-1).tokensIn, logs.at(-1).tokensOut], [11, 5]);
  r = await call("GET", "/api/tags", { key: "kibera-key" });
  assert.equal((await r.json()).models[0].name, "gemma4:26b");
});

test("429 over the community's requests per minute, with Retry-After; the next minute is fine", async () => {
  for (let i = 0; i < 2; i++) assert.equal((await call("POST", "/api/chat", { key: "tight-key", body: chat() })).status, 200);
  const r = await call("POST", "/api/chat", { key: "tight-key", body: chat() });
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get("retry-after")) >= 1);
  assert.equal((await call("POST", "/api/chat", { key: "kibera-key", body: chat() })).status, 200); // other communities unaffected
  clock += 60_000;
  assert.equal((await call("POST", "/api/chat", { key: "tight-key", body: chat() })).status, 200);
});

test("429 over the community's concurrent requests; the slot frees when the answer ends", async () => {
  let release;
  hold = new Promise((r) => (release = r));
  const first = call("POST", "/api/chat", { key: "single-key", body: chat() });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal((await call("POST", "/api/chat", { key: "single-key", body: chat() })).status, 429);
  hold = null;
  release();
  assert.equal((await first).status, 200);
  await (await first).text().catch(() => {});
  assert.equal((await call("POST", "/api/chat", { key: "single-key", body: chat() })).status, 200);
});

test("413 for an oversized body; 400 for a body that is not JSON", async () => {
  assert.equal((await call("POST", "/api/chat", { key: "kibera-key", raw: "x".repeat(70 * 1024) })).status, 413);
  assert.equal((await call("POST", "/api/chat", { key: "kibera-key", raw: "not json" })).status, 400);
});

test("/healthz: 200 only when every loaded model is fully on the GPU (a CPU fallback is a failure)", async () => {
  psModels = [{ name: "gemma4:26b", size: 19_400_000_000, size_vram: 19_400_000_000 }];
  let r = await call("GET", "/healthz");
  assert.equal(r.status, 200);
  psModels = [{ name: "gemma4:26b", size: 19_400_000_000, size_vram: 0 }]; // what one RunPod host did on 8 Oct 2026
  r = await call("GET", "/healthz");
  assert.equal(r.status, 503);
  assert.match((await r.json()).reason, /not fully on the GPU/);
  psModels = [];
});

test("502 when Ollama is unreachable; /healthz says so too", async () => {
  const down = createGate({ upstream: "http://127.0.0.1:1", keys, log: () => {}, usageDir: null });
  await new Promise((r) => down.server.listen(0, "127.0.0.1", r));
  const b = `http://127.0.0.1:${down.server.address().port}`;
  const r = await fetch(`${b}/api/chat`, { method: "POST", headers: { authorization: "Bearer kibera-key" }, body: JSON.stringify(chat()) });
  assert.equal(r.status, 502);
  assert.equal((await fetch(`${b}/healthz`)).status, 503);
  down.server.close();
});

test("/usage: operator key only; counts per community per day; written to disk as counts only", async () => {
  assert.equal((await call("GET", "/usage")).status, 401);
  assert.equal((await call("GET", "/usage", { key: "kibera-key" })).status, 401);
  const r = await call("GET", "/usage", { key: "operator-key" });
  assert.equal(r.status, 200);
  const u = await r.json();
  const day = Object.values(u.days).flatMap((d) => Object.entries(d));
  const kibera = day.filter(([id]) => id === "kibera").map(([, c]) => c)[0];
  assert.ok(kibera.requests >= 5 && kibera.tokensIn >= 42 + 40 + 11 && kibera.refused >= 10, JSON.stringify(kibera));
  const file = fs.readFileSync(path.join(usageDir, `${u.month}.json`), "utf8");
  assert.ok(!file.includes(CANARY) && !file.includes("Bitcoin"));
});

test("no log line holds a question, an answer, a key or an address", () => {
  const all = JSON.stringify(logs);
  assert.ok(logs.length > 20);
  for (const secret of [CANARY, "Bitcoin", "kibera-key", "operator-key", "127.0.0.1", "1.2.3.4"]) assert.ok(!all.includes(secret), secret);
  assert.deepEqual(Object.keys(logs[0]).sort(), ["community", "method", "model", "ms", "path", "status", "t", "tokensIn", "tokensOut"]);
});
