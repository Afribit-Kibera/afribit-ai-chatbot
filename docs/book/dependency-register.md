# Dependency register

What Afribit AI depends on: software, platforms, AI models, data and outside services. For each one it
records the licence, where it is used, and any risk. This is part of [the Book](README.md).

**Last checked:** 8 October 2026, on branch `feat/frontend-rework` (HEAD `bb9b7b6` plus uncommitted
changes), Node 24.20.0 and pnpm 11.25.0 on the developer machine.

## 1. Software packages

### Licence summary of everything shipped

Command: `pnpm licenses list --prod`. It covers the full production dependency tree of all workspace
packages: **136 packages.**

| Licence | Packages | Notes |
|---|---|---|
| MIT | 112 | Permissive |
| ISC | 9 | Permissive |
| BSD-3-Clause | 5 | Permissive (includes `bcryptjs`) |
| OFL-1.1 | 4 | The four fonts. They can be bundled, but not sold on their own |
| Apache-2.0 | 3 | Permissive |
| BSD-2-Clause | 1 | `dotenv` |
| 0BSD | 1 | `tslib` |
| MPL-2.0 | 1 | `web-push`. File-level copyleft: fine to use unmodified; changes to its own files must be shared |

There is no GPL or AGPL package in the production tree.

Caveat: the API's Voice Lab page is built from `apps/api` devDependencies (`react`, `@radix-ui/react-dialog`,
`lucide-react`, the fonts), so those are shipped even though they are listed as dev. They are the same packages
the web app ships, so they are already counted above.

### Direct runtime dependencies

| Package | Range | Used by | Purpose |
|---|---|---|---|
| fastify | ^5.1.0 | api | HTTP server |
| @fastify/cors, @fastify/jwt, @fastify/rate-limit, fastify-plugin | ^10, ^10.2, ^11.2, ^6 | api | CORS, sign-in tokens, rate limits, plugins |
| pg | ^8.13.1 | api | PostgreSQL client |
| pino | ^9.5.0 | api | Logging |
| bcryptjs | ^3.0.3 | api | Password hashing |
| dotenv | ^16.4.5 | api | Configuration from `.env` |
| web-push | ^3.6.7 | api | Push notifications (VAPID) |
| react, react-dom | ^18.3.1 | web, Voice Lab | User interface |
| @radix-ui/react-dialog, lucide-react, class-variance-authority, clsx, tailwind-merge, animejs | various | web | Dialogs, icons, styling, animation |
| @fontsource DM Sans, Space Grotesk, Poppins, JetBrains Mono | ^5.3.0 | web | Fonts, bundled locally rather than fetched from Google |

The exact versions are pinned in `pnpm-lock.yaml`, and CI installs with `--frozen-lockfile`.

### Build and test tools (not shipped)

TypeScript ^5.6, tsx ^4.19, Vite ^6, @vitejs/plugin-react, Tailwind CSS 4, Vitest ^5, Playwright ^1.63 with
@axe-core/playwright (accessibility), Lighthouse CI ^0.15.

Dependabot (`.github/dependabot.yml`) proposes updates. Every update still goes through CI and this register.

## 2. Platforms and container images

| Component | Version / image | Where | Risk / note |
|---|---|---|---|
| Node.js | 22 (`node:22-alpine`) in containers and CI | api, web build | The tag moves with Node 22 patch releases |
| pnpm | 11.25.0 (`packageManager`) | everywhere | — |
| PostgreSQL + pgvector | `pgvector/pgvector:pg16` | local dev, node kit, server | The tag moves within 16 |
| Ollama | `ollama/ollama:latest` | node kit | **Unpinned.** A new release can change behaviour without warning. Pin a version |
| Caddy | `caddy:2-alpine` | node kit web server | The tag moves within 2 |
| Redis | `redis:7-alpine` | local dev compose only | `REDIS_URL` is configured, but no code uses Redis today (rate limits run in-process). Remove it or document the plan |

