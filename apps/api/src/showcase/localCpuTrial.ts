import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { totalmem, freemem, cpus, platform, arch } from "node:os";
import { createServer } from "node:net";
import { env } from "../config/env.js";
import { loadPack } from "../pack/load.js";
import { DEFAULT_PACK_DIR } from "../pack/active.js";
import { REPOSITORY_ROOT, revisionIdentity } from "./revision.js";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { downloadVerified, extractZipSafely, fileSha256, type Artifact } from "./artifacts.js";
import { validateBenchmark, validatePlan } from "./protocol.js";
import { runShowcase } from "./runner.js";

const RUNTIME: Artifact = { url: "https://github.com/ggml-org/llama.cpp/releases/download/b11669/llama-b11669-bin-win-cpu-x64.zip", bytes: 19537886,
  sha256: "37b3efcf962847ca869745fd4ccf7f5e7e8dacfeff9fa3523b4ca8cdc66d632b" };
const MODEL: Artifact = { url: "https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/resolve/807dfd9a6fadbf703207aac3bfb0b2b3040d077c/Qwen3.5-0.8B-Q8_0.gguf", bytes: 833592096,
  sha256: "37ae482d336108d23516fa35e8e0c4126688d81018b87178a18d752a1357814f" };
const MODEL_REVISION = "807dfd9a6fadbf703207aac3bfb0b2b3040d077c";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function executable(dir: string): string | null {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name === "llama-server.exe") return join(dir, e.name);
    if (e.isDirectory()) { const found = executable(join(dir, e.name)); if (found) return found; }
  }
  return null;
}
async function freePort() {
  const server = createServer(); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port; await new Promise<void>(resolve => server.close(() => resolve())); return port;
}
async function main(trial: TrialRecord) {
  const args = process.argv.slice(2);
  if (args.some(a => !["--acquire", "--execute"].includes(a)) || new Set(args).size !== args.length) throw new Error("Invalid local trial arguments");
  const revision = revisionIdentity(), hardware = { platform: platform(), arch: arch(), node: process.version, cpu: cpus()[0]?.model ?? "unknown", logicalCpus: cpus().length,
    ramBytes: totalmem(), initiallyFreeRamBytes: freemem(), executionDevice: "CPU only; GPU unmeasured" };
  trial.event("revision", revision); trial.event("hardware", hardware);
  if (!args.includes("--acquire")) {
    if (args.includes("--execute")) throw new Error("Acquisition/verification is required before execution");
    const preview = { dryRun: true, downloadBytes: RUNTIME.bytes + MODEL.bytes, modelCalls: 0, paidComputeUsd: 0 };
    console.log(JSON.stringify(preview, null, 2)); trial.finish("completed", 0, preview); return;
  }
  if (platform() !== "win32" || arch() !== "x64") throw new Error("Local CPU trial requires Windows x64");
  if (args.includes("--execute") && freemem() < 3_000_000_000) { trial.event("preflight-refused", { reason: "free-ram-below-3gb", freeRamBytes: freemem() }); throw new Error("Insufficient free RAM for generation"); }
  const cache = join(REPOSITORY_ROOT, "output/local-model-cache"), dir = join(REPOSITORY_ROOT, "output/local-cpu", trial.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "acquisition.json"), JSON.stringify({ revision, hardware, runtime: RUNTIME, model: MODEL, modelRevision: MODEL_REVISION }, null, 2) + "\n", { mode: 0o600 });
  trial.event("acquisition-started", { artifacts: dir, bytes: RUNTIME.bytes + MODEL.bytes });
  const runtime = await downloadVerified(RUNTIME, join(cache, "llama-b11669-win-cpu-x64.zip"), bytes => { trial.event("runtime-download", { bytes }); console.log(`Runtime bytes verified/progress: ${bytes}`); });
  const model = await downloadVerified(MODEL, join(cache, "Qwen3.5-0.8B-Q8_0.gguf"), bytes => { trial.event("model-download", { bytes }); console.log(`Model bytes verified/progress: ${bytes}`); });
  const artifactBytes = runtime.bytes + model.bytes, transferredBytes = (runtime.cached ? 0 : runtime.bytes) + (model.cached ? 0 : model.bytes);
  trial.event("artifacts-verified", { modelSha256: model.sha256, runtimeArchiveSha256: runtime.sha256, modelBytes: model.bytes, artifactBytes, transferredBytes, runtimeCached: runtime.cached, modelCached: model.cached });
  const destination = join(dir, "runtime"); mkdirSync(destination);
  extractZipSafely(runtime.filename, destination);
  const bin = executable(destination); if (!bin) throw new Error("Verified archive has no server executable");
  const help = execFileSync(bin, ["--help"], { windowsHide: true, encoding: "utf8", timeout: 15000,
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP } });
  for (const flag of ["--api-key", "--offline", "--chat-template-kwargs"]) if (!help.includes(flag)) throw new Error("Required runtime flag is unavailable");
  writeFileSync(join(dir, "runtime-help.txt"), help);
  trial.event("runtime-verified", { executableSha256: await fileSha256(bin), binary: bin });
  if (!args.includes("--execute")) {
    const result = { artifacts: dir, artifactBytes, transferredBytes, runtimeCached: runtime.cached, modelCached: model.cached, modelCalls: 0, paidComputeUsd: 0 };
    trial.finish("completed", 0, result); console.log(JSON.stringify(result, null, 2)); return;
  }
  if (freemem() < 3_000_000_000) { trial.event("preflight-refused", { reason: "free-ram-below-3gb-after-acquisition", freeRamBytes: freemem() }); throw new Error("Insufficient free RAM after acquisition"); }

  const key = randomBytes(32).toString("hex"), port = await freePort(), baseUrl = `http://127.0.0.1:${port}`;
  const serverArgs = ["-m", model.filename, "--alias", "afribit-qwen35-08-q8", "--host", "127.0.0.1", "--port", String(port), "-ngl", "0", "--threads", "6", "--ctx-size", "16384", "--parallel", "1", "--offline", "--no-webui", "--chat-template-kwargs", '{"enable_thinking":false}'];
  writeFileSync(join(dir, "server-configuration.json"), JSON.stringify({ binary: bin, args: serverArgs, keyHandling: "ephemeral process environment; not persisted" }, null, 2) + "\n");
  const child = spawn(bin, serverArgs, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP, LLAMA_API_KEY: key } });
  const log = createWriteStream(join(dir, "server.log"), { flags: "wx", mode: 0o600 });
  const logLine = (stream: NodeJS.ReadableStream) => { let carry = ""; stream.on("data", chunk => { carry += chunk.toString(); const lines = carry.split("\n"); carry = lines.pop()!; for (const line of lines) log.write(line.replaceAll(key, "[redacted]") + "\n"); }); stream.on("end", () => { if (carry) log.write(carry.replaceAll(key, "[redacted]")); }); };
  logLine(child.stdout!); logLine(child.stderr!);
  let exitCode: number | null = null, didExit = false;
  const exited = new Promise<void>(resolve => { child.once("close", code => { exitCode = code; didExit = true; resolve(); }); child.once("error", () => { didExit = true; resolve(); }); });
  const saved = { ...env }; let summary: Awaited<ReturnType<typeof runShowcase>> | null = null;
  const controller = new AbortController(), stop = () => controller.abort(), deadline = setTimeout(stop, 1_080_000);
  log.on("error", stop);
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    trial.event("server-started", { pid: child.pid ?? null, baseUrl, threads: 6, gpuLayers: 0, contextTokens: 16384 });
    const end = Date.now() + 120000; let ready = false;
    while (Date.now() < end && !didExit && !controller.signal.aborted) {
      try { const r = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) }); await r.body?.cancel(); if (r.ok) { ready = true; break; } } catch { /* Startup can still be loading. */ }
      await wait(500);
    }
    if (!ready) throw new Error("Server failed to become healthy");
    for (const authorization of [null, "Bearer wrong-synthetic-key"]) {
      const r = await fetch(`${baseUrl}/v1/chat/completions`, { method: "POST", signal: AbortSignal.timeout(5000), headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
        body: JSON.stringify({ model: "afribit-qwen35-08-q8", messages: [{ role: "user", content: "SYNTHETIC AUTH PROBE" }], max_tokens: 1 }) });
      await r.body?.cancel(); if (r.status !== 401) throw new Error("Endpoint failed authentication rejection");
    }
    const listed = await fetch(`${baseUrl}/v1/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
    const models = await listed.json() as { data?: { id: string }[] }; if (!listed.ok || !models.data?.some(m => m.id === "afribit-qwen35-08-q8")) throw new Error("Authenticated model alias mismatch");
    trial.event("endpoint-auth-verified", { missingKeyStatus: 401, wrongKeyStatus: 401, alias: "afribit-qwen35-08-q8" });
    Object.assign(env, { localLlmBaseUrl: baseUrl, localLlmApi: "openai", localLlmApiKey: key, localLlmModel: "afribit-qwen35-08-q8", inferenceMode: "node", openRouterApiKey: "", cloudEmbeddingsAllowed: false });
    const pack = loadPack(DEFAULT_PACK_DIR).pack!;
    const benchmark = validateBenchmark(JSON.parse(readFileSync(join(REPOSITORY_ROOT, "docs/evaluation/showcase-synthetic-v1.json"), "utf8")), pack);
    const plan = validatePlan({ schema: 1, budgetMicrousd: 10000000, heldAsideMicrousd: 2000000, externalChargesMicrousd: 0, upstreamLimitReference: "", maxOutputTokens: 160, answerWordLimit: 90,
      timeoutMs: 120000, maxDurationMs: 900000, concurrency: 1, repetitions: 1, candidates: [{ id: "qwen35-08-q8-cpu", modelRevision: MODEL_REVISION,
        route: { kind: "chat", provider: "local", model: "afribit-qwen35-08-q8", baseUrl, region: "community", maxInputBytes: 65536, maxOutputTokens: 160, reservationMicrousd: 0,
          billingBoundConfirmed: false, upstreams: [], promptPriceMicrousdPerMillion: 0, completionPriceMicrousdPerMillion: 0 } }] });
    writeFileSync(join(dir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
    summary = await runShowcase(plan, benchmark, pack, { ledger: join(dir, "experiment.json"), artifacts: join(dir, "answers") }, revision, controller.signal, trial);
    const memory = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Get-Process -Id ${child.pid} | Select-Object WorkingSet64,PeakWorkingSet64 | ConvertTo-Json -Compress`], { windowsHide: true, encoding: "utf8", timeout: 10000 }));
    writeFileSync(join(dir, "process-memory.json"), JSON.stringify(memory, null, 2) + "\n");
    trial.event("local-generation-result", { ...summary, peakWorkingSetBytes: memory.PeakWorkingSet64, humanReview: "pending", paidComputeUsd: 0 });
  } finally {
    clearTimeout(deadline); controller.abort(); Object.assign(env, saved); process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
    if (!didExit) child.kill(); await Promise.race([exited, wait(5000)]);
    log.end(); trial.event("server-cleanup", { pid: child.pid ?? null, exited: didExit, exitCode });
    if (!didExit) throw new Error("Owned server exit was not confirmed");
  }
  const failed = !summary || summary.failed || summary.skipped || summary.cancelled || summary.stopped;
  trial.finish(failed ? "failed" : "completed", 0, { artifacts: dir, completed: summary?.completed ?? 0, failed: summary?.failed ?? 0, modelCalls: (summary?.completed ?? 0) + (summary?.failed ?? 0), serverExited: didExit, humanReview: "pending" });
  console.log(JSON.stringify({ trial: trial.filename, localTrialArtifacts: dir, ...summary, paidComputeUsd: 0, humanReview: "pending" }, null, 2));
  if (failed) process.exitCode = 1;
}
let trial: TrialRecord | undefined;
try { trial = new TrialRecord(TRIAL_DIRECTORY, "verified-local-cpu-inference", "pnpm --filter @afribit/api showcase:local-cpu [--acquire] [--execute]"); await main(trial); }
catch { try { trial?.finish("failed", 0, { reason: "acquisition-runtime-or-generation-failed", providerSpendUsd: 0 }); } catch { /* Preserve incomplete evidence. */ }
  console.error("Local CPU trial failed; inspect its retained record and isolated runtime logs."); process.exitCode = 1; }
