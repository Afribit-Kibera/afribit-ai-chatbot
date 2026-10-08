# ADR 0011 — Fuse search results by rank, not by score

**Status:** Accepted (live in production since 2026-10-02).

**Context:** Retrieval combined full-text search and embedding search by keeping whichever raw score was larger. The two scores are on incompatible scales (Postgres `ts_rank` is unbounded; cosine similarity runs 0 to 1), so full-text scores swamped semantic ones. On our 40-question benchmark the "hybrid" result was identical to full-text search alone and found the right card in the top 3 for 15 of 40 questions, while semantic search alone found it for 35. Rankings also changed with how many cards the caller asked for.

**Decision:** Fuse by **reciprocal rank fusion** (`apps/api/src/knowledge/fusion.ts`): `score = Σ weight / (60 + rank)` across the lists, with semantic search the primary signal (weight 1) and full-text a low-weight tie-breaker (0.1). Each retriever contributes a fixed pool of 30 candidates regardless of how many cards are wanted. Full-text is also the whole result when embeddings are unavailable.

**Consequences:** In production, right-card-in-the-top-3 rose from 25% to 82.5% (top 1: 17.5% to 50%) with no model change. The legacy `confidence` value shown to the model is deliberately unchanged. In `node` mode, where cloud embeddings are off, retrieval is full-text only and weak (42.5% in the top 3), so a node needs **local embeddings** — the next retrieval priority. Behaviour is locked in by `pnpm --filter @afribit/api test:fusion`.

**Follow-up (2026-10-02):** with the embedding model then switched to bge-m3 ([ADR 0013](0013-local-embeddings.md)), the same benchmark reaches 82.5% / 97.5% / 100% at top 1 / 3 / 5.
