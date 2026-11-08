/** PRD §11.3 — only "approved" or "published" may be used as retrieval context in production. */
export type KnowledgeStatus =
  | "draft"
  | "needs_factual_review"
  | "needs_language_review"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export const PRODUCTION_KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = [
  "approved",
  "published",
];

/** PRD §11.2 */
export interface KnowledgeEntry {
  id: string;
  title: string;
  domain: string;
  topic: string;
  canonicalAnswer: string;
  beginnerAnswer: string;
  safetyNotes: string[];
  sourceIds: string[];
  status: KnowledgeStatus;
  version: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  validFrom: string | null;
  expiresOrReviewAt: string | null;
}

/** PRD §10.4 — what a retrieval call must return. */
export interface RetrievalResult {
  conceptId: string;
  authoritativeContent: string;
  approvedExamples: string[];
  languageGuidance: string | null;
  safetyWarnings: string[];
  sourceVersion: number;
  freshnessDate: string;
  relatedConcepts: string[];
  /**
   * 0..1 — the legacy value: the larger of the word-match and meaning-match scores. The word-match score saturates
   * at 1 whenever a question shares common words with a card, so this does NOT say whether a card answers it.
   */
  confidence: number;
  /**
   * How close the card is in meaning (embedding cosine similarity), or null if it was found by words only or
   * meaning search is off. The gap list (F-004) uses this: with bge-m3, uncovered questions scored 0.42–0.65 and
   * covered ones 0.67–0.79 (8 Oct 2026).
   */
  semanticScore?: number | null;
}

/**
 * A reviewed `language_entries` row surfaced as grounded vocabulary for a
 * Sheng/mixed_ke response — see apps/api/src/knowledge/retrieveLanguageExamples.ts.
 * Deliberately much smaller than RetrievalResult: this isn't a fact to
 * cite, it's a phrase the model should prefer over improvising unreviewed
 * slang (docs/COMMUNICATION_STYLE_EVAL.md Finding 3).
 */
export interface LanguageExample {
  utterance: string;
  meaning: string | null;
  intent: string | null;
}
