<p align="center">
  <img src="logo/Afribit%20AI%20logo%20concept.png" alt="Afribit AI" width="420">
</p>

<h1 align="center">Afribit AI</h1>
<p align="center"><strong>Smarter communities. Brighter futures.</strong></p>
<p align="center">A community-first Bitcoin education assistant for Kibera and Nairobi — built to speak Sheng, Kiswahili, and English the way people actually talk, not the way a textbook does.</p>

<p align="center">
  <a href="#status">Status: Phase 1 prototype</a> ·
  <a href="Afribit_Chatbot_PRD.md">Product doc</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="#license">License: TBD</a>
</p>

---

## Why this exists

Most AI assistants answer a Kenyan user in formal Kiswahili even when the
question came in Sheng. Most Bitcoin education material is written for
someone who already understands banking and computer networks. Afribit AI
starts from a different rule, taken directly from the product spec:

> **Afribit Chatbot does not require the community to speak like AI. It
> teaches AI to communicate like the community.**

> **The LLM is not Afribit's knowledge. It is an interface to Afribit's
> knowledge.**

In practice, that means Afribit AI never trusts a model's own training
data to explain Bitcoin. Every answer is grounded in a knowledge base
Afribit owns, reviews, and versions — the model's only job is to say it
naturally, in whatever mix of Sheng, Kiswahili, and English the person
asking is already using.

## Status

**This is a Phase 1 technical prototype, not a finished product.** Read
this section before assuming anything below is production-ready.

**Working today:**
- A real retrieval-augmented chat loop: user message → hybrid lexical +
  semantic search over reviewed knowledge → provider-abstracted model call
  → response, with a deterministic knowledge-card fallback if the model is
  unreachable.
