/** Synthetic rental worker. Importing it has no install, network or process side effects. */
import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGate, parseKeys } from "../../deploy/gpu-server/gate/gate.mjs";

const run = promisify(execFile);
const MODEL = "gemma4:e4b-it-q4_K_M";
const HEX = /^[a-f0-9]{64}$/;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export function validateWorkerConfig(c, now = Date.now()) {
  if (!c || Object.keys(c).some(k => !["schema", "model", "keySha256", "leaseId", "manifestDigest", "admittedAt", "deadlineAt", "contextWindowTokens"].includes(k))
    || c.schema !== 1 || c.model !== MODEL || !HEX.test(c.keySha256 ?? "")
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(c.leaseId ?? "")
    || !/^sha256:[a-f0-9]{64}$/.test(c.manifestDigest ?? "")
    || ("contextWindowTokens" in c && ![4096,8192].includes(c.contextWindowTokens))
    || !Number.isFinite(Date.parse(c.admittedAt)) || !Number.isFinite(Date.parse(c.deadlineAt))
    || new Date(c.admittedAt).toISOString() !== c.admittedAt || new Date(c.deadlineAt).toISOString() !== c.deadlineAt
    || Date.parse(c.deadlineAt) <= Date.parse(c.admittedAt) || Date.parse(c.deadlineAt) - Date.parse(c.admittedAt) > 1800000
    || Date.parse(c.admittedAt) > now + 30000 || Date.parse(c.deadlineAt) <= now) throw new Error("invalid-worker-lease");
  return structuredClone(c);
}
export function workerContext(config) { return config.contextWindowTokens ?? 4096; }
export function qualifiedPlacement(placement, config) {
  return placement.some(m => m.name === MODEL && typeof m.digest === "string" && m.digest.replace(/^sha256:/, "") === config.manifestDigest.slice(7)
    && Number.isFinite(m.size) && Number.isFinite(m.sizeVram) && m.size > 0 && m.sizeVram / m.size >= .99 && m.contextLength === workerContext(config));
}
export function authorized(header, expected) {
  if (typeof header !== "string" || !/^Bearer [a-f0-9]{64}$/.test(header) || !HEX.test(expected)) return false;
  return timingSafeEqual(createHash("sha256").update(header.slice(7)).digest(), Buffer.from(expected, "hex"));
}
function publicStatus(state, gate) {
  const v = state.verification;
  const t = state.telemetry;
  const text = value => typeof value === "string" ? value.slice(0, 100) : null;
  const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  // The sampler finalizes maxima only when it exits. Export bounded live aggregates before Pod deletion.
  const samples = Array.isArray(t?.samples) ? t.samples.slice(0, 900) : [];
  const liveMaxima = new Map();
  for (const sample of samples) for (const device of Array.isArray(sample.devices) ? sample.devices.slice(0, 16) : []) {
    const index = number(device.index); if (index === null) continue;
    const peak = liveMaxima.get(index) ?? { index, name: text(device.name), sampledMaxUsedMiB: null, sampledMaxUtilizationPercent: null, sampledMaxPowerWatts: null };
    for (const [source, target] of [["memoryUsedMiB", "sampledMaxUsedMiB"], ["utilizationPercent", "sampledMaxUtilizationPercent"], ["powerWatts", "sampledMaxPowerWatts"]]) {
      const value = number(device[source]); if (value !== null) peak[target] = peak[target] === null ? value : Math.max(peak[target], value);
    }
    liveMaxima.set(index, peak);
  }
  const maxima = Array.isArray(t?.sampledMaxima) ? t.sampledMaxima : [...liveMaxima.values()];
  const baseline = Array.isArray(samples[0]?.devices) ? samples[0].devices.slice(0, 8).map(d => ({ index: number(d.index), name: text(d.name),
    memoryTotalMiB: number(d.memoryTotalMiB), memoryUsedMiB: number(d.memoryUsedMiB), driverVersion: text(d.driverVersion) })) : [];
  return { schema: 1, stage: state.stage, armed: state.armed === true, failure: state.failure ?? null, at: new Date().toISOString(),
    versions: state.versions ? Object.fromEntries(["node", "python", "ollama"].map(k => [k, text(state.versions[k])])) : null,
    model: MODEL, warmupCalls: state.warmupCalls ?? 0, pinnedAliasConfigured: state.pinnedAliasConfigured === true,
    bootstrap: state.bootstrap ? { nodeArchiveBytesVerified: state.bootstrap.nodeArchiveBytesVerified === true,
      nodeArchiveSha256: text(state.bootstrap.nodeArchiveSha256), nodeBinarySha256: text(state.bootstrap.nodeBinarySha256),
      packages: Array.isArray(state.bootstrap.packages) ? state.bootstrap.packages.slice(0, 10).map(text) : [] } : null,
    placement: Array.isArray(state.placement) ? state.placement.slice(0, 4).map(m => ({ name: text(m.name), digest: text(m.digest), size: number(m.size), sizeVram: number(m.sizeVram), contextLength: number(m.contextLength) })) : null,
    verification: v ? { status: v.status, weightsBytesVerified: v.weightsBytesVerified === true,
      manifestDigest: v.manifestDigest, verifiedBytes: v.verifiedBytes ?? null, helperSha256: v.helperSha256,
      snapshotSha256: v.snapshotSha256, storageFormat: v.storageFormat ?? null, reason: v.reason ?? null } : null,
    telemetry: t ? { status: t.status, sampleCount: t.sampleCount, elapsedSeconds: t.elapsedSeconds ?? samples.at(-1)?.elapsedSeconds ?? null,
      baseline, failures: Array.isArray(t.failures) ? t.failures.length : 0, finalized: t.status !== "started",
      sampledMaxima: maxima.slice(0, 8).map(m => ({ index: number(m.index), name: text(m.name),
        sampledMaxUsedMiB: number(m.sampledMaxUsedMiB), sampledMaxUtilizationPercent: number(m.sampledMaxUtilizationPercent), sampledMaxPowerWatts: number(m.sampledMaxPowerWatts) })) } : null,
    innerStop: state.innerStop ? { attempted: state.innerStop.attempted === true, accepted: state.innerStop.accepted === true } : null,
    usage: gate.usageSnapshot(), paidComputeUsd: null };
}
export function createWorkerServer(config, state, options = {}) {
  const upstream = new URL(options.upstream ?? "http://127.0.0.1:11435");
  if (upstream.protocol !== "http:" || upstream.hostname !== "127.0.0.1" || upstream.pathname !== "/" || upstream.search || upstream.hash || upstream.username || upstream.password) throw new Error("loopback-upstream-required");
  const gate = createGate({ upstream: upstream.href, allowedModels: [MODEL],
    keys: parseKeys({ communities: [{ id: "showcase", keySha256: config.keySha256, concurrent: 4, perMinute: 60 }] }),
    maxBody: 65536, upstreamTimeoutMs: 90000, usageDir: null, log: () => {} });
  const send = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  let armed = false;
  const server = http.createServer((req, res) => {
    if (!authorized(req.headers.authorization, config.keySha256)) return send(res, 401, { error: "Unauthorized" });
    if (req.method === "GET" && req.url === "/trial-status") return send(res, 200, publicStatus(state, gate));
    if (req.method === "POST" && req.url === "/trial-arm") {
      if (req.headers["transfer-encoding"] || req.headers["content-length"] && req.headers["content-length"] !== "0") return send(res, 400, { error: "Empty body required" });
      if (armed || state.stage !== "awaiting-arm") return send(res, 409, { error: "Worker cannot be armed" });
      armed = true; state.armed = true; send(res, 202, { accepted: true }); options.armed?.(); return;
    }
    if (req.method === "POST" && req.url === "/trial-complete") {
      if (req.headers["transfer-encoding"] || req.headers["content-length"] && req.headers["content-length"] !== "0") return send(res, 400, { error: "Empty body required" });
      send(res, 202, { accepted: true }); options.completed?.(); return;
    }
    if (state.stage !== "ready") return send(res, 503, { error: "Worker unavailable" });
    gate.server.emit("request", req, res);
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000; server.maxHeadersCount = 30;
  return { server, gate };
}
async function jsonRequest(path, body, timeoutMs = 15000) {
  const r = await fetch(`http://127.0.0.1:11435${path}`, { method: body ? "POST" : "GET", redirect: "error",
    signal: AbortSignal.timeout(timeoutMs), headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { await r.body?.cancel(); throw new Error("ollama-request-failed"); }
  if (!r.body) return null;
  const chunks = []; let bytes = 0;
  for await (const chunk of r.body) { bytes += chunk.length; if (bytes > 1048576) throw new Error("ollama-response-bound"); chunks.push(Buffer.from(chunk)); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
}
export async function executeWorker(input) {
  const config = validateWorkerConfig(input);
  const contextWindowTokens = workerContext(config);
  if (process.platform !== "linux") throw new Error("rental-linux-required");
  const work = ROOT, state = { stage: "starting", warmupCalls: 0, versions: { node: process.version } };
  state.bootstrap = JSON.parse(readFileSync(join(work, "bootstrap.json"), "utf8"));
  let ollama, telemetry, stopped = false;
  let arm;
  const armed = new Promise(resolve => { arm = resolve; });
  const marker = join(work, "sampling-complete.marker");
  const save = () => writeFileSync(join(work, "worker-state.json"), JSON.stringify(state, null, 2) + "\n", { mode: 0o600, flush: true });
  const phase = (stage) => { state.stage = stage; save(); console.log(JSON.stringify({ stage })); };
  const childEnv = {};
  for (const name of ["PATH", "LD_LIBRARY_PATH", "HOME", "CUDA_VISIBLE_DEVICES", "NVIDIA_VISIBLE_DEVICES", "NVIDIA_DRIVER_CAPABILITIES"]) if (process.env[name]) childEnv[name] = process.env[name];
  Object.assign(childEnv, { OLLAMA_HOST: "127.0.0.1:11435", OLLAMA_MODELS: join(work, "models"), OLLAMA_DEBUG: "0", OLLAMA_NO_CLOUD: "1",
    OLLAMA_NUM_PARALLEL: "4", OLLAMA_MAX_LOADED_MODELS: "1", OLLAMA_CONTEXT_LENGTH: String(contextWindowTokens), OLLAMA_KEEP_ALIVE: "20m" });
  const refresh = () => {
    try { const path = join(work, "telemetry/telemetry.json"); if (existsSync(path)) state.telemetry = JSON.parse(readFileSync(path, "utf8")); } catch { /* Partial file is not a successful sample. */ }
  };
  let outer;
  async function stop(reason) {
    if (stopped) return; stopped = true;
    arm(false);
    state.stopReason = reason; phase("stopping");
    try { writeFileSync(marker, "sampling complete\n", { flag: "wx", mode: 0o600 }); } catch { state.failure = "sampling-marker-failed"; }
    ollama?.kill("SIGTERM");
    const id = process.env.RUNPOD_POD_ID;
    if (typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
      try { await run("runpodctl", ["pod", "stop", id], { timeout: 10000, maxBuffer: 16384, env: { ...process.env, RUNPOD_NO_UPDATE_CHECK: "1" } }); state.innerStop = { attempted: true, accepted: true }; }
      catch { state.innerStop = { attempted: true, accepted: false }; }
    } else state.innerStop = { attempted: false, accepted: false };
    refresh(); phase("stopped"); outer.server.close();
    // Stopping the process is not Pod termination. The external supervisor still owns cleanup/billing.
  }
  outer = createWorkerServer(config, state, { armed: () => { arm(true); }, completed: () => { void stop("work-complete"); } });
  outer.server.listen(8080, "0.0.0.0");
  const timer = setTimeout(() => { void stop("absolute-deadline"); }, Math.max(1, Date.parse(config.deadlineAt) - Date.now()));
  const refreshTimer = setInterval(refresh, 1000); refreshTimer.unref();
  outer.server.once("close", () => { clearTimeout(timer); clearInterval(refreshTimer); telemetry?.kill("SIGTERM"); });
  process.once("SIGTERM", () => { void stop("signal"); }); process.once("SIGINT", () => { void stop("signal"); });
  try {
    phase("awaiting-arm");
    if (!await armed || stopped) throw new Error("worker-not-armed");
    const py = await run("python3", ["--version"], { timeout: 3000, maxBuffer: 1024, env: childEnv });
    state.versions.python = py.stdout.trim();
    ollama = spawn("/bin/ollama", ["serve"], { env: childEnv, stdio: "ignore" });
    ollama.on("error", () => { state.failure = "ollama-process-failed"; phase("failed"); });
    let version;
    for (let i = 0; i < 20 && !stopped; i++) { try { version = await jsonRequest("/api/version"); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
    if (!version || stopped) throw new Error("ollama-start-failed");
    state.versions.ollama = typeof version.version === "string" ? version.version.slice(0, 60) : null;
    phase("pulling"); await jsonRequest("/api/pull", { model: MODEL, stream: false }, 360000);
    if (stopped) throw new Error("deadline-during-pull");
    // New Ollama versions keep legacy downgrade anchors and multi-runner named manifests.
    // Bind this test alias to the exact, already downloaded frozen manifest before verification.
    const pinnedBlob = join(work, "models/blobs", config.manifestDigest.replace(":", "-"));
    if (!existsSync(pinnedBlob)) throw new Error("pinned-manifest-blob-missing");
    const manifestBytes = readFileSync(pinnedBlob);
    if (manifestBytes.length > 2097152 || `sha256:${createHash("sha256").update(manifestBytes).digest("hex")}` !== config.manifestDigest) throw new Error("pinned-manifest-blob-mismatch");
    await jsonRequest("/api/copy", { source: config.manifestDigest.replace(":", "-"), destination: MODEL });
    state.pinnedAliasConfigured = true;
    phase("verifying");
    let verificationFailed = false;
    try { await run("python3", [join(work, "tools/showcase/verify_ollama_store.py"), "--snapshot", join(work, "data/model-pins.json"),
      "--model", MODEL, "--store", join(work, "models"), "--out", join(work, "verification"), "--seconds", "240", "--execute"],
      { timeout: 250000, maxBuffer: 4096, env: childEnv }); } catch { verificationFailed = true; }
    const reports = readdirSync(join(work, "verification"));
    if (reports.length !== 1) throw new Error("verification-count");
    state.verification = JSON.parse(readFileSync(join(work, "verification", reports[0], "report.json"), "utf8"));
    if (verificationFailed || state.verification.status !== "completed" || !state.verification.weightsBytesVerified || state.verification.manifestDigest !== config.manifestDigest) throw new Error("verification-failed");
    telemetry = spawn("python3", [join(work, "tools/showcase/gpu_telemetry.py"), "--out", join(work, "telemetry"),
      "--duration-seconds", "900", "--interval-seconds", "1", "--timeout-seconds", "2", "--completed-file", marker, "--execute"], { env: childEnv, stdio: "ignore" });
    telemetry.on("error", () => { state.failure = "telemetry-process-failed"; phase("failed"); });
    phase("warming"); state.warmupCalls++;
    const warm = await jsonRequest("/api/chat", { model: MODEL, messages: [{ role: "user", content: "Reply READY." }], think: false,
      stream: false, options: { num_ctx: contextWindowTokens, num_predict: 8, temperature: 0 }, keep_alive: "20m" }, 90000);
    if (!warm.done || stopped || state.failure) throw new Error("warmup-failed");
    const ps = await jsonRequest("/api/ps");
    state.placement = (ps.models ?? []).map(m => ({ name: m.name, digest: m.digest, size: m.size, sizeVram: m.size_vram, contextLength: m.context_length }));
    if (!qualifiedPlacement(state.placement, config)) throw new Error("full-gpu-placement-or-context-unverified");
    refresh(); if (!state.telemetry?.sampleCount || state.failure) throw new Error("gpu-telemetry-unavailable");
    phase("ready");
  } catch (error) {
    state.failure = error instanceof Error && /^[a-z-]{1,70}$/.test(error.message) ? error.message : "worker-stage-failed";
    if (!stopped) phase("failed");
    // Keep authenticated diagnostics briefly available; caller exports evidence then signals completion.
  }
  return { state, outer, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--execute") { console.error("Use --execute CONFIG on the synthetic rental only."); process.exitCode = 1; }
  else {
    try { await executeWorker(JSON.parse(readFileSync(args[1], "utf8"))); }
    catch { console.error("Worker refused; no environment or raw provider error is printed."); process.exitCode = 1; }
  }
}
