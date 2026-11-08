# ADR 0002 — Provider Abstraction Is Mandatory

**Status:** Accepted — exercised: `LocalProvider` was added as a new file plus one line in the registry (ADR 0007).

**Context:** Afribit intends to support local or hybrid inference later. Core services must not become coupled to OpenRouter's specific API shape.

**Decision:** All inference goes through the `InferenceProvider` interface (`packages/shared/src/provider.ts`) and the `AfribitAIGateway` (`apps/api/src/gateway`). Concrete providers (`OpenRouterProvider`, `LocalProvider`) are the only code that knows a specific vendor's API.

**Consequence:** Adding a local or hybrid provider later is a new file plus one line in `gateway/registry.ts` — not a rewrite of chat, retrieval, or prompt logic.
