import type { RetrievalResult } from "@afribit/shared";
import { getPack } from "../pack/active.js";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { activeEmbeddingModel, embedQuery, semanticSearchEnabled } from "../providers/embeddings.js";
import { CANDIDATE_POOL, fuseRankings } from "./fusion.js";

export interface KnowledgeRow {
  id: string;
  canonical_answer: string;
  beginner_answer: string;
  safety_notes: string[];
  version: number;
  updated_at: string;
  score: number;
}

/**
 * PRD §18 — hybrid retrieval: lexical (Postgres full-text) + semantic
 * (pgvector cosine similarity over knowledge_embeddings, backfilled by
 * embedBackfill.ts). The semantic half is what actually fixes the failure
 * mode the lexical-only version had: "Nikipoteza simu yangu..." and "Mbona
 * Lightning payment yangu imefail?" both missed their exact right
 * canonical fact because the English-only lexical search can't bridge
 * Sheng/Swahili phrasing to English content no matter how many synonym
 * entries get added by hand -- a multilingual embedding model captures
 * that similarity directly (PRD §18.4: "must be evaluated for English,
 * Kiswahili, and code-switching"). Combined by taking the max of both
 * scores per entry -- simple and defensible for a first hybrid pass: if
 * either signal found this entry strongly relevant, it should surface,
 * rather than needing to tune a blend weight with no real usage data yet.
 *
 * Only 'approved' and 'published' knowledge is ever eligible (PRD §11.3).
 *
 * Both queries also filter to the active pack's retrieval domains (the Kibera pack: 'bitcoin') (added 2026-09-24, found
 * by runRetrievalEval.ts). knowledge_entries also holds the Basic
 * Communication Skills manual's general chapters (greetings, active
 * listening, boundaries, apologies -- register/tone guidance, not Bitcoin
 * facts, already served separately by COMMUNICATION_STYLE_GUIDE in the
 * prompt layer). A seeding bug let those rows default to domain='bitcoin'
 * alongside real Bitcoin content, and they were measurably winning
 * retrieval for short/common-word Bitcoin questions -- "Bitcoin ni nini?"
 * returned zero Bitcoin content in its top 5, all five results were
 * communication-manual chapters. Fixed at both ends: seedCommunityManuals.ts
 * now sets the correct domain per entry, and this filter is the actual
 * enforcement so a future seeding mistake can't silently reintroduce the
 * same cross-domain leakage.
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

function expandSynonyms(terms: string[]): string[] {
  const synonyms = getPack().synonyms; // the community's own (retrieval/synonyms.json)
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of synonyms[term.toLowerCase()] ?? []) {
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
/** Exported for reuse by retrieveLanguageExamples.ts -- same tokenization/synonym behavior should apply to both, or a query that finds the right knowledge_entries could still miss the matching language_entries phrase for no good reason. */
export function buildOrQuery(query: string): string | null {
  const terms = query
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word.length > 0);
  if (terms.length === 0) return null;
  return expandSynonyms(terms)
    .map((term) => `${term}:*`)
    .join(" | ");
}

export async function retrieveLexical(query: string, limit: number): Promise<KnowledgeRow[]> {
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
      -- Naive confidence proxy: term-frequency rank has no fixed scale,
      -- *2 is a rough stretch toward 0..1, not a calibrated probability.
      LEAST(1, ts_rank_cd(
        to_tsvector('english', title || ' ' || canonical_answer),
        to_tsquery('english', $1)
      ) * 2) AS score
    FROM knowledge_entries
    WHERE status IN ('approved', 'published')
      AND domain = ANY($3::text[])
      AND (community_pack_id IS NULL OR community_pack_id=$4)
      AND to_tsvector('english', title || ' ' || canonical_answer) @@ to_tsquery('english', $1)
    ORDER BY score DESC
    LIMIT $2
    `,
    [tsQuery, limit, getPack().domain.retrievalDomains,getPack().id],
  );
  return rows;
}

/**
 * Cosine similarity via pgvector's `<=>` distance operator (1 - distance).
 * Returns [] rather than throwing on any failure (embedding API down,
 * OPENROUTER_API_KEY missing, etc.) -- retrieval must degrade to
 * lexical-only, not take the whole chat request down with it.
 */
export async function retrieveSemantic(query: string, limit: number): Promise<KnowledgeRow[]> {
  // Embedding the customer's question uses the configured embedding provider. A hosted one sends the
  // question to a third party, so on a community node it is off unless explicitly allowed
  // (semanticSearchEnabled); a local one (bge-m3 on the node) always runs. With semantic search off,
  // retrieval falls back to full-text search only.
  if (!semanticSearchEnabled()) return [];
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(query);
  } catch (err) {
    console.error("Semantic retrieval skipped (embedding failed):", err instanceof Error ? err.message : err);
    return [];
  }
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // Vectors are stored per embedding model (migration 010); only compare against ones made by the active model.
  const { rows } = await pool.query<KnowledgeRow>(
    `
    SELECT
      ke.id,
      ke.canonical_answer,
      ke.beginner_answer,
      ke.safety_notes,
      ke.version,
      ke.updated_at,
      1 - (kemb.embedding <=> $1::vector) AS score
    FROM knowledge_embeddings_v2 kemb
    JOIN knowledge_chunks kc ON kc.id = kemb.chunk_id
    JOIN knowledge_entries ke ON ke.id = kc.knowledge_id
    WHERE kemb.embedding_model = $3
      AND ke.status IN ('approved', 'published')
      AND ke.domain = ANY($4::text[])
      AND (ke.community_pack_id IS NULL OR ke.community_pack_id=$5)
    ORDER BY kemb.embedding <=> $1::vector
    LIMIT $2
    `,
    [vectorLiteral, limit, activeEmbeddingModel(), getPack().domain.retrievalDomains,getPack().id],
  );
  return rows;
}


export async function retrieveKnowledge(query: string, limit = 3): Promise<RetrievalResult[]> {
  // Both retrievers contribute a fixed-size candidate pool (independent of `limit`),
  // then reciprocal rank fusion orders them. See fusion.ts for why the earlier
  // "keep the larger raw score" merge was replaced.
  const [lexicalRows, semanticRows] = await Promise.all([
    retrieveLexical(query, CANDIDATE_POOL),
    retrieveSemantic(query, CANDIDATE_POOL),
  ]);

  return fuseRankings(lexicalRows, semanticRows)
    .slice(0, limit)
    .map(({ row, bestRawScore, semanticScore }) => ({
      conceptId: row.id,
      authoritativeContent: row.canonical_answer,
      approvedExamples: [row.beginner_answer],
      languageGuidance: null,
      safetyWarnings: row.safety_notes ?? [],
      sourceVersion: row.version,
      freshnessDate: row.updated_at,
      relatedConcepts: [],
      confidence: Math.min(1, bestRawScore),
      semanticScore: semanticScore === null ? null : Number(semanticScore),
    }));
}
