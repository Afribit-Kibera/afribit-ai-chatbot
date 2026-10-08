# Architecture

A short tour of how Afribit AI fits together and why. For where it is heading,
see [ROADMAP.md](ROADMAP.md).

## Principles

1. **The model is an interface to knowledge, not the knowledge.** Answers are
   grounded in a knowledge base the community reviews and versions. The language
   model's job is to say it naturally, not to remember Bitcoin.
2. **Retrieval before generation.** Relevant reviewed cards are retrieved first and
   handed to the model; if nothing relevant exists, the model is told to say so.
3. **Humans approve knowledge.** Content moves through explicit statuses
   (`draft` → `needs_*_review` → `approved` / `published`). Only approved or
   published rows are ever retrievable, and no model or contributor can promote their
   own output.
4. **Models are replaceable, and so is where they run.** All inference goes through one
   gateway; model names and the provider are configuration
   (`apps/api/config/model-profiles.json`, `INFERENCE_MODE`, `LOCAL_LLM_BASE_URL`), not code.
   The default model should carry an open-source licence
   ([ADR 0018](docs/adr/0018-open-licensed-default-model.md)).
5. **The engine is shared; the community is data.** Language modes, identity, safety
   wording, voice and knowledge live in a *community pack* (`packs/<id>`), not in code.
   Another community supplies its own pack to the same engine
   ([ADR 0014](docs/adr/0014-community-packs.md)).
6. **Never ask for secrets.** Seed phrases, keys, PINs and passwords are detected and
   refused on the way in and the way out.
7. **Provenance on every piece of language data.** Each phrase records where it came
   from, whether it is synthetic, whether a human reviewed it, and — separately —
   whether it may be used for retrieval, evaluation, or training. Defaults are
   conservative: nothing is cleared for training unless someone says so.
8. **It learns at three speeds, each with a gate** ([ADR 0015](docs/adr/0015-how-the-assistant-learns.md)).
   For one person at once (opt-in learner memory, planned); for the community the same
   day (approved cards and phrases are live through retrieval; Teach-mode suggestions and
   the gap list go to reviewers, planned); and the model in releases that pass a human
   test set, a safety suite and a reviewer vote (research). Weights never change from a
   live conversation.
9. **Reviewed and unreviewed answers never look the same.** "Learn" mode answers from
   approved knowledge (the default). An optional "Ask anything" mode answers generally,
   is off unless the community switches it on, and labels every answer as not checked
   by the community's reviewers ([ADR 0017](docs/adr/0017-ask-anything-mode.md), planned).

> **A note on code comments.** Some comments and migrations cite "PRD §N" or
> internal notes. Those refer to the project's original product-requirements
> document, which is not published. The principles above are the parts of it that
> matter for contributors; if a comment's reasoning isn't clear, ask in an issue.

## How a chat request flows

```text
PWA (apps/web)
  → API (apps/api, Fastify)
      1. safety check on the incoming message (real secrets are refused, not stored or forwarded)
      2. [optional] waiter: a small model rewrites the message into a clean English search question
      3. retrieval: embedding search (primary) + full-text search (tie-breaker), fused by rank,
         over published knowledge and reviewed Sheng/Kiswahili phrases
      4. prompt: the full prompt (default) or the compact "waiter" prompt (PROMPT_MODE=compact)
         — or, with CHAT_PIPELINE=restaurant, a hosted chef cooks from the scrubbed ticket and the
         cards, and the waiter serves the fact sheet in the customer's own language
      5. AfribitAIGateway.chat()  →  provider  →  language model
      6. post-processing + output safety check
      7. store the message — or only its metadata when CHAT_RETENTION=none (the browser then sends the recent turns)
  ← streamed response, marked answeredBy local/outside (or a deterministic knowledge-card answer if no model is reachable)
```

The waiter, the compact prompt and the restaurant pipeline are switches, off by default, because they change the public voice of the product and wait for community reviewers to compare them blind ([ADR 0010](docs/adr/0010-compact-prompt-and-the-waiter.md), [ADR 0012](docs/adr/0012-the-restaurant-pipeline.md)).

