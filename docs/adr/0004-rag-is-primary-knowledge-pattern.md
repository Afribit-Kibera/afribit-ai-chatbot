# ADR 0004 — RAG Is the Primary Knowledge Pattern

**Status:** Accepted

**Context:** Afribit requires versioned, auditable, updatable Bitcoin knowledge that does not depend on model pretraining, which can hallucinate, mix outdated/current information, or vary answer-to-answer.

**Decision:** Every Bitcoin-domain question attempts retrieval against `knowledge_entries` (status `approved`/`published` only) before generation. The model is instructed to answer from the retrieved context and to say so plainly when nothing relevant was found, rather than inventing an answer.

**Consequence:** Knowledge correctness is governed by the admin review workflow, not by model behavior. See `apps/api/src/knowledge/retrieval.ts` and `apps/api/src/prompt/promptBuilder.ts`.
