import { pool } from "../db/pool.js";
import { mentionsSecretTerms } from "../safety/secretDetector.js";
import type { CandidateExample } from "./schemas.js";

export interface QualityCheckResult {
  accepted: boolean;
  reason?: string;
}

/**
 * Deterministic checks run before anything reaches human review (Architecture
 * doc §17). Cheap and synchronous — no LLM critic call here; that's a
 * separate, selectively-sampled pass (doc §10), not implemented in this
 * first pass of the Dataset Lab.
 */
export async function runQualityChecks(candidate: CandidateExample): Promise<QualityCheckResult> {
  const text = candidate.text.trim();

  if (text.length === 0) return { accepted: false, reason: "empty" };
  if (text.length > 400) return { accepted: false, reason: "too_long" };

  // Forbidden content (doc §17): reject candidates that mention seed phrases,
  // keys, PINs or passwords at all. This is intentionally the loose keyword
  // match, NOT the live-chat detector -- live chat must answer questions about
  // these topics, while the corpus policy here predates that fix and is a
  // separate decision (see secretDetector.ts).
  if (mentionsSecretTerms(text)) return { accepted: false, reason: "forbidden_content:secret_term" };

  // Exact duplicate against anything already in the corpus (doc §17).
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM language_entries WHERE lower(utterance) = lower($1) LIMIT 1`,
    [text],
  );
  if (rows.length > 0) return { accepted: false, reason: "duplicate" };

  return { accepted: true };
}

/**
 * Canonical-term preservation (doc §17): if the canonical fact contains a
 * load-bearing number (e.g. "100,000,000"), reject candidates that changed
 * it. Deliberately narrow — only checks numbers that appear in the fact,
 * doesn't try to parse arbitrary factual claims.
 */
export function preservesCanonicalNumbers(canonicalFact: string, candidateText: string): boolean {
  const numbers = canonicalFact.match(/\d[\d,]*\d|\d/g) ?? [];
  const significant = numbers.filter((n) => n.replace(/,/g, "").length >= 3); // skip small incidental numbers
  return significant.every((n) => candidateText.includes(n) || candidateText.includes(n.replace(/,/g, "")));
}
