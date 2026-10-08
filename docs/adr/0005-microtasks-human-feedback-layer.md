# ADR 0005 — Microtasks Is the Human Feedback Layer

**Status:** Accepted

**Context:** Sheng and code-switched language are dynamic; a static dataset goes stale. Community participation can improve local-language quality, but unreviewed submissions must never become authoritative automatically.

**Decision:** Microtask tables (`microtask_jobs`, `microtask_submissions`, `microtask_reviews`, `contributors`, `contributor_reputation`) are entirely separate from `knowledge_entries` and `language_entries`. A submission can only reach production knowledge/language tables through the review pipeline (peer → trusted language reviewer → factual reviewer where needed → admin approval).

**Consequence:** No code path exists (and none should ever be added) that writes a raw Microtask submission directly into a production table.

**Implementation note (2026-10):** Microtasks v1 stores a contribution as a `language_entries` row (`corpus_layer = L2_community_collected`, `status = draft`, every `allowed_for_*` flag false) and records reviews and votes in `language_reviews` and `language_votes`; the dedicated `microtask_*` tables from the original schema are not used yet. The invariant this ADR protects is unchanged: no contribution becomes retrievable without an explicit human promotion step, and nobody — human or model — can promote their own output.
