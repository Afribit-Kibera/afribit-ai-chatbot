import { closeSync, fsyncSync, mkdirSync, openSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const TRIAL_DIRECTORY = fileURLToPath(new URL("../../../../output/trials/", import.meta.url));
type Details = Record<string, string | number | boolean | null>;
/** Windows readers/virus scanners can briefly deny replacement. Never delete the old journal. */
export function replaceTrialFile(temporary: string, destination: string, options: {
  platform?: NodeJS.Platform; rename?: typeof renameSync; wait?: (ms: number) => void;
} = {}) {
  const rename = options.rename ?? renameSync, platform = options.platform ?? process.platform;
  const wait = options.wait ?? ((ms: number) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); });
  for (let attempt = 0; ; attempt++) {
    try { rename(temporary, destination); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(code ?? "") || attempt >= 4) throw error;
      wait(20 * 2 ** attempt);
    }
  }
}
export type TrialStatus = "completed" | "failed" | "cancelled" | "needs-attention";
export class TrialRecord {
  readonly id = randomUUID();
  readonly filename: string;
  private value: {
    schema: 1; id: string; purpose: string; command: string; startedAt: string; finishedAt: string | null;
    status: "started" | TrialStatus; paidComputeUsd: number | null;
    events: { at: string; phase: string; details: Details }[];
  };
  constructor(directory: string, purpose: string, command: string) {
    mkdirSync(directory, { recursive: true });
    this.filename = join(directory, `${this.id}.json`);
    this.value = { schema: 1, id: this.id, purpose, command, startedAt: new Date().toISOString(), finishedAt: null,
      status: "started", paidComputeUsd: null, events: [] };
    this.persist();
  }
  event(phase: string, details: Details = {}) {
    if (this.value.status !== "started") throw new Error("Trial is already finished");
    if (!/^[a-z0-9-]{1,60}$/.test(phase) || Object.values(details).some(v => !["string", "number", "boolean"].includes(typeof v) && v !== null)) throw new Error("Invalid trial event");
    this.value.events.push({ at: new Date().toISOString(), phase, details });
    this.persist();
  }
  finish(status: TrialStatus, paidComputeUsd: number | null, details: Details = {}) {
    if (paidComputeUsd !== null && (!Number.isFinite(paidComputeUsd) || paidComputeUsd < 0)) throw new Error("Unknown cost must remain null");
    this.event("result", details);
    this.value.status = status; this.value.paidComputeUsd = paidComputeUsd; this.value.finishedAt = new Date().toISOString();
    this.persist();
  }
  private persist() {
    const tmp = `${this.filename}.${randomUUID()}.tmp`, fd = openSync(tmp, "wx", 0o600);
    try { writeFileSync(fd, JSON.stringify(this.value, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
    replaceTrialFile(tmp, this.filename);
  }
}
