# Community Node Kit

Everything needed to run Afribit AI on one machine and serve a local network, with the model running on that machine. Read the [community node specification](../../docs/program/community-node.md) first for what a node is and what is still being measured.

## What you get

`web` (Caddy: HTTPS and the app) → `api` (Afribit AI) → `ollama` (the model), with `postgres` for the reviewed knowledge. In the default `node` mode **nothing leaves your network**: no cloud chat model, no cloud embeddings, no cloud account.

## What you need

- A Linux machine (or a VM) with Docker and Docker Compose. A modern desktop is enough to start; a GPU helps a lot. Measured numbers for modest hardware are in the [specification](../../docs/program/community-node.md#pilot-results-so-far).
- Enough disk for the model (several GB) and the database.
- A way for phones to reach it: community Wi-Fi, a router, or a mesh.

## Install

```bash
cd deploy/community-node
cp .env.example .env     # set POSTGRES_PASSWORD and JWT_SECRET; choose NODE_HOSTNAME
./first-run.sh
```

`first-run.sh` starts the database and model server, downloads the model, builds the app, runs migrations, loads the reviewed knowledge, and warms the model. With an NVIDIA GPU (and the NVIDIA Container Toolkit installed):

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

## Serving a different community

The node serves the Kibera and Nairobi Bitcoin pack by default. To serve another community, put its pack folder under `packs/` at the repository root, set `COMMUNITY_PACK=<folder name>` in `.env` before `first-run.sh`, and see [the community pack guide](../../docs/guides/community-pack-guide.md).

To show the community's own name, colour and logo, add a `branding` block to the pack (see [the white-label guide](../../docs/guides/white-label-guide.md)). The API serves it and the app picks it up at run time. The page title, the app's manifest and the pre-rendered app page are fixed when the web image is built, so the kit passes `COMMUNITY_PACK` to the web build too (`apps/web/scripts/brand.mjs`): after changing a pack's `branding` run `docker compose build web && docker compose up -d web`. With `COMMUNITY_PACK` empty (or `COMMUNITY_PACKS` used) the web image keeps Afribit's defaults for those three, and the app, which asks the API without naming a pack, shows the branding of the node's default pack.

To serve **several** communities from the one node, list their pack ids in `.env`:

```
COMMUNITY_PACKS=kibera-bitcoin,example-library
DEFAULT_PACK=kibera-bitcoin        # optional: who answers when a request names no pack
```

This replaces `COMMUNITY_PACK`. `first-run.sh` then loads the knowledge of every listed pack. Each pack must have its own id, retrieval domain and card ids, or the app refuses to start (`docker compose logs api` lists why). Apps pick a pack per request with the `x-pack` header or `?pack=<id>`; `https://<NODE_HOSTNAME>/api/v1/packs` lists what the node serves, and reviewers use `/review?pack=<id>`. All packs share the node's model, so check that it passes each community's language review. Leave `COMMUNITY_PACKS` empty for the single pack above, exactly as before.

## Tuning how the assistant talks (Voice Lab)

Set `VOICE_LAB=true` in `.env` and recreate the `api` container. Reviewers and administrators then open `https://<NODE_HOSTNAME>/voice` (or `/voice?pack=<id>`), edit the pack's wording, try answers with or without saving, and see history; saving takes effect at once, with no rebuild. The reviewed pack in git stays the baseline; the edits live in the `overrides` volume (`/data/overrides` in the container). **Back that volume up along with `pgdata`**, and export edits worth keeping back into the pack: `docker compose exec api sh -c "COMMUNITY_PACK_OVERRIDES_DIR=/data/overrides node dist/pack/overridesCli.js kibera-bitcoin /tmp/exported"`, then copy `/tmp/exported` out and into `packs/<id>/`. Leave `VOICE_LAB` empty and the page does not exist. How to use it: [the Voice Lab guide](../../docs/guides/voice-guide.md). Trying an answer on the node uses the node's own model, so it is slow on modest hardware (a try can take minutes).

## Settings that matter

| Setting | Meaning |
|---|---|
| `INFERENCE_MODE=node` | Local model only. Nothing leaves the network. If the model is down, answers come straight from the reviewed knowledge cards. **Default.** |
| `INFERENCE_MODE=hybrid` | Local model first, cloud if it fails. **Sends questions off your network** — tell your users. Needs `OPENROUTER_API_KEY`. |
| `LOCAL_LLM_MODEL` | Any Ollama model tag. Use the **smallest model that passes** your language checks. |
| `LOCAL_LLM_NUM_CTX` | Context window (default 8192). Our prompts run to about 5,500 tokens; Ollama truncates silently below that. |
| `LOCAL_LLM_NUM_GPU` | How many layers go on the GPU. Leave empty normally. If the model server crashes with `CUDA out of memory` on a small GPU, set a low number (0 = CPU only). |
| `LOCAL_EMBEDDING_MODEL` | The search model (default `bge-m3`). If you change it, run `docker compose exec api node dist/knowledge/embedBackfill.js` to re-index. |
| `NODE_HOSTNAME` / `CADDY_TLS` | The name phones use, and how its certificate is made. |

Semantic search runs on the node too: questions and knowledge cards are embedded by a small local model (`bge-m3`, about 1 GB, on the CPU), so finding the right card needs no cloud call. In our benchmark it found the right card in the top 3 for 97.5% of questions, against 82.5% for the hosted setup it replaces.

## Making phones trust the node

The app can only be installed, and a service worker can only run, over HTTPS. With no internet:

1. Keep `CADDY_TLS=internal`. Caddy makes its own certificate authority.
2. Export its root certificate: `docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./root.crt`
3. Give that file to each phone (a QR code or a local page) and have the user install it once as a trusted certificate. Steps differ by Android version and phone maker.

With a public domain name pointing at the node, set `CADDY_TLS` to your email address instead and a normal Let's Encrypt certificate is issued while the node is online; it keeps working offline until it expires.

Push notifications need the internet and will not work on a fully offline network. Chat does.

## Choosing a model

Do not pick the largest model you can fit. Run the standing language evaluation (see [evaluation](../../docs/evaluation/methodology.md)) against candidates and choose the smallest that passes, including on Sheng and the scam cases. Then measure how many people it can serve at an acceptable speed.

## Operating it

- Back up the `pgdata` volume (and `overrides` if you use the Voice Lab); test a restore.
- Update images deliberately, one at a time, and re-run the checks after changing the model.
- Give the node a named steward, power protection, and a physical location you can secure. See the [threat model](../../docs/security/threat-model.md) hardening checklist.
- Check `https://<NODE_HOSTNAME>/health/providers` — `local` should be healthy.

## Known limits

Images use `latest` tags (pin them for production), there is no per-device rate limit yet, and conversations are stored for history until the no-storage setting lands (see [data stewardship](../../docs/governance/data-stewardship.md)).