- **86 knowledge entries, `published`** — the original 24-entry starter
  pack (Bitcoin basics, wallets, Lightning, receiving/paying, safety) plus
  62 entries from two full teaching manuals (Bitcoin Basics, Communication
  Skills — both in Kenyan Sheng), **presented to and approved by community
  reviewers on 2026-09-23** as each manual's first approved version. Plus
  271 reviewed phrase/glossary examples (`language_entries`,
  `allowed_for_rag = true`), now wired into live chat too — Sheng/mixed
  responses are grounded against this reviewed vocabulary instead of only
  a small hardcoded example list. Future corrections go through each
  manual's own Appendix C review worksheet and ship as a new reviewed
  version — see [Contributing](#contributing).
- A tested, evidence-backed communication layer: register matching
  (formal/neutral/Sheng), a hard safety floor (never requests secrets,
  never guarantees returns), model-fallback chains on every profile that
  needs one, and a live 10-case eval across English/Sheng/Kiswahili/mixed
  that currently passes 10/10 with zero unsafe-content flags — see
  [`docs/COMMUNICATION_STYLE_EVAL.md`](docs/COMMUNICATION_STYLE_EVAL.md)
  for the full history, including two self-corrected mistakes along the
  way (worth reading if you're tempted to trust a single eval run's score).
- Web Push notifications, a settings screen, and session-based chat
  history in the PWA (`apps/web`) — the notification-trigger mechanism was
  hardened after a real vulnerability was found and fixed; see
  [`docs/SECURITY_AUDIT_2026-09-23.md`](docs/SECURITY_AUDIT_2026-09-23.md).
- **Real authentication** (JWT, `apps/api/src/auth/`) gating admin
  knowledge management and the new Microtasks pipeline below — the
  anonymous chat flow deliberately still needs no account. No public path
  to admin exists anywhere (an operator-run CLI script promotes a
  registered user).
- **A first working version of the Microtasks pipeline** (ADR 0005):
  submit a Sheng/Kiswahili phrase, see others' unreviewed submissions,
  review them (self-review is blocked), vote on naturalness — all backed
  by real accounts, not a free-text field anyone could fill with anything.
  A minimal web UI lives in Settings. See
  [`docs/AUTH_AND_MICROTASKS_2026-09-24.md`](docs/AUTH_AND_MICROTASKS_2026-09-24.md).
- Rate limiting (`@fastify/rate-limit`): 100 req/min/IP globally, 15
  req/min/IP on the three routes that call the paid OpenRouter model.
- **CI** (`.github/workflows/ci.yml`): typecheck + test + build on every
  push/PR, plus a job that applies every migration against a fresh
  `pgvector` database to catch a broken migration before anyone runs it
  for real.
- **The API is live**: `https://afribit-api.insats.org` — three isolated
  Docker containers (API, Postgres+pgvector, Redis, own network, own
  secrets, memory-capped) on Insats' `insats-prod` VM, fronted by Caddy with
  a real TLS cert. Verified with real end-to-end chat requests over public
  HTTPS after deploy, not just a health check. See
  [`infra/LUNANODE.md`](infra/LUNANODE.md) for the deployed state.

**Not yet ready:**
- **The web PWA (`apps/web`) still isn't deployed anywhere** — only the API
  is live so far. See [Deploying](#deploying) for the plan (Vercel).
- **No admin console UI.** The admin API is now properly auth-gated, but
  there's no frontend for knowledge management yet — it's API-only.
- **Microtasks has no promotion flow yet.** A review being recorded
  doesn't flip a submission to a usable status — that needs a real
  review-queue/consensus design, not a bare endpoint, and wasn't built
  same-day as the submission flow.
- **No automated test suite beyond the prompt-construction check.**
  `pnpm test` (10 cases, no DB/API needed) and the live-model eval
  scripts exist, but there's no unit/integration coverage for routes, the
  DB layer, or the web app.
- **The new Settings account/Microtasks UI hasn't been visually verified
  in a real browser** — typechecked and built cleanly, backend verified
  with real HTTP requests, but no browser-automation tool was available
  to click through it. Do that before trusting it fully.
- No password reset or email verification — no email-sending
  infrastructure exists in this project yet.
- `allowed_for_training` is deliberately still `false` on every
  `language_entries` row — community approval covered chat/model use,
  not fine-tuning or redistribution, which stays a separate decision.
- **No voice input.** Text chat only. The PRD lists voice as an open
  Phase 2+ question, not a Phase 1 commitment, and nothing in this repo
  implements it (no audio endpoints, no microphone UI).
- No license has been chosen yet (see [License](#license)).

If you're evaluating whether to trust this for real users today: the
biggest blockers (auth, rate limiting, CI, deployment) are now closed, but
the web PWA still isn't deployed and hasn't been browser-tested end-to-end.
See [Deploying](#deploying) for where each half actually runs. If you want
to help close what's left, see [Contributing](#contributing) below.

## How it works

```text
User message
  → apps/api  (Fastify)
      → safety check (secret detection, e.g. someone pasting a seed phrase)
      → retrieval  (Postgres full-text + pgvector semantic search over
                     `knowledge_entries` — only approved/published rows)
      → prompt assembly  (register/safety rules + retrieved facts + the
                           user's conversation history)
      → AfribitAIGateway.chat()  → OpenRouterProvider → a real model
      → response, or a deterministic knowledge-card fallback if the
        model is unreachable
```

**The one architectural rule that isn't optional:** nothing outside
`apps/api/src/gateway` and `apps/api/src/providers` may know which
inference provider is active. The frontend never calls OpenRouter
directly, and application code calls `AfribitAIGateway.chat()`, never
`OpenRouterProvider` directly. This is what makes a future move to
local/hybrid inference an infrastructure change, not a rewrite — see
[`docs/adr/0002-provider-abstraction-mandatory.md`](docs/adr/0002-provider-abstraction-mandatory.md).

```text
apps/
  web/      React + Vite PWA — chat UI, onboarding, settings, notifications
  api/      Fastify API — gateway, providers, RAG, safety, prompt construction
packages/
  shared/   Shared TS types: InferenceProvider interface, domain types
db/
  migrations/  SQL schema
  seed/        Public-dataset bootstrap imports into language_entries
               (draft-only — see db/seed/README.md and docs/dataset-register.md)
infra/
  docker-compose.yml  Local Postgres+pgvector and Redis
  LUNANODE.md          Deploy checklist for the Insats Lunanode server
docs/
  adr/                              Architecture decision records
  LANGUAGE_CORPUS.md                Provenance model for language data
  dataset-register.md               Per-source license/quality findings
  AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md   Dataset Lab design + run log
  SHENG_STYLE_GUIDE.md              Corrected Sheng usage, source of truth for prompts
  COMMUNICATION_STYLE_EVAL.md       Live test/critique/fix log for the chat prompt
  BRAND.md                          Visual identity
```

## Try it locally

Requires Node 22+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env          # then set OPENROUTER_API_KEY
pnpm db:up                    # starts Postgres (pgvector) + Redis
pnpm db:migrate
pnpm db:seed                  # loads the reviewed starter knowledge set (24 entries)
pnpm db:seed:manuals          # optional: loads the two teaching manuals
                               # (inserts as needs_language_review by default)
pnpm --filter @afribit/api db:promote:manuals   # marks them published/approved,
                               # recording the 2026-09-23 community approval
                               # (only run this if you're syncing to the
                               # already-approved state — see Status above)
node db/seed/run.mjs          # optional: public-dataset language bootstrap
                               # (draft-only, see db/seed/README.md)

pnpm dev:api                  # http://localhost:3001
pnpm dev:web                  # http://localhost:5173
```

Without `OPENROUTER_API_KEY` set, chat requests fail over to the
deterministic knowledge-card fallback rather than calling a model — useful
for testing the RAG/UI path without burning API credits.

Before opening a PR:

```bash
pnpm typecheck
pnpm test                     # prompt-construction regression check, no DB/API needed
```

## PWA notifications / VAPID setup

Afribit AI uses Web Push for installed-PWA notifications. Browsers require
notification permission to come from a user action, so the frontend only
asks from the Settings screen.

Generate VAPID keys locally:

```bash
pnpm --filter @afribit/api exec web-push generate-vapid-keys
```

Add the values to `.env`:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:hello@afribit.ai
```

Then restart the API. The public key is served from
`GET /api/v1/notifications/vapid-public-key`; the private key never leaves
the backend. Subscriptions are stored in `notification_subscriptions`.

For local testing:

1. Run `pnpm db:migrate` so migration `006_notification_subscriptions.sql`
   is applied.
2. Start API and web.
3. Open Settings in the PWA, enable notifications, then use `Send test`.

Production notes:

- Serve the web app over HTTPS; Push API subscription does not work on
  insecure origins outside localhost.
- Keep `VAPID_PRIVATE_KEY` out of frontend builds, logs, and client-visible
  config.
- The test notification endpoint is intended for development only.
- Before real accounts launch, push subscriptions are tied to an anonymous
  installation id. Bind them to authenticated users before using
  notifications for sensitive account events.

## Contributing

This project needs more than code — see [`CONTRIBUTING.md`](CONTRIBUTING.md)
for the three ways to help: **language review** (no coding required, and
the most needed contribution right now), **Bitcoin content review**, and
**code**. The two source teaching manuals in this repo are explicitly
marked "Community review draft" and ship with their own review
worksheets — that's the fastest way to make a real difference before
writing a line of code.

## Documentation map

- [`Afribit_Chatbot_PRD.md`](Afribit_Chatbot_PRD.md) — full product
  requirements; start here for "why does it work this way."
- [`docs/adr/`](docs/adr) — architecture decisions, one file per decision.
- [`docs/LANGUAGE_CORPUS.md`](docs/LANGUAGE_CORPUS.md) — the layered
  provenance model for every piece of language data in the system.
- [`docs/dataset-register.md`](docs/dataset-register.md) — verified
  license/provenance findings for every external dataset considered.
- [`docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md`](docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md) —
  the Dataset Lab's design and a running log of what's actually been run.
- [`docs/SHENG_STYLE_GUIDE.md`](docs/SHENG_STYLE_GUIDE.md) — corrected
  Sheng usage rules, the human-readable copy of what the live prompt uses.
- [`docs/COMMUNICATION_STYLE_EVAL.md`](docs/COMMUNICATION_STYLE_EVAL.md) —
  a real test → critique → fix log against live model output, including
  two bugs it found and fixed and the model-selection bake-off for the
  fallback chat profile.
- [`docs/BRAND.md`](docs/BRAND.md) — visual identity.
- [`docs/SECURITY_AUDIT_2026-09-23.md`](docs/SECURITY_AUDIT_2026-09-23.md) —
  a real delegated security review with findings and fixes, not just a
  checklist.
- [`infra/LUNANODE.md`](infra/LUNANODE.md) — deployment checklist.
- [`docs/AUTH_AND_MICROTASKS_2026-09-24.md`](docs/AUTH_AND_MICROTASKS_2026-09-24.md) —
  auth, the Microtasks pipeline, rate limiting, and CI/CD: what's built,
  what's verified, what's still open.

## Deploying

**Split the two apps — don't force one hosting model onto both.**

**`apps/web` (the PWA) → Vercel.** This is a genuinely good fit, not a
default answer: it's a static Vite build (`dist/index.html` + JS/CSS),
already designed to talk to an external API over `VITE_API_URL`/`CORS_ORIGIN`
rather than assuming same-host deployment. Vercel gives free/cheap global
CDN hosting, automatic HTTPS, and PR preview deployments, and none of
that requires changing a line of this app's code.

**`apps/api` (the Fastify backend) → keep it on a real server. Done**:
live at `https://afribit-api.insats.org` as of 2026-09-24, containerized on
Insats' `insats-prod` LunaNode VM — see
[`infra/LUNANODE.md`](infra/LUNANODE.md) for the actual deployed
configuration (this used to be a checklist for a future deploy; it now
records a real one) **— not Vercel serverless.** This isn't "Vercel can't run
backends," it's that this specific backend's design doesn't map onto
Vercel's serverless execution model without real rework, for no benefit:

- It needs a **persistent connection pool** to Postgres (`pg.Pool` in
  `apps/api/src/db/pool.ts`) — serverless functions are short-lived and
  spin up many concurrent instances, which is the classic
  "serverless-exhausts-your-database-connections" problem, normally
  solved with an external pooler (PgBouncer, or Neon's built-in one) —
  solvable, but it's added infrastructure for zero upside here.
- **`POST /api/v1/chat/stream` uses raw `reply.hijack()` + chunked
  NDJSON streaming** with `Connection: keep-alive` — built for a
  long-lived process serving a long-lived response, not a pattern that
  drops cleanly into a serverless function invocation.
- **Rate limiting's store is in-memory, single-process by design** (see
  the dated comment in `server.ts`) — correct and sufficient for the one
  persistent process `infra/LUNANODE.md` describes, but would silently
  break (or need a Redis-backed store, which this project's Redis
  dependency could support but doesn't need today) under serverless's
  many-ephemeral-instances model.
- **`pgvector`** (the Postgres extension `knowledge_embeddings` needs) —
  not a Vercel-specific issue, but worth naming: if you ever do move the
  database off a self-hosted Postgres, pick a managed provider that
  actually supports the extension (Neon and Supabase both do) rather than
  assuming any managed Postgres works.

None of this is a permanent architectural wall — it's just real,
non-trivial rework to fit a design built around a persistent server onto
a platform built around not having one, when a $5-10/month VPS already
does the job with the code exactly as it's written today.

## License

No license has been chosen yet — this is an explicit open item, not an
oversight. The source teaching manuals in this repo say so directly: *"Before
publishing this expanded manual as an open dataset or public training
corpus, Afribit Africa should choose and state a license."* The same
applies to the code. Until a license is added, assume all rights are
reserved by Afribit Africa; don't redistribute without asking.