## 3. AI models

Source: `apps/api/config/model-profiles.json`. The node's model can be overridden with `LOCAL_LLM_MODEL`.

The last column is our reading of each licence or terms, not legal advice. **No model has been trained by this
project; every corpus row has `allowed_for_training = false`.**

| Model | Provider | Profiles | Licence / terms | Outputs usable to train a released model? |
|---|---|---|---|---|
| meta-llama/llama-3.3-70b-instruct | OpenRouter | `default_chat`, `chef_cloud` | Llama 3.3 Community Licence | Yes, with conditions: the trained model's name must begin with "Llama" |
| openai/gpt-4o-mini | OpenRouter | `fallback_chat`, and fallback for the Dataset Lab roles | OpenAI terms (proprietary) | **No.** The terms forbid developing competing models |
| anthropic/claude-sonnet-5 | OpenRouter | `deep_dive`, `sheng_chat` | Anthropic terms (proprietary) | **No** |
| openai/gpt-5.6-luna, -terra, -sol | OpenRouter | `dataset_generator`, `dataset_critic`, `dataset_judge` | OpenAI terms (proprietary) | **No.** Dataset Lab output so far is for evaluation only |
| Gemma 3 12B (`google/gemma-3-12b-it` hosted; `gemma3:12b` on nodes) | OpenRouter / Ollama | `node_chat`, `node_chat_cloud_fallback`, `waiter_*`, `serve_*`, `compact_chat_cloud` | Gemma Terms of Use. **Not an OSI licence** | Check the Gemma terms first |
| bge-m3 (`bge-m3` local; `baai/bge-m3` hosted) | Ollama / OpenRouter | Embeddings (node default; production since 2 Oct 2026, [ADR 0013](../adr/0013-local-embeddings.md)) | MIT | — (an embedding model) |
| openai/text-embedding-3-small | OpenRouter | Code default for cloud embeddings if `EMBEDDING_MODEL` is unset | OpenAI terms | — |

How data flows:
- **OpenRouter:** the provider code requires zero-data-retention routing. Requests still leave the network.
- **Local (`node` mode):** nothing leaves the network.

Risks:
- **Versions aren't pinned by digest.** OpenRouter slugs and Ollama tags can point to new weights over time.
  Record the Ollama digest (`ollama list`) in the evaluation log whenever a model is evaluated or deployed.
- **The file's own comment** says model slugs must be checked against OpenRouter's current list before going live.
- **Open-source claim:** the node default (Gemma 3) isn't OSI-open. Gemma 4 has been Apache-2.0 since
  2 April 2026 and passed our model search. Decided in [ADR 0018](../adr/0018-open-licensed-default-model.md):
  Gemma 4 becomes the default where it matches Gemma 3 on our tests and fits the GPU. Until that evaluation
  is logged, `gemma3:12b` stays.

### Planned additions (decided, not yet in use)

| Component | For | Licence | Decision |
|---|---|---|---|
| Gemma 4 (E4B, 26B-A4B or 31B, whichever the evaluation picks) | Default chat model on nodes and on Afribit's GPU servers | Apache-2.0 | [ADR 0018](../adr/0018-open-licensed-default-model.md) |
| WireGuard | Encrypted tunnel from a community box to Afribit's GPU server | GPL-2.0 (kernel module), with tools under permissive licences. Run as a separate program, not linked into our code | [ADR 0016](../adr/0016-afribit-local-community-box.md) |
| A model server (Ollama or vLLM) on Afribit's GPU servers | Serving the model to community boxes | MIT (Ollama) / Apache-2.0 (vLLM) | [ADR 0016](../adr/0016-afribit-local-community-box.md) |

## 4. Data and content

