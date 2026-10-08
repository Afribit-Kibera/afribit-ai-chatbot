#!/usr/bin/env node
/**
 * The Afribit GPU gate (docs/features/F-006-afribit-gpu-server.md, "The gate's contract").
 *
 * It sits in front of Ollama on Afribit's GPU server, on the WireGuard interface. For every request it:
 *   1. finds the community by its key (only SHA-256 hashes are configured) and, when one is set, checks the
 *      request comes from that community's WireGuard address;
 *   2. lets through only chat and model-list requests, and only allowed models;
 *   3. applies the community's requests-per-minute and concurrent-request limits;
 *   4. streams the request body to Ollama and the answer back. Nothing else from the box is passed on;
 *   5. logs one line: time, community, method, path, model, status, milliseconds, tokens. Never a body, a key
 *      or an address.
 * The only thing it writes to disk is usage counts per community per day (GATE_USAGE_DIR/<YYYY-MM>.json).
 *
 * Node's standard library only, so it can be read in one sitting and run on a bare `node` image.
 * Configuration: see the bottom of this file. Tests: gate.test.mjs (`node --test deploy/gpu-server/gate/`).
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

/** What a box may ask for. Everything else (pull, delete, copy, create, push, embed, generate, …) is refused. */
export const ROUTES = new Set(["POST /api/chat", "POST /v1/chat/completions", "GET /api/tags", "GET /v1/models"]);
export const MAX_BODY = 512 * 1024;
/** How much of each answer is held (in memory only) to read the token counts at its end. */
const TAIL_BYTES = 8192;

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const HEX64 = /^[0-9a-f]{64}$/;
const plainAddress = (address) => (address ?? "").replace(/^::ffff:/, "");

/**
 * keys.json → the communities by key hash, and the operator's key hash (for /usage).
 * { "communities": [{ "id", "keySha256", "peer"?, "perMinute"?, "concurrent"?, "disabled"?, "note"? }],
 *   "operatorKeySha256"? }
 */
export function parseKeys(input) {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  const byHash = new Map();
  const ids = new Set();
  for (const c of raw?.communities ?? []) {
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(c?.id ?? "")) throw new Error(`keys.json: bad community id ${JSON.stringify(c?.id)}`);
    if (ids.has(c.id)) throw new Error(`keys.json: community "${c.id}" is listed twice`);
    if (!HEX64.test(c.keySha256 ?? "")) throw new Error(`keys.json: community "${c.id}" needs keySha256 (64 hex characters)`);
    if (c.peer != null && !/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(c.peer)) throw new Error(`keys.json: community "${c.id}" has a bad peer address`);
    ids.add(c.id);
    if (c.disabled) continue;
    byHash.set(c.keySha256, {
      id: c.id,
      peer: c.peer ?? null,
      perMinute: Number.isInteger(c.perMinute) && c.perMinute > 0 ? c.perMinute : 30,
      concurrent: Number.isInteger(c.concurrent) && c.concurrent > 0 ? c.concurrent : 4,
    });
  }
  const operatorHash = raw?.operatorKeySha256 ?? null;
  if (operatorHash !== null && !HEX64.test(operatorHash)) throw new Error("keys.json: operatorKeySha256 must be 64 hex characters");
  return { byHash, operatorHash, communities: ids.size };
}

/** Ollama's own counts (`prompt_eval_count`, `eval_count`) or OpenAI-style `usage`, from the end of an answer. */
export function countTokens(tail) {
  const last = (pattern) => {
    let value = null;
    for (const m of tail.matchAll(new RegExp(pattern, "g"))) value = Number(m[1]);
    return value;
  };
  return {
    tokensIn: last(String.raw`"prompt_eval_count"\s*:\s*(\d+)`) ?? last(String.raw`"prompt_tokens"\s*:\s*(\d+)`),
    tokensOut: last(String.raw`"eval_count"\s*:\s*(\d+)`) ?? last(String.raw`"completion_tokens"\s*:\s*(\d+)`),
  };
}

/** Requests and tokens per community per day, for the month in hand; written once a minute (counts only). */
function usageCounts(dir, now) {
  let month = null;
  let days = {};
  let dirty = false;
  const file = (m) => path.join(dir, `${m}.json`);
  function load(m) {
    month = m;
    days = {};
    if (!dir) return;
    try {
      days = JSON.parse(fs.readFileSync(file(m), "utf8")).days ?? {};
    } catch {
      days = {};
    }
  }
  function flush() {
    if (!dir || !dirty || !month) return;
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file(month)}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ month, days }, null, 1), { mode: 0o600 });
    fs.renameSync(tmp, file(month));
    dirty = false;
  }
  function add(community, counts) {
    const iso = new Date(now()).toISOString();
    if (iso.slice(0, 7) !== month) {
      flush();
      load(iso.slice(0, 7));
    }
    const day = (days[iso.slice(0, 10)] ??= {});
    const c = (day[community] ??= { requests: 0, refused: 0, tokensIn: 0, tokensOut: 0 });
    for (const [k, v] of Object.entries(counts)) if (typeof v === "number") c[k] += v;
    dirty = true;
  }
  return { add, flush, snapshot: () => ({ month, days }) };
}

