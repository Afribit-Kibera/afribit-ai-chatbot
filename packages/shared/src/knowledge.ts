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
  /** 0..1 — drives the confidence check in PRD §18.2 / §30.6. */
  confidence: number;
}
