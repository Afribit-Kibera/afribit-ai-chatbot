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
  return terms.map((term) => `${term}:*`).join(" | ");
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
