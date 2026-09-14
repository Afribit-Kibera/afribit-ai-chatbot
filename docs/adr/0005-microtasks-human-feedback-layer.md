# ADR 0005 — Microtasks Is the Human Feedback Layer

**Status:** Accepted

**Context:** Sheng and code-switched language are dynamic; a static dataset goes stale. Community participation can improve local-language quality, but unreviewed submissions must never become authoritative automatically.

**Decision:** Microtask tables (`microtask_jobs`, `microtask_submissions`, `microtask_reviews`, `contributors`, `contributor_reputation`) are entirely separate from `knowledge_entries` and `language_entries`. A submission can only reach production knowledge/language tables through the review pipeline (peer → trusted language reviewer → factual reviewer where needed → admin approval).

**Consequence:** No code path exists (and none should ever be added) that writes a raw Microtask submission directly into a production table.

See PRD §14, §25.1.
