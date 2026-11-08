# Dependency register

**6 November 2026, F-034:** adopts Open Notebook as a restricted external source-management
runtime, with SurrealDB and a fixed-destination socat relay. The proof uses pinned Docker digests
listed in the [source-engine guide](../guides/open-notebook-source-engine.md), password auth,
internal source/database networking and a127.0.0.1-only relay. No source UI/database published,
provider keys, extraction/embedding calls or model-weight downloads. Runtime credentials are in
an ignored private env file, never in the frontend. Uses upstream MIT-licensed API; inspected
commit and image identity recorded, not a security audit. No new JavaScript package dependency.
Existing PGlite/Fastify and browser tooling verify owner/community isolation and erasure; images
and local Docker volumes are the new runtime footprint. OpenRouter regenerated one decorative
clip for$0.12; native SVG is coded. [Trials](../evaluation/trials/2026-11-06-green-education-notebooks.md).

**28 October 2026, F-033:** no new dependency/service/model download. Reuses Fastify/rate-limit,
PGlite/pgcrypto, bcrypt/JWT, existing routes and built React app for a temporary synthetic LAN node.
Serialized in-memory pool adapter never opens configured PostgreSQL. Model providers absent, fetch
egress refused, reviewed-only scope enforced. UI UUID helper uses native crypto or getRandomValues,
no insecure RNG/package. Cached Playwright CLI reused; React component checklist applied. No TLS,
PWA or production deployment claim. [All trials](../evaluation/trials/2026-10-28-running-member-lan-node.md).

**28 October 2026, F-032:** no new package/service/model/runtime. Operator-only language preview
reuses existing CommunityPack fields, full/compact/serve builders, AsyncLocalStorage, conservative
context admission and UUID journals. No provider/install/activation path or production pack edit.
Adds root13-case preflight plus engineering fixtures/protocol; full tests/typecheck/build pass.
[Every trial and frozen identity](../evaluation/trials/2026-10-28-language-iteration-preparation.md).

**28 October 2026, F-031:** no package install, model download or paid service. Extends the existing
plain-HTML/Node blind-review builder/scorer and PGlite/Fastify rehearsal. Browser verification reused
cached Playwright CLI0.1.22 and the installed browser; temporary loopback static serving used Python's
standard library. Server/browser stopped, no global/network setting change. Added root6-case review
suite, future message-metadata export, actual owned socket-loss/recovery check. Full tests/typecheck/
build pass. [Every trial and limitations](../evaluation/trials/2026-10-28-review-and-network-acceptance.md).

**28 October 2026, F-030:** no new dependency or application runtime change. The F-029 source-matching
hook ran4 actual synthetic normal-API requests on the existing pinned Ollama0.40.11/Node22.23.4/
Python3.12.3 rental with explicit8192 context. All6.58GB referenced model bytes verified on rental;
no laptop weights/global install, training, image publication or production migration/deployment.
Controller fork uses existing HTTP2 adapter, bootstrap and separate scoped watchdog, with a smaller
$.24/ten-minute allowance. [Actual measurements and limitations](../evaluation/trials/2026-10-28-community-live-rental.md).

**28 October 2026, F-029:** no new package/service/tokenizer/model artifact. Reuses PGlite/pgcrypto,
Fastify/JWT, existing SQL retrieval/memory, native Ollama adapter, worker/gate and Node/Python stdlib.
Context estimation moved to the shared prompt layer with the showcase re-export retained. An explicit
async operator scope enforces native context/completion; no default deployment prompt setting changed.
Two owned loopback workers and simulated model declarations are test dependencies, not real GPU/TLS
evidence. Updated worker accepts context8192 explicitly, default4096 unchanged. Bootstrap compiled only;
no setup/download/global install/image publication or account call. [Runbook](../guides/community-rental-live-run.md),
[trials](../evaluation/trials/2026-10-28-community-rental-preparation.md).

**28 October 2026, F-028:** no new package, tokenizer/model artifact, service or runtime setting.
The showcase reuses the existing compact pack builder and Node UTF-8 byte counting, with explicit
framing/output allowances. This is a conservative estimator, not an installed model tokenizer.
Only localhost fixture inference was used; read-only RunPod billing observations populated prior
charges and confirmed no active Pods. [Guide](../guides/showcase-context-headroom.md) and
[all new trials](../evaluation/trials/2026-10-28-context-headroom.md). No new paid rental or training.

