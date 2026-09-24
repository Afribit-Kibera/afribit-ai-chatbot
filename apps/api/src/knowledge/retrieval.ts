import type { RetrievalResult } from "@afribit/shared";
import { pool } from "../db/pool.js";
import { embedText } from "../providers/openRouterEmbeddings.js";

interface KnowledgeRow {
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

async function retrieveLexical(query: string, limit: number): Promise<KnowledgeRow[]> {
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
      AND to_tsvector('english', title || ' ' || canonical_answer) @@ to_tsquery('english', $1)
    ORDER BY score DESC
    LIMIT $2
    `,
    [tsQuery, limit],
  );
  return rows;
}

/**
 * Cosine similarity via pgvector's `<=>` distance operator (1 - distance).
 * Returns [] rather than throwing on any failure (embedding API down,
 * OPENROUTER_API_KEY missing, etc.) -- retrieval must degrade to
 * lexical-only, not take the whole chat request down with it.
 */
async function retrieveSemantic(query: string, limit: number): Promise<KnowledgeRow[]> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch (err) {
    console.error("Semantic retrieval skipped (embedding failed):", err instanceof Error ? err.message : err);
    return [];
  }
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

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
    FROM knowledge_embeddings kemb
    JOIN knowledge_chunks kc ON kc.id = kemb.chunk_id
    JOIN knowledge_entries ke ON ke.id = kc.knowledge_id
    WHERE ke.status IN ('approved', 'published')
    ORDER BY kemb.embedding <=> $1::vector
    LIMIT $2
    `,
    [vectorLiteral, limit],
  );
  return rows;
}

export async function retrieveKnowledge(query: string, limit = 3): Promise<RetrievalResult[]> {
  // Pool a wider candidate set from each method before merging/truncating
  // to `limit` -- confirmed live that the right entry can rank outside
  // each method's own top-`limit` individually (e.g. tied lexical scores
  // with no secondary sort, or an embedding model with uneven Sheng/
  // Swahili alignment) while still deserving to win once both signals are
  // considered together. Limiting each method to exactly `limit` before
  // the merge would silently throw those cases away before they get a
  // chance.
  const candidatePoolSize = Math.max(limit * 3, 8);
  const [lexicalRows, semanticRows] = await Promise.all([
    retrieveLexical(query, candidatePoolSize),
    retrieveSemantic(query, candidatePoolSize),
  ]);

  const byId = new Map<string, KnowledgeRow>();
  for (const row of [...lexicalRows, ...semanticRows]) {
    const existing = byId.get(row.id);
    if (!existing || Number(row.score) > Number(existing.score)) {
      byId.set(row.id, row);
    }
  }

  return [...byId.values()]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, limit)
    .map((row) => ({
      conceptId: row.id,
      authoritativeContent: row.canonical_answer,
      approvedExamples: [row.beginner_answer],
      languageGuidance: null,
      safetyWarnings: row.safety_notes ?? [],
      sourceVersion: row.version,
      freshnessDate: row.updated_at,
      relatedConcepts: [],
      confidence: Math.min(1, Number(row.score)),
    }));
}
