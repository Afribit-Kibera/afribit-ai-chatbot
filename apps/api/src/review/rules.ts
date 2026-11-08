/**
 * The review workflow for knowledge cards, as plain rules with no database in them, so they can be
 * tested and read on their own. A card only ever answers a learner when it is approved or published
 * (the retrieval query enforces this); everything here is about how it gets there.
 *
 *   draft -> needs_factual_review -> needs_language_review -> approved -> published
 *
 * Any edit to the words of a live card sends it back to needs_factual_review: an approval is an
 * approval of specific words, not of the card's id.
 */

export const STATUSES = ["draft", "needs_factual_review", "needs_language_review", "approved", "published", "deprecated", "archived"] as const;
export type CardStatus = (typeof STATUSES)[number];

const TRANSITIONS: Record<CardStatus, CardStatus[]> = {
  draft: ["needs_factual_review", "archived"],
  needs_factual_review: ["needs_language_review", "draft", "archived"],
  needs_language_review: ["approved", "needs_factual_review", "draft"],
  approved: ["published", "needs_language_review", "deprecated"],
  published: ["deprecated", "needs_factual_review"],
  deprecated: ["draft", "archived"],
  archived: ["draft"],
};

export function isStatus(value: unknown): value is CardStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function allowedTransitions(from: CardStatus): CardStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: CardStatus, to: CardStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuses a learner can be answered from. */
export function isLive(status: CardStatus): boolean {
  return status === "approved" || status === "published";
}

/** Moving a card into a live status is the step that needs a second pair of eyes. */
export function needsIndependentReviewer(to: CardStatus): boolean {
  return isLive(to);
}

/**
 * May `actor` take a card into `to`, given who last changed its words? With the two-person rule on, the
 * person who wrote or last edited a card cannot be the one to make it live. `lastEditor` is null for
 * cards that predate the review log, which are never blocked.
 */
export function mayMakeLive(opts: { to: CardStatus; actor: string; lastEditor: string | null; twoPerson: boolean }): boolean {
  if (!opts.twoPerson || !needsIndependentReviewer(opts.to)) return true;
  return opts.lastEditor === null || opts.lastEditor !== opts.actor;
}

/** Status after the words of a card are edited. */
export function statusAfterEdit(current: CardStatus): CardStatus {
  return isLive(current) ? "needs_factual_review" : current;
}

/** Make a short id fragment from a title: "How long can I keep a book?" -> "how_long_can_i_keep_a_book". */
export function slug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base.slice(0, 48) || "card";
}
