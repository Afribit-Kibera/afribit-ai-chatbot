import { closeSync, existsSync, fsyncSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { hash } from "./protocol.js";
import { replaceTrialFile, type TrialRecord } from "./trials.js";
import { runpodHttpsRequest } from "./runpodHttps.js";

export interface Lease {
  schema: 1;
  leaseId: string;
  podId: string;
  expectedName: string;
  createdAt: string;
  deadlineAt: string;
  quotedHourlyMicrousd: number;
  nonComputeMicrousd: number;
  maxRentalMicrousd: number;
  shutdownGraceMs: number;
  pollMs: number;
  requestTimeoutMs: number;
  cleanupAttempts: number;
  disposableDataOnly: true;
}
const integer = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
export function validateLease(v: unknown): Lease {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid rental lease");
  const p = v as Lease;
  const keys = ["schema", "leaseId", "podId", "expectedName", "createdAt", "deadlineAt", "quotedHourlyMicrousd", "nonComputeMicrousd", "maxRentalMicrousd", "shutdownGraceMs", "pollMs", "requestTimeoutMs", "cleanupAttempts", "disposableDataOnly"];
  if (Object.keys(p).some(k => !keys.includes(k)) || p.schema !== 1 || typeof p.leaseId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.leaseId)
    || typeof p.podId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(p.podId) || p.expectedName !== `afribit-showcase-${p.leaseId}`
    || !date(p.createdAt) || !date(p.deadlineAt) || Date.parse(p.deadlineAt) <= Date.parse(p.createdAt) || Date.parse(p.deadlineAt) - Date.parse(p.createdAt) > 3_600_000
    || !integer(p.quotedHourlyMicrousd, 1, 10_000_000) || !integer(p.nonComputeMicrousd, 0, 8_000_000) || !integer(p.maxRentalMicrousd, 1, 8_000_000) || p.nonComputeMicrousd >= p.maxRentalMicrousd
    || !integer(p.shutdownGraceMs, 10_000, 120_000) || !integer(p.pollMs, 100, 30_000) || !integer(p.requestTimeoutMs, 50, 5000) || !integer(p.cleanupAttempts, 1, 5)
    || p.disposableDataOnly !== true || p.shutdownGraceMs < p.pollMs * (p.cleanupAttempts - 1) + p.requestTimeoutMs * (p.cleanupAttempts * 3 + 1)) throw new Error("Invalid rental scope, deadline or allowance");
  return structuredClone(p);
}
export function shutdownAt(p: Lease) {
  const availableMs = Number(BigInt(p.maxRentalMicrousd - p.nonComputeMicrousd) * 3_600_000n / BigInt(p.quotedHourlyMicrousd));
  return Math.min(Date.parse(p.deadlineAt), Date.parse(p.createdAt) + availableMs) - p.shutdownGraceMs;
}
export interface PodSnapshot {
  id: string; name: string; createdAt: string; status: string; hourlyUsd: number;
  disposable: boolean; canTerminate: boolean;
}
export interface RentalClient { get(id: string): Promise<PodSnapshot | null>; terminate(id: string): Promise<void> }
export class RentalError extends Error {
  constructor(readonly code: "http" | "transport" | "shape" | "scope", readonly httpStatus: number | null = null) { super(`Rental ${code} failure`); }
}
export function parsePodSnapshot(b: any): PodSnapshot {
  if (!b || typeof b.id !== "string" || typeof b.name !== "string" || typeof b.createdAt !== "string" || !Number.isFinite(Date.parse(b.createdAt))
    || !["PROVISIONING", "STARTING", "RUNNING", "EXITED", "ERROR", "TERMINATED"].includes(b.status)
    || typeof b.cost !== "number" || !Number.isFinite(b.cost) || b.cost < 0 || !b.mounts || typeof b.mounts !== "object" || Array.isArray(b.mounts)
    || typeof b.locked !== "boolean" || !Array.isArray(b.actions)) throw new RentalError("shape");
  // Unknown mount kinds are rejected too: a changed provider schema cannot silently authorize deletion.
  const mountsSafe = Object.entries(b.mounts).every(([kind, mount]) => kind === "persistent"
    ? !!mount && typeof mount === "object" && typeof (mount as any).size === "number" && (mount as any).size >= 0
    : ["network", "global"].includes(kind) && (mount === null || (Array.isArray(mount) && mount.length === 0)));
  return { id: b.id, name: b.name, createdAt: new Date(b.createdAt).toISOString(), status: b.status, hourlyUsd: b.cost,
    disposable: mountsSafe && (b.cluster === undefined || b.cluster === null), canTerminate: b.actions.includes("terminate") && !b.locked };
}
/** Deliberately no create, stop, start, list, account dump or independent volume deletion methods. */
export class RunPodV2 implements RentalClient {
  constructor(private readonly key: string, private readonly timeoutMs: number, private readonly base = "https://api.runpod.io/v2", private readonly transport: "fetch" | "https-tls12" = "fetch") {
    const url = new URL(base);
    if (!key || !["fetch", "https-tls12"].includes(transport) || url.username || url.password || url.search || url.hash || (base !== "https://api.runpod.io/v2" && !(url.protocol === "http:" && url.hostname === "127.0.0.1"))) throw new RentalError("scope");
  }
  private async request(method: "GET" | "DELETE", id: string) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new RentalError("scope");
    try {
      if (this.transport === "https-tls12") return await runpodHttpsRequest(`${this.base}/pods/${encodeURIComponent(id)}`, method, this.key, this.timeoutMs);
      return await fetch(`${this.base}/pods/${encodeURIComponent(id)}`, { method, redirect: "error", signal: AbortSignal.timeout(this.timeoutMs), headers: { Authorization: `Bearer ${this.key}` } });
    } catch { throw new RentalError("transport"); }
  }
  async get(id: string): Promise<PodSnapshot | null> {
    const r = await this.request("GET", id);
    if (r.status === 404) { await r.body?.cancel(); return null; }
    if (!r.ok) { await r.body?.cancel(); throw new RentalError("http", r.status); }
    let b: any;
    try { b = await r.json(); } catch { throw new RentalError("shape"); }
    return parsePodSnapshot(b);
  }
  async terminate(id: string) {
    const r = await this.request("DELETE", id);
    await r.body?.cancel();
    if (r.status !== 204) throw new RentalError("http", r.status);
  }
}
interface LeaseState {
  schema: 1; fingerprint: string; maximumObservedAt: number; identityVerified: boolean;
  deleteAccepted: boolean; absenceConfirmed: boolean; needsAttention: boolean;
}
interface Clock { now(): number; monotonic(): number; wait(ms: number, signal?: AbortSignal): Promise<void> }
const clock: Clock = { now: () => Date.now(), monotonic: () => performance.now(), wait: (ms, signal) => new Promise(resolve => {
  if (signal?.aborted) return resolve();
  const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); };
  const timer = setTimeout(done, ms); signal?.addEventListener("abort", done, { once: true });
}) };
const owned = (p: Lease, pod: PodSnapshot) => pod.id === p.podId && pod.name === p.expectedName && pod.createdAt === p.createdAt && pod.disposable;

