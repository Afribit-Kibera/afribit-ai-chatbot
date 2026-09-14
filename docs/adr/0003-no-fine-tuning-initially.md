# ADR 0003 — Do Not Fine-Tune Initially

**Status:** Accepted

**Context:** Afribit does not yet have a substantial, cleaned, licensed, and evaluated dataset.

**Decision:** Phase 1–5 improve the system through retrieval (RAG), prompting, and the Microtasks human-feedback loop — not by training or fine-tuning a model. "Training mode" in this phase means collecting structured, reviewable signals (PRD §15), not changing model weights.

**Consequence:** Fine-tuning is deferred to Phase 6+, after data quality and product need are demonstrated.

See PRD §15, §42 Decision 003.
