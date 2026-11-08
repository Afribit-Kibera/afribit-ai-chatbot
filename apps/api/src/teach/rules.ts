/**
 * "Say it your way" rules (docs/features/F-003-say-it-your-way.md). Pure functions; the store and the
 * routes use them, and teachCases.ts tests them.
 */
export const MIN_SUGGESTION = 3;
export const MAX_SUGGESTION = 1000;
export const MAX_SHARED_TEXT = 4000;
export const PER_CONVERSATION_PER_DAY = 3;
export const REASONS = ["too_formal", "wrong_words", "wrong_facts", "other"] as const;
export type Reason = (typeof REASONS)[number];
export const DECISIONS = ["approve", "reject", "card_fix"] as const;
export type Decision = (typeof DECISIONS)[number];

export interface Consent {
  answers: boolean;
  testing: boolean;
  training: boolean;
}

export interface SuggestionInput {
  sessionId: string | null;
  messageId: string | null;
  questionText: string | null;
  answerText: string | null;
  suggestion: string;
  languageMode: string;
  reason: Reason | null;
  consent: Consent;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Validates the request body. Language mode is checked against the pack by the route. */
export function parseSuggestion(body: unknown): { ok: true; value: SuggestionInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "A suggestion is required" };
  const b = body as Record<string, unknown>;
  const suggestion = typeof b.suggestion === "string" ? b.suggestion.trim() : "";
  if (suggestion.length < MIN_SUGGESTION) return { ok: false, error: `Write at least ${MIN_SUGGESTION} characters` };
  if (suggestion.length > MAX_SUGGESTION) return { ok: false, error: `A suggestion can be at most ${MAX_SUGGESTION} characters` };
  if (typeof b.languageMode !== "string" || !b.languageMode) return { ok: false, error: "languageMode is required" };
  const reason = b.reason === undefined || b.reason === null || b.reason === "" ? null : (REASONS as readonly unknown[]).includes(b.reason) ? (b.reason as Reason) : undefined;
  if (reason === undefined) return { ok: false, error: `reason must be one of ${REASONS.join(", ")}` };
  const c = (b.consent && typeof b.consent === "object" ? b.consent : {}) as Record<string, unknown>;
  return {
    ok: true,
    value: {
      sessionId: typeof b.sessionId === "string" && UUID.test(b.sessionId) ? b.sessionId : null,
      messageId: typeof b.messageId === "string" && UUID.test(b.messageId) ? b.messageId : null,
      questionText: text(b.questionText, MAX_SHARED_TEXT),
      answerText: text(b.answerText, MAX_SHARED_TEXT),
      suggestion,
      languageMode: b.languageMode,
      reason,
      // A missing consent is "no": nothing is ever usable by default on the server side.
      consent: { answers: c.answers === true, testing: c.testing === true, training: c.training === true },
    },
  };
}

/**
 * Seed phrases, keys, scams and sending money: a suggestion that touches these needs a second reviewer.
 * Deliberately broad (English, Kiswahili, Sheng): a false positive only means one more pair of eyes.
 */
const SAFETY_TERMS = /\b(seed|phrase|recovery|private\s*key|pin|password|nywila|siri|scam|tapeli|utapeli|mtapeli|support|invest|investment|double|guarantee|faida|withdraw|send\s+money|agent)\b/i;
// Sending money in Kiswahili/Sheng takes verb prefixes (usitume, nimetuma, kutuma), so no leading word boundary.
const SEND_MONEY = /tum[a-z]*\s+(pesa|doo|ganji|mbesha|sats|bitcoin)\b/i;
export function isSafetyTopic(...texts: (string | null)[]): boolean {
  return texts.some((t) => !!t && (SAFETY_TERMS.test(t) || SEND_MONEY.test(t)));
}

/** The use flags an approved suggestion gets: the member's consent AND the reviewer's approval. */
export function entryFlags(consent: Consent): { allowed_for_rag: boolean; allowed_for_evaluation: boolean; allowed_for_training: boolean } {
  return { allowed_for_rag: consent.answers, allowed_for_evaluation: consent.testing, allowed_for_training: consent.training };
}

export type Outcome =
  | { kind: "first_approval" }
  | { kind: "approved" }
  | { kind: "rejected" }
  | { kind: "card_fix" }
  | { kind: "refused"; status: number; error: string };

/** What a reviewer's decision does to a suggestion. */
export function decide(input: {
  status: string;
  safetyTopic: boolean;
  createdBy: string | null;
  firstApprovalBy: string | null;
  actor: string;
  decision: Decision;
}): Outcome {
  if (input.status !== "pending") return { kind: "refused", status: 409, error: "This suggestion has already been decided" };
  if (input.createdBy && input.createdBy === input.actor) return { kind: "refused", status: 409, error: "Someone else must review your own suggestion" };
  if (input.decision === "reject") return { kind: "rejected" };
  if (input.decision === "card_fix") return { kind: "card_fix" };
  if (!input.safetyTopic) return { kind: "approved" };
  if (!input.firstApprovalBy) return { kind: "first_approval" };
  if (input.firstApprovalBy === input.actor) return { kind: "refused", status: 409, error: "A second reviewer must approve a suggestion about safety" };
  return { kind: "approved" };
}
