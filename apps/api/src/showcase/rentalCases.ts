import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
import { revisionIdentity, REPOSITORY_ROOT } from "./revision.js";
import { hash } from "./protocol.js";
import { RunPodV2, RentalError, shutdownAt, validateLease, watchRental, type Lease } from "./rental.js";

const suite = new TrialRecord(TRIAL_DIRECTORY, "rental-and-documentation-fixtures", "pnpm --filter @afribit/api test:rental");
suite.event("revision", revisionIdentity());
const dir = mkdtempSync(join(tmpdir(), "afribit-rental-"));
const example = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "docs/examples/showcase-rental-lease.json"), "utf8"));
let checks = 0, passed = false, sequence = 0, mode = "ok", deleted = false, gets = 0, deletes = 0, captures = 0;
let current: Lease;
const commands: string[] = [];
const server = createServer((req, res) => {
  commands.push(`${req.method} ${req.url}`);
  if (req.url === "/capture") { captures++; res.end("captured"); return; }
  if (req.headers.authorization !== "Bearer SYNTHETIC_RENTAL_KEY") { res.writeHead(401); res.end("secret-body"); return; }
  if (req.method === "DELETE") {
    deletes++;
    if (mode === "timeout-delete") return;
    if (mode === "delete-503") { res.writeHead(503); res.end("SYNTHETIC_PROVIDER_SECRET"); return; }
    if (mode !== "accepted-only") deleted = true;
    res.writeHead(204); res.end(); return;
  }
  gets++;
  if ((mode === "transient-monitor" || mode === "monitor-foreign") && gets === 2 || mode === "monitor-down" && gets >= 2) { res.writeHead(503); res.end("SYNTHETIC_PROVIDER_SECRET"); return; }
  if (mode === "401" || mode === "403" || mode === "429") { res.writeHead(Number(mode)); res.end("SYNTHETIC_PROVIDER_SECRET"); return; }
  if (mode === "redirect") { res.writeHead(302, { location: `http://127.0.0.1:${(server.address() as AddressInfo).port}/capture` }); res.end(); return; }
  if (deleted || mode === "missing") { res.writeHead(404); res.end(); return; }
  const second = gets >= 2;
  const body = { id: current.podId, name: mode === "foreign" || (mode === "changed-owner" && second) || mode === "monitor-foreign" && gets >= 3 ? "somebody-elses-pod" : current.expectedName,
    createdAt: mode === "changed-date" ? "2026-10-25T00:00:00.000Z" : current.createdAt,
    status: mode === "stopped" ? "EXITED" : "RUNNING", cost: mode === "price" ? 2 : 1, locked: mode === "locked", actions: ["terminate"],
    env: { API_KEY: "SYNTHETIC_PROVIDER_SECRET" }, mounts: mode === "network" || (mode === "changed-storage" && second)
      ? { network: [{ volumeId: "never-delete-this-volume", path: "/workspace" }] } : mode === "global" ? { global: [{ volumeId: "never-delete-global", path: "/workspace" }] }
      : mode === "unknown-mount" ? { other: { volume: "no" } } : { persistent: { size: 20, path: "/workspace" } },
    ...(mode === "cluster" ? { cluster: { id: "cluster" } } : {}) };
  if (mode === "shape") (body as any).cost = "untrusted-price";
  res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(body));
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v2`;
const client = () => new RunPodV2("SYNTHETIC_RENTAL_KEY", 50, base);
const p = (extra: Partial<Lease> = {}): Lease => validateLease({ ...example, deadlineAt: "2026-10-26T00:00:20.000Z", requestTimeoutMs: 50, shutdownGraceMs: 10000, pollMs: 1000, cleanupAttempts: 2, ...extra });
const fakeClock = (start = 0, backwards = false) => {
  let wall = Date.parse(current.createdAt) + start, mono = 0;
  return { now: () => wall, monotonic: () => mono, wait: async (ms: number) => { wall += backwards ? -ms : ms; mono += ms; } };
};
function reset(m = "ok", plan = p()) { current = plan; mode = m; gets = deletes = 0; deleted = false; }
const run = (options: Parameters<typeof watchRental>[4] = {}) => watchRental(current, client(), join(dir, `lease-${++sequence}.json`), suite, { clock: fakeClock(), ...options });
const ok = async (name: string, fn: () => Promise<void> | void) => {
  const before = commands.length;
  suite.event("case-started", { name });
  try { await fn(); checks++; suite.event("case-passed", { name, fixtureRequests: commands.length - before }); console.log(`  ok  ${name}`); }
  catch (error) { suite.event("case-failed", { name }); throw error; }
};
try {
  await ok("trial records: completed, failed and unfinished trials retain cost status without raw errors", () => {
    const t = new TrialRecord(dir, "synthetic-unit", "synthetic-command"); t.event("validated", { configHash: hash("fixture") }); t.finish("failed", 0, { reason: "validation-failed" });
    const record = JSON.parse(readFileSync(t.filename, "utf8")); assert.equal(record.status, "failed"); assert.equal(record.paidComputeUsd, 0); assert.ok(record.finishedAt);
    assert.throws(() => t.event("late"));
    const unfinished = new TrialRecord(dir, "synthetic-crash", "synthetic-command"); assert.equal(JSON.parse(readFileSync(unfinished.filename, "utf8")).status, "started");
    assert.throws(() => new TrialRecord(t.filename, "cannot-write", "no work allowed"));
  });
  await ok("rental lease: frozen fields, scope, timeout/grace, allowance and canonical dates validate", () => {
    validateLease(example);
    for (const bad of [{ ...example, apiKey: "no" }, { ...example, podId: "../foreign" }, { ...example, expectedName: "other" }, { ...example, disposableDataOnly: false },
      { ...example, maxRentalMicrousd: 8_000_001 }, { ...example, deadlineAt: "2026-10-27T00:00:00.000Z" }, { ...example, shutdownGraceMs: 10000 }]) assert.throws(() => validateLease(bad));
    assert.equal(shutdownAt(p()), Date.parse(p().createdAt) + 10000);
    const bounded = p({ quotedHourlyMicrousd: 3_600_000, nonComputeMicrousd: 0, maxRentalMicrousd: 15000 });
    assert.equal(shutdownAt(bounded), Date.parse(bounded.createdAt) + 5000);
  });
  await ok("RunPod adapter: sanitizes responses, rejects drift and never follows redirects with credentials", async () => {
    reset(); const snapshot = await client().get(current.podId); assert.equal(JSON.stringify(snapshot).includes("SYNTHETIC_PROVIDER_SECRET"), false);
    mode = "shape"; await assert.rejects(() => client().get(current.podId), (e: unknown) => e instanceof RentalError && e.code === "shape");
    mode = "redirect"; const before = captures; await assert.rejects(() => client().get(current.podId)); assert.equal(captures, before);
    assert.throws(() => new RunPodV2("key", 50, "https://arbitrary.invalid/v2")); await assert.rejects(() => client().get("../other"));
  });
  await ok("watchdog: deadline terminates only the scoped disposable Pod and verifies subsequent 404", async () => {
    reset(); const result = await run(); assert.equal(result.podAbsenceConfirmed, true); assert.equal(result.needsAttention, false); assert.equal(result.billReconciled, false); assert.equal(deletes, 1);
  });
  await ok("watchdog: late monitoring failure triggers fresh scoped cleanup and retains the attention state", async () => {
    reset("transient-monitor"); const result = await run(); assert.equal(result.podAbsenceConfirmed, true);
    assert.equal(result.needsAttention, true); assert.equal(result.reason, "read-failed"); assert.equal(deletes, 1);
  });
  await ok("watchdog: recovery never deletes when fresh identity no longer matches", async () => {
    reset("monitor-foreign"); const result = await run(); assert.equal(result.podAbsenceConfirmed, false);
    assert.equal(result.needsAttention, true); assert.equal(deletes, 0);
  });
  await ok("watchdog: exhausted monitoring recovery never deletes without a successful fresh read", async () => {
    reset("monitor-down"); const result = await run(); assert.equal(result.podAbsenceConfirmed, false);
    assert.equal(result.needsAttention, true); assert.equal(deletes, 0); assert.equal(gets, 2 + current.cleanupAttempts);
  });
  await ok("watchdog: projected allowance includes startup and early shutdown grace", async () => {
    reset("ok", p({ quotedHourlyMicrousd: 3_600_000, nonComputeMicrousd: 0, maxRentalMicrousd: 15000 }));
    const c = fakeClock(), result = await run({ clock: c }); assert.equal(result.podAbsenceConfirmed, true); assert.equal(c.now(), Date.parse(current.createdAt) + 5000);
  });
  await ok("watchdog: elapsed monotonic time prevents backwards wall-clock extension", async () => {
    reset(); const c = fakeClock(0, true), result = await run({ clock: c }); assert.equal(result.podAbsenceConfirmed, true); assert.ok(c.now() < Date.parse(current.createdAt)); assert.equal(deletes, 1);
  });
  await ok("watchdog: persisted elapsed time and fingerprint survive restart; concurrent locks fail closed", async () => {
    reset(); const stateFile = join(dir, `lease-${++sequence}.json`);
    writeFileSync(stateFile, JSON.stringify({ schema: 1, fingerprint: hash(current), maximumObservedAt: Date.parse(current.createdAt) + 15000, identityVerified: false, deleteAccepted: false, absenceConfirmed: false, needsAttention: false }));
    const c = fakeClock(), result = await watchRental(current, client(), stateFile, suite, { clock: c }); assert.equal(result.podAbsenceConfirmed, true); assert.equal(c.now(), Date.parse(current.createdAt));
    const priorReads = gets;
    assert.equal((await watchRental(current, client(), stateFile, suite, { clock: c })).podAbsenceConfirmed, true); assert.equal(gets, priorReads + 1);
    await assert.rejects(() => watchRental(p({ deadlineAt: "2026-10-26T00:00:21.000Z" }), client(), stateFile, suite, { clock: c }));
    const blocked = join(dir, `lease-${++sequence}.json`); writeFileSync(`${blocked}.lock`, "crash"); const before = gets;
    await assert.rejects(() => watchRental(current, client(), blocked, suite, { clock: c })); assert.equal(gets, before);
  });
  await ok("watchdog: changed identity, creation date, cluster and independent/unknown storage never authorize deletion", async () => {
    for (const m of ["foreign", "changed-date", "cluster", "network", "global", "unknown-mount", "changed-owner", "changed-storage", "locked"]) {
      reset(m); const result = await run(); assert.equal(result.needsAttention, true, m); assert.equal(result.podAbsenceConfirmed, false, m); assert.equal(deletes, 0, m);
    }
  });
  await ok("watchdog: auth errors, rate limits and initial 404 cannot be recorded as successful cleanup", async () => {
    for (const m of ["401", "403", "429", "missing"]) { reset(m); const result = await run(); assert.equal(result.needsAttention, true); assert.equal(result.podAbsenceConfirmed, false); assert.equal(deletes, 0); }
  });
  await ok("watchdog: accepted DELETE is not verified cleanup; retries and timeouts are bounded", async () => {
    for (const m of ["accepted-only", "timeout-delete", "delete-503"]) { reset(m); const result = await run(); assert.equal(result.needsAttention, true); assert.equal(result.podAbsenceConfirmed, false); assert.equal(deletes, 2); }
  });
  await ok("watchdog: price increase, completion, cancellation and a stopped Pod trigger owned-resource cleanup", async () => {
    reset("price"); assert.equal((await run()).reason, "price-increase");
    reset(); assert.equal((await run({ completed: () => true })).reason, "work-complete");
    reset(); const c = new AbortController(); c.abort(); assert.equal((await run({ signal: c.signal })).reason, "cancelled");
    reset("stopped"); assert.equal((await run()).podAbsenceConfirmed, true); assert.equal(deletes, 1);
  });
  await ok("watchdog: an armed journal failure still attempts safe cleanup and reports attention", async () => {
    reset(); const record = new TrialRecord(dir, "synthetic-journal-failure", "synthetic-command"), event = record.event.bind(record);
    record.event = (phase, details) => { if (phase === "watchdog-check") throw new Error("Synthetic disk error"); event(phase, details); };
    const result = await watchRental(current, client(), join(dir, `lease-${++sequence}.json`), record, { clock: fakeClock() });
    assert.equal(result.podAbsenceConfirmed, true); assert.equal(result.needsAttention, true); assert.equal(deletes, 1);
    record.finish("needs-attention", 0, { synthetic: true });
  });
  await ok("CLI documentation: previews and validation failures each create a terminal trial without account calls", () => {
    const initial = new Set(readdirSync(TRIAL_DIRECTORY));
    for (const name of ["rentalCli.ts", "cli.ts"]) for (const args of [[], ["--invalid-argument"]]) {
      const cli = join(REPOSITORY_ROOT, "apps/api/src/showcase", name);
      // Own the fixture's context instead of inheriting a developer's smaller native-model window.
      const result = spawnSync(process.execPath, ["--import", "tsx", cli, ...args], { cwd: join(REPOSITORY_ROOT, "apps/api"), encoding: "utf8",
        env: {...process.env, LOCAL_LLM_API:"ollama", LOCAL_LLM_NUM_CTX:"32768"} });
      assert.equal(result.status, args.length ? 1 : 0, result.stderr);
    }
    const added = readdirSync(TRIAL_DIRECTORY).filter(f => f.endsWith(".json") && !initial.has(f));
    // Other documented work can create a UUID while these four child CLIs run.
    const records = added.map(f => JSON.parse(readFileSync(join(TRIAL_DIRECTORY, f), "utf8")))
      .filter(r => r.purpose === "rental-watchdog" || r.purpose === "showcase-evaluation");
    assert.equal(records.length, 4);
    assert.deepEqual(new Set(records.map(r => r.status)), new Set(["completed", "failed"])); assert.ok(records.every(r => r.paidComputeUsd === 0));
  });
  await ok("trial metadata: no provider credentials/env bodies or unrelated resource endpoints are retained", () => {
    const text = readFileSync(suite.filename, "utf8"); for (const secret of ["SYNTHETIC_RENTAL_KEY", "SYNTHETIC_PROVIDER_SECRET"]) assert.equal(text.includes(secret), false);
    assert.ok(commands.every(c => c.startsWith(`GET /v2/pods/${example.podId}`) || c.startsWith(`DELETE /v2/pods/${example.podId}`)));
  });
  passed = true;
  const proof = join(REPOSITORY_ROOT, "output/proof"); mkdirSync(proof, { recursive: true });
  writeFileSync(join(proof, "p4-rental-watchdog-proof.json"), JSON.stringify({ synthetic: true, localhostOnly: true, checks, realAccountCalls: 0, paidComputeUsd: 0,
    trialRecord: suite.filename, limits: ["No Pod created or real resource terminated", "No actual quote, provider conformance, bill reconciliation or crash-independent supervisor"] }, null, 2) + "\n");
  console.log(`rental: ${checks} checks passed; real account calls 0; paid compute USD 0`);
} finally {
  suite.finish(passed ? "completed" : "failed", 0, { checks, realAccountCalls: 0, fixtureRequests: commands.length });
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
}
