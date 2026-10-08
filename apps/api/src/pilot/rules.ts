import type { DailyRow } from "./stats.js";

/**
 * The pilot console's rules, with no database and no Fastify so they are unit-tested directly
 * (pilotCases.ts): the small-count rule for the shared export, a short-lived cache, the answer-queue
 * resolutions, and the safeguards on changing a team member's role.
 */

// ── Small-count rule ────────────────────────────────────────────────────────────────────────────
/**
 * In the shareable export, any count below this is left blank, so a very small group (one learner at
 * one hub on one day) cannot be picked out of a table. Zero counts too: "nobody rated anything" for a
 * three-person group is as revealing as "one person did".
 */
export const MIN_CELL = 5;

/** The cell as it appears in the export: the number, or "" when it is under the threshold. */
export function suppressSmall(value: number, min = MIN_CELL): string {
  return Number.isFinite(value) && value >= min ? String(Math.round(value)) : "";
}

export const CSV_HEADER = ["date", "source", "sessions", "questions", "helpful", "not_helpful", "fallbacks", "safety_events"] as const;

/**
 * The daily-aggregates CSV: dates, channel labels and counts only. Cells under MIN_CELL are blank, and a
 * row with nothing left to show is dropped. Never contains any question or answer text.
 */
export function dailyCsv(rows: DailyRow[], min = MIN_CELL): string {
  const lines: string[] = [CSV_HEADER.join(",")];
  for (const r of rows) {
    const cells = [r.sessions, r.questions, r.helpful, r.notHelpful, r.fallbacks, r.safetyEvents].map((v) => suppressSmall(v, min));
    if (cells.every((c) => c === "")) continue;
    // Channel labels are validated slugs (or "direct"), so no quoting is ever needed; guard anyway.
    const source = /^[a-z0-9-]+$/.test(r.source) ? r.source : "other";
    lines.push([r.day, source, ...cells].join(","));
  }
  return lines.join("\n") + "\n";
}

// ── Cache ───────────────────────────────────────────────────────────────────────────────────────
/** A tiny time-limited cache, so a dashboard refreshing every minute cannot hammer the database. */
export class TtlCache<T> {
  private readonly items = new Map<string, { at: number; value: T }>();
  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxItems = 200,
  ) {}

  get(key: string): T | undefined {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (this.now() - hit.at >= this.ttlMs) {
      this.items.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.items.size >= this.maxItems) this.items.delete(this.items.keys().next().value as string);
    this.items.set(key, { at: this.now(), value });
  }

  clear(): void {
    this.items.clear();
  }
}

// ── Query parameters ────────────────────────────────────────────────────────────────────────────
/** `days` from a query string: a whole number of 1..max, default `fallback`. Null when it is present but invalid. */
export function parseWhole(value: unknown, fallback: number, max = 365): number | null {
  if (value === undefined || value === "") return fallback;
  const n = typeof value === "string" && /^\d{1,4}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

// ── Answer review queue ─────────────────────────────────────────────────────────────────────────
export const RESOLUTIONS = ["answer_ok", "card_fixed", "new_card_needed", "wrong_report", "language_fix", "other"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export const MAX_NOTE = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export type ResolveCheck = { ok: true; resolution: Resolution; note: string | null } | { ok: false; error: string };

/** The body of POST /api/v1/pilot/queue/:feedbackId/resolve. */
export function checkResolve(body: unknown): ResolveCheck {
  const b = (body ?? {}) as { resolution?: unknown; note?: unknown };
  if (typeof b.resolution !== "string" || !(RESOLUTIONS as readonly string[]).includes(b.resolution)) {
    return { ok: false, error: `resolution must be one of: ${RESOLUTIONS.join(", ")}` };
  }
  if (b.note !== undefined && b.note !== null && typeof b.note !== "string") return { ok: false, error: "note must be text" };
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (note.length > MAX_NOTE) return { ok: false, error: `note must be at most ${MAX_NOTE} characters` };
  return { ok: true, resolution: b.resolution as Resolution, note: note || null };
}

// ── Team roles ──────────────────────────────────────────────────────────────────────────────────
export const ROLES = ["contributor", "reviewer", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export type RoleChange = { ok: true; unchanged: boolean } | { ok: false; status: 400 | 409; error: string };

/**
 * May `target` be given `newRole`? The one hard rule: the service must never be left without an admin,
 * because nobody could then promote anyone without database access. That covers demoting yourself.
 * `adminCount` is the number of admins right now, counted inside the same transaction as the change.
 */
export function checkRoleChange(input: { actorId: string; target: { id: string; role: Role }; newRole: unknown; adminCount: number }): RoleChange {
  if (!isRole(input.newRole)) return { ok: false, status: 400, error: `role must be one of: ${ROLES.join(", ")}` };
  if (input.target.role === input.newRole) return { ok: true, unchanged: true };
  if (input.target.role === "admin" && input.newRole !== "admin" && input.adminCount <= 1) {
    const self = input.actorId === input.target.id;
    return {
      ok: false,
      status: 409,
      error: self ? "You are the last admin, so you cannot change your own role. Make someone else an admin first." : "This is the last admin; someone else must be made an admin first.",
    };
  }
  return { ok: true, unchanged: false };
}
