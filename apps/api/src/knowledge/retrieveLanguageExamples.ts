import type { LanguageExample } from "@afribit/shared";
import { pool } from "../db/pool.js";
import { buildOrQuery } from "./retrieval.js";

/**
 * docs/COMMUNICATION_STYLE_EVAL.md Finding 3: drafting a Sheng response,
 * the model reached for casual filler ("dry") that isn't attested in
 * either source manual's glossary or phrase bank -- exactly the risk the
 * manuals' own front matter warns about (never invent slang the user
 * didn't use). The structural cause was that `language_entries` --
 * reviewed glossary/phrase-bank vocabulary -- was never read by anything.
 * That gate is now open (both manuals promoted to
 * corpus_layer='L3_afribit_reviewed'/allowed_for_rag=true, 2026-09-23 --
 * see docs/LANGUAGE_CORPUS.md), so this reads it.
 *
 * Lexical-only (no pgvector column exists for language_entries -- see
 * db/migrations/001_init.sql/003_dataset_lab.sql; adding semantic search
 * here would need a new embeddings table and backfill pipeline, out of
 * scope for wiring in what's already approved). Reuses retrieval.ts's
 * buildOrQuery() so a query that finds the right knowledge_entries fact
 * doesn't miss the matching language_entries phrase over inconsistent
 * tokenization.
 *
 * This is genuinely optional context (vocabulary hints, not facts) --
 * unlike retrieveKnowledge(), an empty or failed result should never
 * block or degrade the chat response, only mean the model falls back to
 * SHENG_STYLE_GUIDE's smaller hardcoded example list.
 *
 * Known limitation, confirmed live (2026-09-23): this matches across
 * BOTH source manuals' entire approved vocabulary with no topic
 * filtering, so a query can surface off-topic terms with no relevance to
 * the actual question -- e.g. "Vipi nikatae mtu anataka nimpee number
 * yangu..." (a communication-skills boundary question) returned mostly
 * Bitcoin glossary entries (Hash, Blockchain, Lightning Network) because
 * common words in the query happened to co-occur with those terms'
 * `meaning` text. This didn't cause visible harm in that test (the model
 * still answered on-topic and didn't force in an irrelevant term -- the
 * prompt explicitly says "don't force one in if it doesn't fit"), but a
 * tighter design would scope candidates by domain/intent rather than a
 * flat OR across everything approved. Not fixed here -- flagged for
 * whoever picks this up next.
 */
export async function retrieveLanguageExamples(query: string, limit = 6): Promise<LanguageExample[]> {
  const tsQuery = buildOrQuery(query);
  if (!tsQuery) return [];

  try {
    const { rows } = await pool.query<{ utterance: string; meaning: string | null; intent: string | null }>(
      `
      SELECT utterance, meaning, intent
      FROM language_entries
      WHERE status = 'approved'
        AND allowed_for_rag = true
        AND to_tsvector('simple', utterance || ' ' || coalesce(meaning, '')) @@ to_tsquery('simple', $1)
      ORDER BY ts_rank_cd(to_tsvector('simple', utterance || ' ' || coalesce(meaning, '')), to_tsquery('simple', $1)) DESC
      LIMIT $2
      `,
      [tsQuery, limit],
    );
    return rows;
  } catch (err) {
    // Same reasoning as retrieveSemantic() in retrieval.ts -- this is
    // supplementary vocabulary grounding, not core retrieval; a query
    // failure here must degrade silently, never take the chat request down.
    console.error("Language example retrieval skipped:", err instanceof Error ? err.message : err);
    return [];
  }
}
