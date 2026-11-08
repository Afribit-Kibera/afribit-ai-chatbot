# Community Node Specification

A **community node** is one machine, run by a community, that serves Afribit AI to everyone on a local network. This document says what it is, how to run one, and — importantly — what is measured versus assumed.

> Status: the software is built and tested; one low-end machine has been measured; the community mesh has not been tested. Sections marked *(to validate)* are hypotheses the pilot must confirm.

## Architecture

```text
 phones / laptops on the local network (Wi-Fi, community mesh)
          │  https://afribit.local   (HTTPS is required for the app to install)
          ▼
   ┌─ web (Caddy) ───────────── serves the app, proxies /api
   │        ▼
   ├─ api (Afribit AI) ──────── safety checks, retrieval, prompt, post-processing
   │        ├──► postgres ───── reviewed knowledge, language data, accounts
   │        └──► ollama ─────── the language model (any Ollama-supported model)
   └─ nothing else: no cloud call in `node` mode
```

The same API image runs in the cloud or on a node; the difference is configuration ([ADR 0009](../adr/0009-inference-modes-and-privacy.md)). The deployment kit is in [`deploy/community-node/`](../../deploy/community-node).

## Privacy modes

| Mode | What leaves the network |
|---|---|
| `node` (default for nodes) | **Nothing.** No cloud chat, no cloud embeddings. If the model is down, the API answers straight from the reviewed knowledge cards. |
| `hybrid` | A question goes to a hosted model **only if the node fails**. Opt-in; must be disclosed to users. |

In `node` mode questions are embedded by a small local model (`bge-m3`) as well, so semantic search needs no cloud call ([ADR 0013](../adr/0013-local-embeddings.md)).

## Hardware

