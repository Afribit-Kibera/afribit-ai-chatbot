# ADR 0001 — Use OpenRouter First

**Status:** Accepted

**Context:** Afribit does not currently have infrastructure suitable for hosting production generative models.

**Decision:** Use OpenRouter as the Phase 1 inference backend, accessed only through the Afribit AI Gateway (never directly from the frontend or from application code outside `apps/api/src/providers`).

**Consequence:** The product and its community-data systems (knowledge base, language corpus, Microtasks) can be built immediately, independent of when local inference hardware is acquired.

See PRD §16, §17.
