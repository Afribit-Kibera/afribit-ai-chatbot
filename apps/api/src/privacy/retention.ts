/**
 * How long chat text is kept (docs/features/F-002-privacy-settings.md). Set once per server with
 * CHAT_RETENTION: "none" (no message text is ever written), "<N>d" (text is emptied after N days), or
 * "keep". Agreed defaults (8 Oct 2026): 30 days for the cloud demo and Afribit Local; "none" on the pilot
 * node (set in deploy/community-node/.env.example).
 */
export type Retention = { mode: "none" } | { mode: "days"; days: number } | { mode: "keep" };

export const DEFAULT_RETENTION = "30d";
/** Text a learner attached to a report is cleared this many days after the report is resolved. */
export const REPORT_TEXT_DAYS_AFTER_RESOLUTION = 30;

export function parseRetention(raw: string | undefined): Retention {
  const v = (raw ?? DEFAULT_RETENTION).trim().toLowerCase();
  if (v === "none") return { mode: "none" };
  if (v === "keep") return { mode: "keep" };
  const m = /^(\d{1,4})d$/.exec(v);
  if (m) {
    const days = Number(m[1]);
    if (days >= 1 && days <= 3650) return { mode: "days", days };
  }
  throw new Error(`CHAT_RETENTION must be "none", "keep" or a number of days such as "30d" (got "${raw}")`);
}

/** What GET /api/v1/pack publishes, so the app can say it. */
export function publicRetention(r: Retention): { mode: Retention["mode"]; days: number | null } {
  return { mode: r.mode, days: r.mode === "days" ? r.days : null };
}

/** The text actually written for a message: nothing at all when the server keeps no chats. */
export function storedContent(content: string, r: Retention): string {
  return r.mode === "none" ? "" : content;
}