export async function watchRental(input: Lease, client: RentalClient, stateFile: string, trial: TrialRecord, options: { signal?: AbortSignal; completed?: () => boolean; clock?: Clock } = {}) {
  const p = validateLease(input), c = options.clock ?? clock, fingerprint = hash(p);
  const lock = openSync(`${stateFile}.lock`, "wx", 0o600);
  let uncertain = false, documentationFailed = false;
  let state!: LeaseState;
  const save = () => {
    const tmp = `${stateFile}.${randomUUID()}.tmp`, fd = openSync(tmp, "wx", 0o600);
    try { writeFileSync(fd, JSON.stringify(state, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
    replaceTrialFile(tmp, stateFile);
  };
  const event = (phase: string, details: Record<string, string | number | boolean | null> = {}) => {
    try { trial.event(phase, details); } catch { documentationFailed = true; if (state) state.needsAttention = true; }
  };
  try {
    state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { schema: 1, fingerprint, maximumObservedAt: Date.parse(p.createdAt), identityVerified: false, deleteAccepted: false, absenceConfirmed: false, needsAttention: false };
    if (state.schema !== 1 || state.fingerprint !== fingerprint || !Number.isSafeInteger(state.maximumObservedAt)
      || [state.identityVerified, state.deleteAccepted, state.absenceConfirmed, state.needsAttention].some(v => typeof v !== "boolean")) throw new RentalError("scope");
    // An initial durable record is required before any account request; later storage failure triggers cleanup.
    save(); trial.event("watchdog-armed", { fingerprint, stateFile, shutdownAt: new Date(shutdownAt(p)).toISOString(), billReconciled: false });
    const previouslyAbsent = state.absenceConfirmed;
    state.absenceConfirmed = false;
    const firstWall = Math.max(c.now(), state.maximumObservedAt), firstMono = c.monotonic();
    const now = () => { state.maximumObservedAt = Math.max(state.maximumObservedAt, c.now(), Math.floor(firstWall + c.monotonic() - firstMono)); return state.maximumObservedAt; };
    let reason = "deadline";
    const cleanup = async (reason: string, current: number) => {
      event("cleanup-requested", { reason, estimatedMicrousd: Math.ceil(Math.max(0, current - Date.parse(p.createdAt)) * p.quotedHourlyMicrousd / 3_600_000) + p.nonComputeMicrousd });
      // Always re-read before deletion. Never delete another resource merely to meet a cost target.
      for (let attempt = 1; attempt <= p.cleanupAttempts; attempt++) {
        try {
          const target = await client.get(p.podId);
          if (!target) { if (state.identityVerified && state.deleteAccepted) state.absenceConfirmed = true; break; }
          if (!owned(p, target) || !target.canTerminate) { event("cleanup-scope-rejected"); break; }
          await client.terminate(p.podId); state.deleteAccepted = true;
          try { save(); } catch { uncertain = true; }
          event("delete-accepted", { attempt });
          const after = await client.get(p.podId);
          if (!after) { state.absenceConfirmed = true; break; }
        } catch (error) { event("cleanup-retry", { attempt, httpStatus: error instanceof RentalError ? error.httpStatus : null }); }
        if (attempt < p.cleanupAttempts) await c.wait(p.pollMs);
      }
      if (!state.absenceConfirmed) state.needsAttention = true;
    };
    while (!state.absenceConfirmed) {
      let pod: PodSnapshot | null;
      try { pod = await client.get(p.podId); }
      catch (error) {
        event("read-failed", { httpStatus: error instanceof RentalError ? error.httpStatus : null }); state.needsAttention = true;
        // A known lease must not keep billing merely because one monitoring read failed.
        // Cleanup still requires a fresh successful identity/storage/permission read on every attempt.
        if (state.identityVerified) { reason = "read-failed"; await cleanup(reason, now()); }
        break;
      }
      if (!pod) {
        if (state.identityVerified && state.deleteAccepted) state.absenceConfirmed = true;
        else { event("unverified-absence"); state.needsAttention = true; }
        break;
      }
      if (previouslyAbsent) { event("resource-reappeared"); state.needsAttention = true; break; }
      if (!owned(p, pod)) { event("scope-rejected"); state.needsAttention = true; break; }
      state.identityVerified = true;
      const current = now();
      if (current < Date.parse(p.createdAt)) { state.needsAttention = true; break; }
      try { save(); } catch { uncertain = true; }
      const changedPrice = Math.ceil(pod.hourlyUsd * 1_000_000) > p.quotedHourlyMicrousd;
      reason = options.signal?.aborted ? "cancelled" : options.completed?.() ? "work-complete" : changedPrice ? "price-increase" : uncertain || documentationFailed ? "recording-failed" : pod.status === "EXITED" ? "pod-exited" : pod.status === "ERROR" ? "pod-error" : "deadline";
      if (reason !== "deadline" || current >= shutdownAt(p) || pod.status === "EXITED" || pod.status === "ERROR") {
        await cleanup(reason, current);
        break;
      }
      event("watchdog-check", { maximumObservedAt: current, quotedHourlyMicrousd: p.quotedHourlyMicrousd });
      await c.wait(Math.max(1, Math.min(p.pollMs, shutdownAt(p) - current)), options.signal);
    }
    if (documentationFailed || uncertain) state.needsAttention = true;
    try { save(); } catch { uncertain = true; state.needsAttention = true; }
    event("watchdog-result", { podAbsenceConfirmed: state.absenceConfirmed, billReconciled: false, needsAttention: state.needsAttention, reason });
    return { podAbsenceConfirmed: state.absenceConfirmed, needsAttention: state.needsAttention || documentationFailed, billReconciled: false, reason };
  } catch (error) { uncertain = true; throw error; }
  finally {
    closeSync(lock);
    // Uncertain state remains locked for manual reconciliation. No automatic stale-lock recovery.
    if (!uncertain && !state?.needsAttention) unlinkSync(`${stateFile}.lock`);
  }
}