**Planned additions to this flow.** "Ask anything" mode (ADR 0017) will use a general prompt at step 4, keep steps 1, 3 and 6, and mark its answers as unreviewed. Teach mode and the gap list (ADR 0015) sit after step 6: a member's "say it your way" rewrite, or a question no card answered, becomes a suggestion in the reviewers' queue, never a change to what others hear until a reviewer approves it.

## Where inference runs

The same API runs in the cloud or on a community node; `INFERENCE_MODE` chooses ([ADR 0009](docs/adr/0009-inference-modes-and-privacy.md)):

| Mode | Chat model | Question embeddings | On failure |
|---|---|---|---|
| `cloud` (default) | hosted (OpenRouter) | hosted | cheaper hosted model, then a knowledge card |
| `node` | the node's own model server (`LocalProvider`: Ollama or OpenAI-compatible) | off | a knowledge card — never the cloud |
| `hybrid` | node first | on | hosted model (sends the question off-network; opt-in) |

Model profiles (`apps/api/config/model-profiles.json`) carry per-profile timeouts: a hosted API answers in seconds; a modest node needs minutes to read the prompt. The node deployment kit is in [`deploy/community-node/`](deploy/community-node); the program around it is in [`docs/program/`](docs/program).

**Afribit Local** ([ADR 0016](docs/adr/0016-afribit-local-community-box.md)) is `node` mode with the model server somewhere else: a small box at the community runs the unchanged node kit (app, database, local embeddings, backups) and points `LOCAL_LLM_BASE_URL` at Afribit's GPU server in Kenya over an encrypted tunnel, with a per-community `LOCAL_LLM_API_KEY`. The community's data stays on its box; each question and its cards cross the tunnel and are not stored on the GPU server. The code path exists today; the tunnel, the hardened GPU server and a model-location setting (so the app can tell members where the model runs) are planned.

## Repository layout

```text
apps/
  web/        React + Vite PWA: chat, settings, onboarding, push notifications
  api/        Fastify API
    src/gateway, src/providers   inference abstraction (the only place that knows the provider): OpenRouter and LocalProvider
    src/knowledge                retrieval, embeddings, retrieval benchmark
    src/pack                     community pack loader, validator, registry of served packs, per-request pack scoping, live wording overrides (Voice Lab), CLIs (pack:validate/list/init/install/export/overrides-export)
    src/prompt                   prompt layout (full and compact); the wording comes from the active pack
    src/waiter, src/restaurant   the waiter's ticket; the chef and the privacy scrubber
    src/safety                   secret detection, output safety checks
    src/privacy                  where the model runs (MODEL_LOCATION), chat retention (CHAT_RETENTION), deletion and the hourly sweep (F-001, F-002)
    src/routes, src/auth         HTTP routes, JWT auth (admin / reviewer / contributor)
    src/pilot                    pilot console: live aggregate stats, answer review queue, team roles, channel labels; the page is public/pilot
    src/dataset-lab              tooling to generate and evaluate language data and responses
    src/db                       migrations runner, seed scripts, content data (JSON)
packages/
  shared/     TypeScript types shared across apps (including the InferenceProvider interface)
db/
  migrations/ SQL schema
  seed/       third-party language data imports (attribution in NOTICE)
packs/                 community packs: kibera-bitcoin (live) and an example library pack
infra/
  docker-compose.yml   local development Postgres (pgvector) + Redis
deploy/
  community-node/      the node kit: compose files, Caddy, first-run script, README
docs/                  program, governance, security, evaluation, architecture decisions
tools/
  blind-review/        build and score blind comparisons for community reviewers
```

## Data model in one paragraph

`knowledge_entries` hold topic cards (canonical and beginner answers, safety notes,
status, version). `language_entries` hold phrases and utterances with a corpus layer
(`L0_reference` … `L4_gold`), provenance, and `allowed_for_rag` /
`allowed_for_evaluation` / `allowed_for_training` flags. Contributor submissions
(Microtasks) enter `language_entries` as drafts and have reviews and votes
recorded separately; they never become usable on their own.
