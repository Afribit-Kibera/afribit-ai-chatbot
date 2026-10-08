import { createHash, randomInt } from "node:crypto";

/**
 * Invitation codes and the sign-up setting (docs/features/F-012-invitation-only-accounts.md). Pure
 * functions; the store and routes use them and invitationCases.ts tests them.
 */
export type RegistrationMode = "invite" | "closed" | "open";

export function parseRegistration(raw: string | undefined): RegistrationMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "" || v === "invite") return "invite";
  if (v === "closed" || v === "open") return v;
  throw new Error(`REGISTRATION must be "invite", "closed" or "open" (got "${raw}")`);
}

export const INVITE_ROLES = ["contributor", "reviewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];
export const DEFAULT_INVITE_DAYS = 7;
export const MAX_INVITE_DAYS = 90;

// No 0/O, 1/I/L, so a code read aloud or copied by hand survives.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A code like AFB-7K4M-Q9TX (31^8, about 2^39.6), easy to read out and type on a phone. */
export function generateCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `AFB-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/** Case, spaces and dashes do not matter when someone types a code. */
export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Only this is stored; the code itself is shown once, when it is created. */
export function hashCode(code: string): string {
  return createHash("sha256").update(normaliseCode(code)).digest("hex");
}

export function parseInviteInput(body: unknown): { ok: true; role: InviteRole; note: string | null; days: number } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  if (!(INVITE_ROLES as readonly unknown[]).includes(b.role)) return { ok: false, error: 'role must be "contributor" or "reviewer" (administrators are made in the Team list, never by invitation)' };
  const days = b.days === undefined ? DEFAULT_INVITE_DAYS : Number(b.days);
  if (!Number.isInteger(days) || days < 1 || days > MAX_INVITE_DAYS) return { ok: false, error: `days must be a whole number from 1 to ${MAX_INVITE_DAYS}` };
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 200) : null;
  return { ok: true, role: b.role as InviteRole, note, days };
}