/** Fixed one-minute windows and an in-flight count, per community. */
function limiter(now) {
  const windows = new Map();
  const inflight = new Map();
  return function admit(c) {
    const minute = Math.floor(now() / 60000);
    let w = windows.get(c.id);
    if (!w || w.minute !== minute) windows.set(c.id, (w = { minute, count: 0 }));
    if (w.count >= c.perMinute) return { ok: false, retryAfter: Math.max(1, 60 - Math.floor((now() % 60000) / 1000)) };
    if ((inflight.get(c.id) ?? 0) >= c.concurrent) return { ok: false, retryAfter: 2 };
    w.count += 1;
    inflight.set(c.id, (inflight.get(c.id) ?? 0) + 1);
    let released = false;
    return {
      ok: true,
      release() {
        if (released) return;
        released = true;
        inflight.set(c.id, inflight.get(c.id) - 1);
      },
    };
  };
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.removeAllListeners("data");
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function getJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const r = lib.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on("timeout", () => r.destroy(new Error("timeout")));
    r.on("error", reject);
  });
}

const defaultLog = (line) => process.stdout.write(`${JSON.stringify(line)}\n`);

/**
 * @param {object} o
 * @param {string} o.upstream          Ollama's address, e.g. http://127.0.0.1:11435
 * @param {ReturnType<typeof parseKeys>} o.keys
 * @param {string[]} [o.allowedModels] empty: any model already on the server (a box cannot pull new ones)
 * @param {string|null} [o.usageDir]
 * @param {number} [o.maxBody]
 * @param {(line: object) => void} [o.log]
 * @param {() => number} [o.now]
 * @param {number} [o.upstreamTimeoutMs]
 */