**27 October 2026, F-027 rental worker:** no new npm/pip package or laptop model download. The
existing GPU gate runs under portable Node **v22.23.4**, downloaded only inside the rental from the
[official archive](https://nodejs.org/download/release/v22.23.4/node-v22.23.4-linux-x64.tar.xz).
The [runtime pin](../evaluation/rental-node-runtime-2026-10-27.json) fixes 31,029,996 bytes and SHA-256;
the first actual worker verified both and recorded its extracted binary hash. Pinned upstream
`ollama/ollama` ran **0.40.11**; observed Python **3.12.3**, Ubuntu packages
`python3=3.12.3-0ubuntu2.1` and `libstdc++6=14.2.0-4ubuntu2~24.04.1`. Packages are resolved from signed
Ubuntu repositories, not frozen as a reproducible image. No custom image was published. Model pulls
and verification are confined to disposable rental storage. The new v2-manifest handling preserves
all frozen model hashes; QVAC remains uninstalled. [Actual worker trials](../evaluation/trials/2026-10-27-rented-model-worker.md).
The fourth session verified the 6.58 GB model, ran 16 synthetic comparisons and exported real driver
595.91.07/device telemetry. Four outputs hit context4096; no deployment/model-default approval follows.

**27 October 2026, operator canary:** official runpodctl **v2.14.0** portable Windows amd64 binary,
14,472,704 bytes, verified SHA-256 from the pinned official release; retained under local `output`,
not installed on PATH or shipped in the application. Child authentication used the environment.
The CLI initialized a 53-byte user config with an empty credential field. A public-assets tar archive
was built/round-trip verified using Python stdlib; no model weights, private data or credentials included.
Experimental Node HTTP/2 scripts used normal TLS verification, with no new npm package or change to
the default production transport. The [report](../evaluation/trials/2026-10-27-runpod-lifecycle-canary.md)
records all successes/failures, actual Pod deletion/absence and pending billing. No model runtime was
installed on the laptop; the short remote canary used the pinned Node image solely for lifecycle work.

**27 October 2026, F-026:** Python standard-library installed-store verifier, no new npm/pip package.
The [frozen metadata](../evaluation/rental-artifacts-2026-10-27.json) identifies existing Ollama Gemma 4
E4B/26B Q4 candidates and publisher-reported amd64 Ollama/Node image digests. Public metadata only:
no weight/image-layer download, container install, training or provider mutation. Upstream images and
driver compatibility remain unqualified. See the [guide](../guides/rental-model-integrity.md).

**27 October 2026, F-025:** optional rental-control HTTPS compatibility uses existing Node `https`/
`http` and a normal verified TLS 1.2 agent, with no package/global TLS setting/certificate exception.
Fetch remains the default and there is no automatic transport fallback. Seven fixtures pass; live
access remains intermittent. [Evidence](../evaluation/trials/2026-10-27-runpod-access-followup.md).

**27 October 2026, F-024:** a Python-standard-library telemetry helper and fixture suite add an
operational/test dependency on Python (documented target 3.10+, tested 3.12.10). There is no new npm/pip
package, driver install or paid service. A real GPU run additionally requires the rental's NVIDIA
driver and `nvidia-smi`; fixtures inject synthetic output and never invoke a GPU. See the
[telemetry guide](../guides/rented-gpu-telemetry.md). RunPod REST v1 was contacted once read-only as a
documented alternate-host diagnostic; it timed out and is not adopted as a runtime fallback.

**27 October 2026, F-022:** no new npm package, driver, global runtime or paid service. An explicitly
acquired portable official llama.cpp CPU archive and a pinned Qwen GGUF live in ignored local output
directories, verified by size/SHA-256. Windows PowerShell performs guarded ZIP extraction. This is
an upstream runtime, not an installed QVAC SDK. See the [local guide](../guides/local-cpu-trial.md) for
versions, resource bounds and licenses; the first model is held from learner use after real outputs.

**26 October 2026, F-021/QVAC review:** no QVAC SDK/binary, model weight, new package or paid service
installed. A bounded public Hugging Face metadata reader uses existing Node fetch/crypto. QVAC SDK,
weight/base/adapter and dataset licenses are separate; see the [assessment](../research/2026-10-26-qvac-and-afribit-fit.md)
and [discovery guide](../guides/model-discovery.md). Public metadata is not runtime or license clearance.

**26 October 2026, F-020:** no new package or paid service. Node's existing fetch/filesystem/crypto APIs
support trial records and a minimal RunPod REST v2 GET/DELETE adapter. Official API/storage references
are in the [rental guide](../guides/rental-watchdog.md). Only localhost fixtures were contacted; no
provisioning, billing integration or independent supervisor is installed.

**26 October 2026, F-019:** no new runtime dependency or paid service. The showcase CLI uses existing
provider transports and Node filesystem/async scope/crypto APIs for locking, reservations and evidence.
No RunPod lifecycle/billing integration is installed; see the [evaluation guide](../guides/showcase-evaluation.md).

**26 October 2026, F-018:** no new runtime package or paid service. Compute admission uses existing
PostgreSQL and Node transport cancellation. OpenRouter request-option compatibility is documented in
the [compute policy guide](../guides/community-compute-policy.md); real billing/region conformance is
unverified. Hosted embedding dispatch is disabled under admission until its bounded adapter is verified.

**26 October 2026, F-017:** no new runtime dependencies. Processing scope uses Node AsyncLocalStorage,
the existing PostgreSQL/gateway/provider stack and lexical search. Localhost HTTP fixtures exercise
transport without external services, real models, rental credentials or paid compute.

**26 October 2026, F-011/F-016:** no new runtime dependencies, cloud service or model are required for
personal notes and reviewed sharing. They use the existing PostgreSQL, gateway and React stack.
Promoted cards currently use lexical retrieval; generic embedding backfill excludes them.

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
| Rented GPUs (RunPod: benchmarks and the F-006 path test) | Measuring speed; standing in for Afribit's GPU server until one is in Kenya | Benchmark and test questions only, never a learner's | No |

## 5b. Changes on 8 October 2026 (F-001, F-002, F-003, F-012, F-006)

- **No new runtime dependencies.** The features use Fastify, `pg` and React, all already listed.
- **New database migrations:** `016_privacy_settings.sql`, `017_teach_suggestions.sql`.
- **New settings:** `MODEL_LOCATION` (auto | community | afribit) and `CHAT_RETENTION` (none | Nd | keep;
  default 30d; the node kit defaults to none).
- **Added (dev only):** PGlite (`@electric-sql/pglite` **0.5.8**, pinned, Apache-2.0), PostgreSQL compiled to
  WebAssembly. `pnpm --filter @afribit/api test:db` applies every migration to an empty database and runs the
  F-002/F-003 SQL against it (16 checks), with no Docker. It has no pgvector, so vector columns become arrays
  in that check. It is part of `pnpm test`, and so of every release. It is not shipped: the runtime uses `pg`
  against the real server.
- **F-012 (later the same day):** no new dependencies (Node's `crypto` for codes and hashes). Migration
  `018_invitations.sql`. New setting `REGISTRATION` (invite | closed | open; default invite).
- **F-006 part 2 (Afribit's GPU server, `deploy/gpu-server/`):** no new packages. The gate uses only Node's
  standard library.
  - Images: `node:22-alpine` (MIT) runs the gate; `ollama/ollama` (MIT) runs the model. Pin both in the
    server's `.env`.
  - On the server and on boxes: WireGuard (`wireguard-tools`, GPL-2.0), and on the server Ubuntu's `ufw` and
    `iptables`. These are operating-system packages; nothing is shipped in our code.
  - Test only: the tunnel rehearsal builds a throwaway image from `node:22-alpine` with `wireguard-tools`,
    `iproute2`, `iptables`, `bash` and `curl` (`internal/experiments/2026-10-08-gate-tunnel/`).
- **F-006 part 1:** no new dependencies. New settings `LOCAL_EMBEDDING_BASE_URL`, `LOCAL_EMBEDDING_API`,
  `LOCAL_EMBEDDING_API_KEY`; the node kit now passes `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API` and
  `LOCAL_LLM_API_KEY` through.

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