| Data | Size | Licence | Status / use |
|---|---|---|---|
| Afribit teaching manuals (`apps/api/src/db/data/*.json`): Bitcoin Basics in Kenyan Sheng; Basic Communication Skills in Kenyan Sheng | 20 chapters + 37 glossary entries; 24 chapters + 64 phrases + 65 glossary entries | CC BY-SA 4.0 ([NOTICE](../../NOTICE)) | Community-approved v1.0; used for retrieval |
| Kibera pack knowledge cards (`packs/kibera-bitcoin/knowledge/cards.json`) | 25 topics, 61 entries | CC BY-SA 4.0 | Reviewed; used for retrieval |
| Kibera pack few-shot examples | 14 | CC BY-SA 4.0 | Prompt examples |
| Retrieval benchmark (`packs/kibera-bitcoin/eval/retrieval.json`) | 40 questions + 5 not covered | CC BY-SA 4.0 | Evaluation |
| LughaKonnect (`db/seed/001`) | 40 Sheng entries | CC BY 4.0 | Imported as drafts; not cleared for retrieval or training |
| KenCorpus (`db/seed/002`) | 28 rows | CC BY 4.0 | Imported as drafts (reference) |
| Datasets checked and **not imported** | — | Various | Gated, scraped without a rights chain, mostly empty, or non-commercial. The reasons are recorded in the maintainers' dataset register |

## 5. Outside services

| Service | Used for | What it receives | Needed in `node` mode? |
|---|---|---|---|
| OpenRouter | Hosted models (cloud and hybrid modes) | Prompts: question, retrieved cards, recent history | No |
| Vercel | Hosting the public web app | Page requests | No |
| A Linux VM run by Afribit (Docker) | API and database of the public cloud service | Everything the cloud service stores | No (the node is its own server) |
| Browser push services (Google, Mozilla, Apple) | Delivering notifications | The notification payload and subscription | No (push needs the internet) |
| GitHub | Code, issues, CI, Dependabot | Code and CI logs | No |
| Ollama registry / Hugging Face | Downloading models | Download requests | Only at install |
| Rented GPUs (benchmarks) | Measuring speed | Benchmark prompts only | No |

## 5b. Changes on 8 October 2026 (F-001, F-002, F-003)

- **No new runtime dependencies.** The features use Fastify, `pg` and React, all already listed.
- **New database migrations:** `016_privacy_settings.sql`, `017_teach_suggestions.sql`.
- **New settings:** `MODEL_LOCATION` (auto | community | afribit) and `CHAT_RETENTION` (none | Nd | keep;
  default 30d; the node kit defaults to none).
- **Added (dev only):** PGlite (`@electric-sql/pglite` **0.5.8**, pinned, Apache-2.0), PostgreSQL compiled to
  WebAssembly. `pnpm --filter @afribit/api test:db` applies every migration to an empty database and runs the
  F-002/F-003 SQL against it (16 checks), with no Docker. It has no pgvector, so vector columns become arrays
  in that check. It is part of `pnpm test`, and so of every release. It is not shipped: the runtime uses `pg`
  against the real server.

## 6. Open actions from this register

1. Pin the Ollama image version in the node kit.
2. Record model digests with every evaluation and deployment.
3. Remove Redis from the dev compose, or document why it is there.
4. Move the Dataset Lab's generator, critic and judge to open-weight models with permissive licences
   (Apache-2.0 or MIT) if any output may ever be used for training.
5. Evaluate Gemma 4 as the default node model, for the open-source claim.

## How to regenerate this register

```bash
pnpm licenses list --prod            # licence summary of the shipped tree
pnpm licenses list --prod --json     # machine-readable, for a full listing
grep -h "image:" infra/docker-compose.yml deploy/community-node/*.yml
node -e "for (const p of require('./apps/api/config/model-profiles.json').profiles) console.log(p.profile, p.provider, p.model)"
```

For a formal software bill of materials, a CycloneDX export (for example with `@cyclonedx/cyclonedx-npm`)
can be added to CI. It isn't set up yet.