export function createGate(o) {
  const upstream = new URL(o.upstream);
  const lib = upstream.protocol === "https:" ? https : http;
  const allowed = new Set(o.allowedModels ?? []);
  const maxBody = o.maxBody ?? MAX_BODY;
  const log = o.log ?? defaultLog;
  const now = o.now ?? Date.now;
  const upstreamTimeoutMs = o.upstreamTimeoutMs ?? 600_000;
  const usage = usageCounts(o.usageDir ?? null, now);
  const admit = limiter(now);
  let keys = o.keys;

  const send = (res, status, body, headers = {}) => {
    if (res.headersSent) return res.destroy();
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  async function health(res) {
    try {
      const ps = await getJson(new URL("/api/ps", upstream), 5000);
      const models = (ps.models ?? []).map((m) => ({ name: m.name, gpuShare: m.size > 0 ? Math.round(((m.size_vram ?? 0) / m.size) * 1000) / 1000 : 0 }));
      if (models.some((m) => m.gpuShare < 0.99)) return send(res, 503, { ok: false, reason: "a model is not fully on the GPU", models });
      return send(res, 200, { ok: true, models });
    } catch {
      return send(res, 503, { ok: false, reason: "the model server does not answer" });
    }
  }

  function forward(req, res, url, body, entry) {
    return new Promise((resolve) => {
      const target = new URL(url.pathname + url.search, upstream);
      const headers = body ? { "content-type": "application/json", "content-length": body.length } : {};
      const up = lib.request(target, { method: req.method, headers, timeout: upstreamTimeoutMs }, (answer) => {
        res.writeHead(answer.statusCode ?? 502, { "content-type": answer.headers["content-type"] ?? "application/json" });
        let tail = "";
        answer.on("data", (chunk) => {
          tail = (tail + chunk.toString("utf8")).slice(-TAIL_BYTES);
          if (!res.write(chunk)) {
            answer.pause();
            res.once("drain", () => answer.resume());
          }
        });
        answer.on("end", () => {
          Object.assign(entry, countTokens(tail));
          tail = "";
          res.end();
          resolve();
        });
        answer.on("error", () => {
          res.destroy();
          resolve();
        });
      });
      up.on("timeout", () => up.destroy(new Error("timeout")));
      up.on("error", () => {
        send(res, 502, { error: "The model server is not reachable." });
        resolve();
      });
      res.on("close", () => {
        if (!res.writableEnded) up.destroy();
        resolve();
      });
      up.end(body ?? undefined);
    });
  }

  async function handle(req, res) {
    const started = now();
    const url = new URL(req.url ?? "/", "http://gate");
    const route = `${req.method} ${url.pathname}`;
    const entry = { community: null, method: req.method, path: url.pathname.slice(0, 80), model: null, status: 0, ms: 0, tokensIn: null, tokensOut: null };
    let forwarded = false;
    res.on("close", () => {
      entry.status = res.statusCode;
      entry.ms = now() - started;
      log({ t: new Date(started).toISOString(), ...entry });
      if (forwarded) usage.add(entry.community, { requests: 1, tokensIn: entry.tokensIn ?? 0, tokensOut: entry.tokensOut ?? 0 });
    });

    if (route === "GET /healthz") return health(res);
    const auth = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1]?.trim();
    if (route === "GET /usage") {
      if (!auth || !keys.operatorHash || sha256(auth) !== keys.operatorHash) return send(res, 401, { error: "Operator key required." });
      usage.flush();
      return send(res, 200, usage.snapshot());
    }

    const community = auth ? keys.byHash.get(sha256(auth)) : undefined;
    if (!community || (community.peer && plainAddress(req.socket.remoteAddress) !== community.peer)) {
      return send(res, 401, { error: "Unknown key." });
    }
    entry.community = community.id;
    if (!ROUTES.has(route)) {
      usage.add(community.id, { refused: 1 });
      return send(res, 403, { error: "Not allowed through the gate." });
    }
    const admitted = admit(community);
    if (!admitted.ok) {
      usage.add(community.id, { refused: 1 });
      return send(res, 429, { error: "Too many requests for this community." }, { "retry-after": String(admitted.retryAfter) });
    }
    try {
      let body = null;
      if (req.method === "POST") {
        try {
          body = await readBody(req, maxBody);
        } catch (e) {
          usage.add(community.id, { refused: 1 });
          return send(res, e.status ?? 400, { error: e.status === 413 ? "Request too large." : "Bad request." }, { connection: "close" });
        }
        let parsed;
        try {
          parsed = JSON.parse(body.toString("utf8"));
        } catch {
          return send(res, 400, { error: "The body must be JSON." });
        }
        entry.model = typeof parsed?.model === "string" ? parsed.model.slice(0, 100) : null;
        if (allowed.size && !allowed.has(entry.model)) {
          usage.add(community.id, { refused: 1 });
          return send(res, 403, { error: "That model is not served here." });
        }
      }
      forwarded = true;
      await forward(req, res, url, body, entry);
    } finally {
      admitted.release();
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => send(res, 500, { error: "Gate error." }));
  });
  return {
    server,
    setKeys(next) {
      keys = next;
    },
    flushUsage: () => usage.flush(),
    usageSnapshot: () => usage.snapshot(),
  };
}

// ── run as a program ──────────────────────────────────────────────────────────────────────────────
// GATE_LISTEN          host:port to listen on (default 10.77.0.1:11434, the server's WireGuard address)
// GATE_UPSTREAM        Ollama (default http://127.0.0.1:11435)
// GATE_KEYS_FILE       keys.json (default /etc/afribit-gate/keys.json); reloaded on SIGHUP
// GATE_ALLOWED_MODELS  comma-separated model names; empty = any model already on the server
// GATE_USAGE_DIR       where the monthly usage counts go (default /var/lib/afribit-gate/usage)
// GATE_MAX_BODY        bytes (default 524288)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const keysFile = env.GATE_KEYS_FILE ?? "/etc/afribit-gate/keys.json";
  const loadKeys = () => parseKeys(fs.readFileSync(keysFile, "utf8"));
  const listen = env.GATE_LISTEN ?? "10.77.0.1:11434";
  const colon = listen.lastIndexOf(":");
  const gate = createGate({
    upstream: env.GATE_UPSTREAM ?? "http://127.0.0.1:11435",
    keys: loadKeys(),
    allowedModels: (env.GATE_ALLOWED_MODELS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    usageDir: env.GATE_USAGE_DIR ?? "/var/lib/afribit-gate/usage",
    maxBody: Number(env.GATE_MAX_BODY ?? MAX_BODY),
  });
  gate.server.listen(Number(listen.slice(colon + 1)), listen.slice(0, colon), () => {
    defaultLog({ t: new Date().toISOString(), event: "listening", on: listen, communities: loadKeys().communities });
  });
  setInterval(() => gate.flushUsage(), 60_000).unref();
  process.on("SIGHUP", () => {
    try {
      const next = loadKeys();
      gate.setKeys(next);
      defaultLog({ t: new Date().toISOString(), event: "keys reloaded", communities: next.communities });
    } catch (e) {
      defaultLog({ t: new Date().toISOString(), event: "keys NOT reloaded; the old ones stay", reason: e.message });
    }
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => {
      gate.flushUsage();
      gate.server.close();
      process.exit(0);
    });
  }
}
