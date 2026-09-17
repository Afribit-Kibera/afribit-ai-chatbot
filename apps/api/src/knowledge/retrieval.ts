import type { RetrievalResult } from "@afribit/shared";
import { pool } from "../db/pool.js";

interface KnowledgeRow {
  id: string;
  canonical_answer: string;
  beginner_answer: string;
  safety_notes: string[];
  version: number;
  updated_at: string;
  rank: number;
}

/**
 * PRD §18 — hybrid retrieval. This MVP implements the lexical half only
 * (Postgres full-text search over approved/published entries). The
 * semantic/vector half (pgvector cosine search over knowledge_embeddings,
 * PRD §18.3/§18.4) needs an embedding provider wired in before Phase 2 —
 * intentionally deferred rather than half-built here.
 *
 * Only 'approved' and 'published' knowledge is ever eligible (PRD §11.3).
 */

/**
 * Stopgap for the lexical-only limitation above: a small set of common
 * Sheng/Swahili terms that don't share a root with their English
 * equivalent in the knowledge base, so the OR-query would otherwise
 * silently miss the right entry no matter how directly on-topic the
 * question is. Confirmed causing real production misses (see
 * docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md, Batch 003 update):
 * "Nikipoteza simu yangu, Bitcoin zangu zitapotea pia?" never found
 * btc.safety.backup_basics (leading the model to a false blanket "your
 * funds won't be lost" reassurance instead of the seed-phrase-backup
 * caveat), and "Mbona Lightning payment yangu imefail?" never found
 * btc.lightning.payment_failure. Not a substitute for real semantic
 * search (PRD §18.3/§18.4, still deferred) -- just closes the specific,
 * observed gaps until that lands. Expand this list as new misses like
 * these two are found; don't try to guess exhaustive coverage up front.
 */
const SHENG_SYNONYMS: Record<string, string[]> = {
  potea: ["lost"],
  imepotea: ["lost"],
  zitapotea: ["lost"],
  kupoteza: ["lost"],
  nikipoteza: ["lost"],
  poteza: ["lost"],
  simu: ["device", "phone"],
  imefail: ["fail", "failed"],
  itafail: ["fail"],
  kufail: ["fail"],
  mbona: ["why"],
  kwanini: ["why"],
  rudisha: ["reverse", "refund"],
  kurudisha: ["reverse", "refund"],
  rudishwa: ["reverse", "refund"],
  thibitisha: ["confirm"],
  kuthibitisha: ["confirm"],
  imethibitishwa: ["confirmed"],
  ibiwa: ["stolen"],
  ikiibiwa: ["stolen"],
  kuibiwa: ["stolen"],
  haribika: ["damaged"],
  imeharibika: ["damaged"],
};

function expandSynonyms(terms: string[]): string[] {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SHENG_SYNONYMS[term.toLowerCase()] ?? []) {
      expanded.add(synonym);
    }
  }
  return [...expanded];
}

/**
 * plainto_tsquery ANDs every word together, which fails on exactly the
 * queries this product exists to handle: "Bitcoin ni nini?" has no match
 * because "ni"/"nini" aren't in the (English) knowledge text, even though
 * "bitcoin" alone should surface a strong result. OR the terms instead so
 * one relevant word is enough, and let ts_rank_cd's term-count weighting
 * still favor entries that match more of the query (PRD §18.3).
 */
function buildOrQuery(query: string): string | null {
  const terms = query
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);
  if (terms.length === 0) return null;
  return expandSynonyms(terms)
    .map((term) => `${term}:*`)
    .join(" | ");
}

export async function retrieveKnowledge(query: string, limit = 3): Promise<RetrievalResult[]> {
  const tsQuery = buildOrQuery(query);
  if (!tsQuery) return [];

  const { rows } = await pool.query<KnowledgeRow>(
    `
    SELECT
      id,
      canonical_answer,
      beginner_answer,
      safety_notes,
      version,
      updated_at,
      ts_rank_cd(
        to_tsvector('english', title || ' ' || canonical_answer),
        to_tsquery('english', $1)
      ) AS rank
    FROM knowledge_entries
    WHERE status IN ('approved', 'published')
      AND to_tsvector('english', title || ' ' || canonical_answer) @@ to_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2
    `,
    [tsQuery, limit],
  );

  return rows.map((row) => ({
    conceptId: row.id,
    authoritativeContent: row.canonical_answer,
    approvedExamples: [row.beginner_answer],
    languageGuidance: null,
    safetyWarnings: row.safety_notes ?? [],
    sourceVersion: row.version,
    freshnessDate: row.updated_at,
    relatedConcepts: [],
    // Naive confidence proxy until semantic search + reranking lands.
    confidence: Math.min(1, Number(row.rank) * 2),
  }));
}