What we measured (full tables in the [evaluation](../evaluation/methodology.md#real-hardware-speed-a-rented-gpu-as-a-proxy-for-what-a-community-could-buy)):

| Machine | Model | Speed | Verdict |
|---|---|---|---|
| 2014 desktop, 4 GB GPU, 4 cores | Gemma 3 12B (4-bit) | 1.5 tokens/s; 32–85 s before the first word | **Not viable** for live chat |
| Rented RTX A4000, 16 GB (about $0.17/hr) | Gemma 3 12B (4-bit) | ~20 tokens/s; a whole answer in 10–19 s; 4 people at once all answered in ~14 s | **A comfortable service** |
| Rented RTX 3080, 10 GB (about $0.17/hr; fast memory) | Gemma 3 12B (4-bit) | ~31 tokens/s; one answer in ~6 s; 4 people at once in ~20 s (served two at a time) | **Works** — the model fits in 10 GB |

So a community node needs a **GPU with 10 GB or more, ideally 16 GB**, and **fast memory matters as much as size**: a budget 12 GB card with slower memory (an RTX 3060, say) should be roughly half as fast as the 3080 — an estimate we have not measured, to confirm in the pilot. Rented-GPU prices are only a proxy for what a community would pay to buy.

Three things we learned:

- **Choose the model before the machine.** Gemma 3 12B (about 8 GB at 4-bit) passed all 15 of our language cases; the Qwen3 models failed Kiswahili at every size. Find the smallest model that passes, then size the hardware.
- **The prompt is half the cost.** Our full prompt was 4,000–5,500 tokens; the compact one is about 900 and scored higher ([ADR 0010](../adr/0010-compact-prompt-and-the-waiter.md)).
- **No GPU? You can still be a node.** A small server (including the 2014 desktop) can run the app, the database and the waiter's lighter work, while a hosted zero-retention chef sees only a scrubbed English ticket (`hybrid` mode with the restaurant pipeline). Everything is stored locally. Questions are not kept off-network the way they are with a GPU node — be clear with users which mode you run.

## Without a GPU: Afribit Local (a box plus Afribit's GPU)

A community that cannot buy or look after a GPU can keep a **box** — any modest PC that runs the node kit, its database, local embeddings and backups — and send only the model's work to **Afribit's GPU server in Kenya** ([ADR 0016](../adr/0016-afribit-local-community-box.md)). The configuration is ordinary `node` mode with the model server's address changed:

```bash
INFERENCE_MODE=node
LOCAL_LLM_BASE_URL=https://<afribit-gpu-server>   # reached over an encrypted tunnel (WireGuard)
LOCAL_LLM_API=openai                              # or ollama, whichever the server speaks
LOCAL_LLM_API_KEY=<this community's key>
```

What changes for the community:

| | Own GPU (self-hosted) | Afribit Local box |
|---|---|---|
| Where the data lives | The node | The box |
| What leaves the network | Nothing | Each question with its retrieved cards and recent history, to Afribit's GPU server in Kenya, which answers and stores nothing |
| No internet | Full answers | Answers from the reviewed cards until the uplink returns |
| Cost | Hardware, power, a steward | A monthly fee, a small box, power |

**Status:** `LocalProvider` already talks to a remote Ollama or OpenAI-compatible server with a key, so the code path works. Not yet built: the tunnel in the kit, the hardened GPU server (no prompt logging, nothing on disk, a key and rate limit per community), and a model-location setting so the app's privacy banner states where the model runs. Moving from a box to an own GPU later moves no data: only `LOCAL_LLM_BASE_URL` changes.

## Which model

The default is `gemma3:12b`. It passed all 15 of our language cases and fits a 10 GB card at 4-bit, but its licence is Google's Gemma Terms of Use, which is not an OSI-approved open-source licence. **Gemma 4 (Apache-2.0) becomes the default where it matches Gemma 3 on our tests and fits the GPU** ([ADR 0018](../adr/0018-open-licensed-default-model.md)): Gemma 4 26B-A4B passed 15 of 15 in our hosted model search, Measured on 8 October 2026 ([E-001](../features/E-001-gemma4-and-gpu.md)):

- **26B-A4B** is 18 GB at 4-bit, so it needs a **24 GB** GPU. It scored 14/15 and was accurate on 15/15. On an RTX 3090 it answered one person in 3.5 s and four at once in 8.4 s.
- **E4B** is 6.6 GB and scored 14–15/15. It is the candidate for small nodes; speed on an 8–12 GB card is not yet measured.
- **31B** is too slow on a 24 GB card.

Once the reviewers' blind comparison agrees, the kit default moves to E4B, with 26B-A4B recommended for 24 GB cards. Override per node with `LOCAL_LLM_MODEL`.

## Running one

```bash
cd deploy/community-node
cp .env.example .env        # set POSTGRES_PASSWORD, JWT_SECRET, NODE_HOSTNAME
./first-run.sh              # pulls the model, builds, migrates, loads the reviewed knowledge
```

With an NVIDIA GPU add `-f docker-compose.gpu.yml`. See the kit's README for every setting.

## Networking

- **HTTPS is mandatory.** Browsers only allow installing the app and using a service worker on a secure origin. On a network with no internet use Caddy's local CA (`CADDY_TLS=internal`) and have each phone trust it once; with a public name, a Let's Encrypt certificate is issued while online and keeps working offline until it expires.
- **Naming.** Phones need a stable local name (e.g. `afribit.local`) or a captive-portal page that points to the node.
- **Push notifications need the internet** (they go through the browser vendor's push service), so they do not work on a fully offline network. Chat does.
- **The community mesh is untested.** Whether it carries local traffic without an uplink, its coverage and its uptime are to be proven with real hardware.

## Operating a node

- **Power.** Outages are the main availability risk; plan a UPS or solar and graceful shutdown.
- **Security.** The node is a physical target and a data store: disk encryption, minimal logging, no default accounts, updates. See the [threat model](../security/threat-model.md).
- **Rate limiting.** Free access means anyone on the network can use it; per-IP limits exist, per-device limits are planned.
- **Updates.** Knowledge and language content ship as reviewed versions; models change rarely and are evaluated with the same rubric before being switched.
- **Stewardship.** A named steward owns each node and its upkeep ([governance](../governance/governance.md)).

## What we measured

**The community's own spare machine.** A 2014-era desktop (Intel Core i7-4790K, 4 cores and 12 GB RAM allocated, a 4 GB GTX 980) running models under Ollama through the same `LocalProvider` and `node_chat` profile that ship in this repository, with no cloud key set.

| Model | Cases run | Passed our rubric |
|---|---|---|
| Qwen3 8B | 8 | **0** — consistent with its 3 / 15 in the hosted model search |
| **Gemma 3 12B** | 4 (Sheng scam, Kiswahili, English, Sheng) | **4 / 4**, no unsafe-content flags |

| Case | Prompt | Time before the first word | Generation | Whole answer |
|---|---|---|---|---|
| English question | 2,013 tokens | 32 s | 1.6 tokens/s | 118 s |
| Kiswahili question | 2,298 tokens | 38 s | 1.5 tokens/s | 217 s |
| Sheng, fees | 5,318 tokens | 60 s | 1.5 tokens/s | 172 s |
| Sheng, scam | 5,383 tokens | 85 s | 1.5 tokens/s | 159 s |

Quality is there; speed is not. **This machine cannot serve a live chat with a local model** — that is the evidence a community needs before buying hardware, and it cost nothing. With a tiny prompt it began answering in 4 seconds, which is why the compact prompt matters. Ollama's automatic GPU split also crashed with *CUDA out of memory* on the 4 GB card, so the kit has a `LOCAL_LLM_NUM_GPU` setting.

**A rented 16 GB GPU** (RTX A4000, about $0.17 per hour), same model, compact prompt (a 10 GB RTX 3080 also ran it: see the table above and the [evaluation](../evaluation/methodology.md)):

| Measure | Result |
|---|---|
| Reading the prompt | full prompt 3.8 s; compact about 1 s |
| Writing the answer | ~20 tokens/s |
| One answer | 10–19 s |
| 4 people asking at once | all answered in 14.4 s (about 20 tokens/s each) |
| 8 people at once | 38.6 s (two waves of 4) |
| The real API end to end (waiter rewrite + compact prompt + local model) | 15–21 s per question |

The software path works end to end: the real gateway, `LocalProvider`, the waiter and the compact prompt answered and streamed with no cloud key, reported healthy, and — pointed at a node that was down — failed cleanly without calling the cloud.

These are short runs. Capacity under real use, power draw and the mesh are what the pilot adds.

## Known gaps

- **Blind review** by community Sheng speakers of the compact prompt and the restaurant pipeline before either is switched on.
- **A GPU-sized capacity test** with real people, and power draw.
- Prefix caching for the shared part of the prompt; offline cards on the phone.
- Per-device rate limits; a node status page for operators.
- The mesh (needs hardware).
