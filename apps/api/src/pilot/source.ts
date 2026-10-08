/**
 * The channel label on a learner link (https://<service>/app?ref=kibera-hub).
 *
 * `source` says where a link was shared (a hub, a class, a poster), never who the learner is. It is a
 * short lowercase slug, checked here and again by a database constraint (migration 015). Anything else is
 * ignored, not rejected: a bad label must never stop a learner asking a question.
 */
export const SOURCE_SLUG = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** The slug if `value` is a valid channel label, else null. */
export function parseSource(value: unknown): string | null {
  return typeof value === "string" && SOURCE_SLUG.test(value) ? value : null;
}

/** In stats queries, this value selects conversations that came without a channel label. */
export const NO_SOURCE = "_none";

/** A `source` filter for the pilot console: a slug, or NO_SOURCE. Anything else is an error (null). */
export function parseSourceFilter(value: unknown): string | null {
  return value === NO_SOURCE ? NO_SOURCE : parseSource(value);
}
