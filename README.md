# Afribit AI

Community-first Bitcoin education chatbot for Kibera/Nairobi. Full product
requirements: [`Afribit_Chatbot_PRD.md`](Afribit_Chatbot_PRD.md). Architecture
decisions: [`docs/adr`](docs/adr).

## What's here

This is a Phase 1 technical-prototype scaffold (PRD §33 Phase 1): a working
RAG + Afribit AI Gateway + OpenRouter chat loop, not the finished product.
Phase 0 content work (100+ reviewed knowledge entries), the admin console,
and the Microtasks pipeline are not yet built — see [`docs/adr`](docs/adr)
and the PRD's rollout roadmap (§33) for what comes next.

```text
apps/
  web/      React + Vite PWA — chat UI, onboarding, feedback
  api/      Fastify API — Afribit AI Gateway, OpenRouter provider, RAG, safety
packages/
  shared/   Shared TS types: InferenceProvider interface, domain types
db/
  migrations/  SQL schema (PRD §25)
  seed/        Public-dataset bootstrap imports into language_entries
               (draft-only — see db/seed/README.md and docs/dataset-register.md)
infra/
  docker-compose.yml  Local Postgres+pgvector and Redis
  LUNANODE.md          Deploy checklist for the Insats Lunanode server
docs/
  adr/      Architecture decision records
```

## Local setup

Requires Node 22+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env          # then set OPENROUTER_API_KEY
pnpm db:up                    # starts Postgres (pgvector) + Redis
pnpm db:migrate
pnpm db:seed                  # loads a small starter knowledge set (PRD §39)
node db/seed/run.mjs          # optional: public-dataset language bootstrap
                               # (draft-only, see db/seed/README.md)

pnpm dev:api                  # http://localhost:3001
pnpm dev:web                  # http://localhost:5173
```

Without `OPENROUTER_API_KEY` set, chat requests will fail over to the
deterministic knowledge-card fallback (PRD §17.3) rather than calling a
model — useful for testing the RAG/UI path without burning API credits.

## Key architectural rule

**Nothing outside `apps/api/src/gateway` and `apps/api/src/providers` may
know which inference provider is active.** The frontend never calls
OpenRouter directly, and application code calls `AfribitAIGateway.chat()`,
never `OpenRouterProvider` directly. This is what makes the future move to
local/hybrid inference (PRD §34) an infra change instead of a rewrite.

## Deploying

See [`infra/LUNANODE.md`](infra/LUNANODE.md) for the Insats Lunanode
deployment checklist.
