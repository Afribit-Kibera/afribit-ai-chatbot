import assert from "node:assert/strict";
import { replaceTrialFile, TrialRecord, TRIAL_DIRECTORY } from "./trials.js";
const trial = new TrialRecord(TRIAL_DIRECTORY, "trial-journal-replacement-fixtures", "pnpm --filter @afribit/api test:trial-persistence");
try {
  let calls = 0; const waits: number[] = [], paths: string[][] = [];
  replaceTrialFile("new.tmp", "old.json", { platform: "win32", wait: ms => waits.push(ms), rename: (a, b) => {
    calls++; paths.push([String(a), String(b)]);
    if (calls < 3) throw Object.assign(new Error("synthetic lock"), { code: calls === 1 ? "EPERM" : "EACCES" });
  } });
  assert.equal(calls, 3); assert.deepEqual(waits, [20, 40]); assert.deepEqual(paths, Array(3).fill(["new.tmp", "old.json"]));
  trial.event("case-passed", { name: "transient Windows locks retry the same replacement without deleting files" });
  calls = 0; waits.length = 0;
  const lock = Object.assign(new Error("synthetic persistent lock"), { code: "EBUSY" });
  assert.throws(() => replaceTrialFile("new.tmp", "old.json", { platform: "win32", wait: ms => waits.push(ms), rename: () => { calls++; throw lock; } }), error => error === lock);
  assert.equal(calls, 5); assert.deepEqual(waits, [20, 40, 80, 160]);
  trial.event("case-passed", { name: "persistent Windows locks fail after 300ms of bounded backoff" });
  for (const [platform, code] of [["linux", "EPERM"], ["win32", "ENOENT"]] as const) {
    calls = 0;
    assert.throws(() => replaceTrialFile("new.tmp", "old.json", { platform, wait: () => assert.fail("No retry"), rename: () => { calls++; throw Object.assign(new Error("synthetic"), { code }); } }));
    assert.equal(calls, 1);
  }
  trial.event("case-passed", { name: "non-Windows errors and non-lock failures propagate immediately" });
  calls = 0;
  replaceTrialFile("new.tmp", "old.json", { platform: "win32", rename: () => { calls++; }, wait: () => assert.fail("No wait") });
  assert.equal(calls, 1); trial.event("case-passed", { name: "successful first replacement never waits" });
  trial.finish("completed", 0, { checks: 4, providerCalls: 0 }); console.log(JSON.stringify({ trial: trial.id, checks: 4, providerCalls: 0, paidComputeUsd: 0 }));
} catch { trial.finish("failed", 0, { reason: "trial-persistence-fixtures-failed", providerCalls: 0 }); process.exitCode = 1; }
