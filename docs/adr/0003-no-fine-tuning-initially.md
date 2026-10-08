# ADR 0003 — Do Not Fine-Tune Initially

**Status:** Accepted for now — fine-tuning is planned, gated on community training consent (see `docs/governance/data-stewardship.md`) and a compact prompt. **Amended 8 October 2026 by [ADR 0015](0015-how-the-assistant-learns.md):** fine-tuning may begin only when a community has (1) a human-labelled test set and a safety suite, (2) an agreed training-consent policy, and (3) enough consented, reviewed examples; and a tuned model ships only after it passes those tests and a reviewer vote. The model never updates from live conversations.

**Context:** Afribit does not yet have a substantial, cleaned, licensed, and evaluated dataset.

**Decision:** Phase 1–5 improve the system through retrieval (RAG), prompting, and the Microtasks human-feedback loop — not by training or fine-tuning a model. "Training mode" in this phase means collecting structured, reviewable signals, not changing model weights.

**Consequence:** Fine-tuning is deferred to Phase 6+, after data quality and product need are demonstrated.
