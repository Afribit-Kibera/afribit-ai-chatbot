import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { ComputeAccounting } from "../compute/admission.js";
import type { ComputeRoute } from "../compute/policy.js";

interface Attempt {
  id: string;
  reservedMicrousd: number;
  status: "reserved" | "completed" | "failed" | "cancelled" | "overrun";
  reportedMicrousd: number | null;
}
interface State {
  schema: 1;
  fingerprint: string;
  budgetMicrousd: number;
  heldAsideMicrousd: number;
  externalChargesMicrousd: number;
  maxAttempts: number;
  stopped: boolean;
  attempts: Attempt[];
}
export interface Envelope {
  fingerprint: string;
  budgetMicrousd: number;
  heldAsideMicrousd: number;
  externalChargesMicrousd: number;
  maxAttempts: number;
}

/** Exclusive lock spans the whole experiment; persisted reservations are never automatically refunded. */
export class ExperimentLedger implements ComputeAccounting {
  private closed = false;
  private storageUncertain = false;
  private state: State;
  private active = new Set<string>();
  private onDrained: (() => void) | null = null;
  private constructor(private readonly filename: string, private readonly lock: number, private readonly envelope: Envelope) {
    const { fingerprint, budgetMicrousd, heldAsideMicrousd, externalChargesMicrousd, maxAttempts } = envelope;
    const identity = { fingerprint, budgetMicrousd, heldAsideMicrousd, externalChargesMicrousd, maxAttempts };
    if (existsSync(filename)) {
      const value = JSON.parse(readFileSync(filename, "utf8")) as State;
      if (value.schema !== 1 || value.fingerprint !== identity.fingerprint || value.budgetMicrousd !== identity.budgetMicrousd
        || value.heldAsideMicrousd !== identity.heldAsideMicrousd || value.externalChargesMicrousd !== identity.externalChargesMicrousd
        || value.maxAttempts !== identity.maxAttempts
        || typeof value.stopped !== "boolean" || !Array.isArray(value.attempts)
        || value.attempts.some(a => typeof a.id !== "string" || !Number.isSafeInteger(a.reservedMicrousd) || a.reservedMicrousd < 0
          || !["reserved", "completed", "failed", "cancelled", "overrun"].includes(a.status)
          || (a.reportedMicrousd !== null && (!Number.isSafeInteger(a.reportedMicrousd) || a.reportedMicrousd < 0))))
        throw new Error("Experiment ledger is invalid or belongs to a different frozen plan");
      this.state = value;
    } else {
      this.state = { schema: 1, ...identity, stopped: false, attempts: [] };
      this.persist();
    }
  }
  static open(filename: string, envelope: Envelope): ExperimentLedger {
    if (!/^[a-f0-9]{64}$/.test(envelope.fingerprint) || !Number.isSafeInteger(envelope.budgetMicrousd) || envelope.budgetMicrousd < 2_000_000 || envelope.budgetMicrousd > 10_000_000
      || !Number.isSafeInteger(envelope.heldAsideMicrousd) || envelope.heldAsideMicrousd < 2_000_000
      || !Number.isSafeInteger(envelope.externalChargesMicrousd) || envelope.externalChargesMicrousd < 0
      || envelope.heldAsideMicrousd + envelope.externalChargesMicrousd > envelope.budgetMicrousd
      || !Number.isSafeInteger(envelope.maxAttempts) || envelope.maxAttempts < 1 || envelope.maxAttempts > 192)
      throw new Error("Invalid first-showcase budget envelope");
    const fd = openSync(`${filename}.lock`, "wx", 0o600);
    try { return new ExperimentLedger(filename, fd, envelope); }
    catch (error) { closeSync(fd); unlinkSync(`${filename}.lock`); throw error; }
  }
  private persist() {
    if (this.closed) throw new Error("Experiment ledger is closed");
    const tmp = `${this.filename}.${randomUUID()}.tmp`;
    const fd = openSync(tmp, "wx", 0o600);
    try { writeFileSync(fd, JSON.stringify(this.state, null, 2) + "\n"); fsyncSync(fd); }
    finally { closeSync(fd); }
    renameSync(tmp, this.filename);
  }
  snapshot() { return structuredClone(this.state); }
  async reserve(route: ComputeRoute): Promise<string> {
    const spent = this.state.attempts.reduce((sum, a) => sum + a.reservedMicrousd, this.state.externalChargesMicrousd + this.state.heldAsideMicrousd);
    if (this.state.stopped || this.state.attempts.length >= this.envelope.maxAttempts || spent + route.reservationMicrousd > this.state.budgetMicrousd)
      throw new Error("Experiment allowance exhausted or stopped");
    const id = randomUUID();
    this.state.attempts.push({ id, reservedMicrousd: route.reservationMicrousd, status: "reserved", reportedMicrousd: null });
    // Synchronous durability before returning a permit also serializes concurrent calls in this process.
    try { this.persist(); } catch (error) { this.state.stopped = true; this.storageUncertain = true; throw error; }
    this.active.add(id);
    return id;
  }
  async finish(id: string, status: "completed" | "failed" | "cancelled", cost: number | null) {
    const attempt = this.state.attempts.find(a => a.id === id);
    if (!attempt || attempt.status !== "reserved") return;
    const micros = cost !== null && Number.isFinite(cost) && cost >= 0 ? Math.ceil(cost * 1_000_000) : null;
    const overrun = micros !== null && (!Number.isSafeInteger(micros) || micros > attempt.reservedMicrousd);
    attempt.reportedMicrousd = micros !== null && Number.isSafeInteger(micros) ? micros : null;
    attempt.status = overrun ? "overrun" : status;
    if (overrun) this.state.stopped = true;
    try { this.persist(); } catch (error) { this.state.stopped = true; this.storageUncertain = true; throw error; }
    finally { this.active.delete(id); if (!this.active.size) this.onDrained?.(); }
  }
  /** Gateway abort cleanup can settle after its outer generator ends. Keep ownership until it does. */
  async drain(timeoutMs = 2000) {
    if (!this.active.size) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.state.stopped = true;
        try { this.persist(); } catch { this.storageUncertain = true; }
        this.onDrained = null;
        reject(new Error("Provider settlement did not drain; experiment lock retained for inspection"));
      }, timeoutMs);
      this.onDrained = () => { clearTimeout(timer); this.onDrained = null; resolve(); };
    });
  }
  close() {
    if (this.storageUncertain) throw new Error("Cannot release an experiment with uncertain persisted accounting");
    if (this.active.size) throw new Error("Cannot release an experiment with outstanding settlements");
    if (!this.closed) { this.closed = true; closeSync(this.lock); unlinkSync(`${this.filename}.lock`); }
  }
}
