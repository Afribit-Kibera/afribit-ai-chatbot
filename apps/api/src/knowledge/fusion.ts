/**
 * Rank fusion for hybrid retrieval.
 *
 * Full-text search and embedding search produce scores on incompatible scales
 * (Postgres ts_rank is unbounded and arbitrary; cosine similarity is 0-1).
 * Merging them by "keep whichever raw number is bigger" -- what this module
 * replaced -- let full-text scores swamp the semantic ones: on our 40-question
 * benchmark the merged result was indistinguishable from full-text search alone
 * and found the right card in the top 3 for 15 of 40 questions, while semantic
 * search alone found it for 35 of 40.
 *
 * Reciprocal Rank Fusion uses only each list's ranks, so scale never matters:
 *   score(card) = sum over lists of  weight / (k + rank)
 * Semantic search is the primary signal; full-text search is a low-weight
 * tie-breaker and the whole result when embeddings are unavailable (for
 * example a community node running with no cloud calls).
 *
 * Measured on the benchmark (docs/evaluation/methodology.md): weights 0.1 : 1
 * gave the right card in the top 3 for 33 of 40 raw questions and 40 of 40
 * when the question had first been rewritten by the waiter.
 */

export interface RankedRow {
  id: string;
  /** The retriever's own score (ts_rank, or cosine similarity). Not comparable across lists. */
  score: number;
}

export const RRF_K = 60;
export const LEXICAL_WEIGHT = 0.1;
export const SEMANTIC_WEIGHT = 1;

/** How many candidates each retriever contributes. Fixed, so results do not depend on how many cards the caller wants. */
export const CANDIDATE_POOL = 30;

export interface FusedRow<T extends RankedRow> {
  row: T;
  /** Fused rank score (higher is better). */
  fusedScore: number;
  /** Cosine similarity if the card appeared in the semantic list, else null. */
  semanticScore: number | null;
  /** The larger of the card's raw scores across lists. Kept only so the legacy `confidence` value is unchanged. */
  bestRawScore: number;
}

/**
 * Both lists must already be ordered best-first. Returns every card that appears
 * in either list, best-first, with ties broken by semantic score then id so the
 * order is deterministic.
 */
export function fuseRankings<T extends RankedRow>(
  lexical: readonly T[],
  semantic: readonly T[],
  weights: { lexical?: number; semantic?: number; k?: number } = {},
): FusedRow<T>[] {
  const wl = weights.lexical ?? LEXICAL_WEIGHT;
  const ws = weights.semantic ?? SEMANTIC_WEIGHT;
  const k = weights.k ?? RRF_K;

  const byId = new Map<string, FusedRow<T>>();
  const add = (rows: readonly T[], weight: number, isSemantic: boolean) => {
    rows.forEach((row, i) => {
      const entry = byId.get(row.id) ?? { row, fusedScore: 0, semanticScore: null, bestRawScore: Number(row.score) };
      entry.bestRawScore = Math.max(entry.bestRawScore, Number(row.score));
      entry.fusedScore += weight / (k + i + 1);
      if (isSemantic) entry.semanticScore = Number(row.score);
      byId.set(row.id, entry);
    });
  };
  add(lexical, wl, false);
  add(semantic, ws, true);

  return [...byId.values()].sort(
    (a, b) =>
      b.fusedScore - a.fusedScore ||
      (b.semanticScore ?? -1) - (a.semanticScore ?? -1) ||
      a.row.id.localeCompare(b.row.id),
  );
}
