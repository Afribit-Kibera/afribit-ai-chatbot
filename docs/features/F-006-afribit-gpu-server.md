# F-006 — Afribit's GPU server and the box → GPU path

**Status:** Agreed. Part 1 (the box) and part 2 (the gate, the tunnel, the host checklist) were built and tested
on 8 Oct 2026. It goes live when the GPU is in Kenya. · **Roadmap stage:** 2 · **Decision records:**
[ADR 0016](../adr/0016-afribit-local-community-box.md) (Afribit Local), [ADR 0018](../adr/0018-open-licensed-default-model.md)
(the model) · **Sized by:** [E-001](E-001-gemma4-and-gpu.md)

## Problem

Afribit Local puts a small **box** at the community and runs the language model on **Afribit's GPU server in
Kenya** (ADR 0016). The box holds the data: app, database, embeddings and backups. The GPU server answers
questions and keeps nothing.

Most of this already works. A node can point `LOCAL_LLM_BASE_URL` at any Ollama or OpenAI-style server. Four
pieces were missing:

1. **Embeddings followed the chat model.** The box would have sent every search embedding to the GPU server
   too. Search, and the card-only answers that are the fallback when that server is down, would then depend
   on the very server that is down.
2. **The node kit assumed the model was on the box.** It always pulled the chat model (several GB) and
   ignored a remote address and key.
3. **No GPU server design.** Nothing yet describes the server: how the "keeps nothing" promise is enforced and
   checked, one key and limit per community, the tunnel, or what is logged.
4. **The path itself was never tried end to end.** No one had run a real box against a remote GPU and measured
   it.

## What people see

- **Members:** nothing new to do. The app's label ([F-001](F-001-model-location-label.md)) says: "Your
  community's data stays on its own box. Questions are answered by Afribit's AI server in Kenya and are not
  stored there." If the GPU server is unreachable, answers come from the reviewed cards, as on any node.
- **The community's steward:** sets two values in the box's `.env` (the server's address and the community's
  key) plus `MODEL_LOCATION=afribit`. `first-run.sh` then skips downloading the chat model and checks that the
  server answers.
- **Afribit's operators:** one server, one key per community, usage counts per community (never text).

## How it works

### Part 1 — the box (built 8 Oct 2026)

- **`LOCAL_EMBEDDING_BASE_URL`** (with `LOCAL_EMBEDDING_API`, `LOCAL_EMBEDDING_API_KEY`): a separate server for
  embeddings. Empty, the default, means the chat model's server, as before. The node kit always sets it to the
  box's own Ollama (`bge-m3` on the CPU). A separate embedding server **never receives the chat server's key**.
- **Node kit:** `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_API` and `LOCAL_LLM_API_KEY` are now settings (default: the
  Ollama container). With a remote address, `first-run.sh`:
  - does not pull or warm the chat model;
  - checks that the server lists the model;
  - reminds the steward to set `MODEL_LOCATION`.

### Part 2 — the GPU server (software built and tested 8 Oct 2026; `deploy/gpu-server/`)

```
box (community)  ──WireGuard──▶  gate (key, limits, counts)  ──▶  Ollama (GPU)
  app, database,                   no bodies in any log              no debug logging,
  embeddings, backups                                                nothing written but model files
```

- **Ollama** serves the model: `gemma4:26b-a4b` at 4-bit, or whatever the reviewers choose under ADR 0018. It
  is what E-001 measured: on one RTX 3090, four people at once in 8.4 s. Move to vLLM only if several
  communities need more throughput than Ollama gives.
- **A small gate in front of it**, our own code in `deploy/gpu-server/`, short enough to read in one sitting:
  - checks the community's key (stored as a hash);
  - applies that community's rate and concurrency limits;
  - streams the request to Ollama and the answer back;
  - logs one line per request: community id, status, duration, tokens in and out. It never logs bodies.

  It refuses everything except the chat and model-list endpoints, so a box cannot pull, delete or copy models.
- **The tunnel.** Each box is a WireGuard peer. The box dials out, so it works behind the mobile and home
  routers common in Kibera (no public address needed). The gate listens only on the WireGuard interface; the
  only public port is WireGuard's. If a network blocks UDP, the fallback is HTTPS to the gate with the same
  key.
- **The host keeps nothing.** Writing "we do not log" is not enough; the host is configured so that it can't
  keep anything, and the checklist below verifies it:
  - Ollama debug logging off;
  - no swap, or encrypted swap;
  - core dumps off;
  - `/tmp` in memory;
  - journald size-capped;
  - operator logins logged;
  - full-disk encryption;
  - the machine in Kenya (Afribit's premises first, colocation later).
- **Usage reports** come from the gate's counts (tokens per community per day). That is what a monthly fee
  is based on. Learners never pay per question.

#### The gate's contract (agreed 8 Oct 2026, before building)

One file of plain JavaScript (`deploy/gpu-server/gate/gate.mjs`), Node's standard library only, no packages.

| Request | Answer |
|---|---|
| No key, or a key that matches no community | `401` |
| A key used from a WireGuard address that isn't that community's | `401` (a stolen key is useless from another box) |
| `POST /api/chat`, `POST /v1/chat/completions` | Passed to Ollama and streamed back |
| `GET /api/tags`, `GET /v1/models` | Passed to Ollama (the box's health check) |
| A model not on the server's allowed list | `403` |
| Anything else (`/api/pull`, `/api/delete`, `/api/copy`, `/api/create`, `/api/push`, `/api/embed`, `/api/generate`, …) | `403`; embeddings stay on the box |
| More than the community's requests per minute, or its concurrent requests | `429` with `Retry-After` |
| A request body over 512 KB | `413` |
| Ollama unreachable | `502` |
| `GET /healthz` | `200` when Ollama answers **and** every loaded model is fully on the GPU, else `503`. No key needed; it is reachable only on the tunnel |
| `GET /usage` with the operator key | Counts per community per day; never text |

- **Keys** live in `keys.json` as SHA-256 hashes, one entry per community. Each entry also holds that
  community's WireGuard address and its limits. The key itself is shown once, by `add-community.sh`.
- **Nothing from the box is passed on except the body.** The key and any other headers stop at the gate.
- **One log line per request:** time, community, method, path, model, status, milliseconds, tokens in and out.
  Never a body, a key or an address.
- **Usage counts** (requests and tokens per community per day) are kept in memory and written once a minute
  to `usage/<YYYY-MM>.json`. That file is the only thing the gate writes. It holds counts only.
- **Tokens** are read from Ollama's own final counts (`prompt_eval_count`, `eval_count`, or OpenAI-style
  `usage`). To find them, the gate keeps only the last few kilobytes of each answer, in memory, while it
  streams.

### Interim: RunPod in place of the Kenyan server (agreed 8 Oct 2026)

Until the GPU is bought or rented in Kenya, a RunPod pod stands in to confirm the path works:

- **Test questions only.** No learner traffic ever goes to a GPU abroad (ADR 0016).
- The pod runs Ollama with the same model. The box reaches it through RunPod's HTTPS proxy. There is no gate or
  WireGuard for this test: the pod's address is unguessable and it lives for under an hour.
- A watchdog deletes the pod however the test ends.
- **What it measures:**
  - the box's own smoke test passes;
  - the app reports `modelLocation: "afribit"`;
  - no embedding request reaches the pod;
  - answer time from the box, for one person and for four at once;
  - card-only answers with working search when the pod is stopped.

### Result of the RunPod confirmation (8 Oct 2026)

**The path works.** A box built with the real node kit on a laptop in Nairobi used a RunPod GPU in Romania for
the model. Details are in the [test log](../book/test-and-evaluation-log.md), entry 2026-10-08-i.

| Check | Result |
|---|---|
| `first-run.sh` with a remote model | Checked the server, skipped the chat-model download, made all 86 search embeddings on the box |
| Members are told | `GET /api/v1/pack` → `modelLocation: "afribit"`, retention `none` |
| Box smoke test | **35 of 35** |
| Embeddings stay on the box | The box's Ollama served 32 embedding calls and no chat calls. The pod never had the search model |
| Nothing stored | 84 messages, **none with text** (`CHAT_RETENTION=none`) |
| One person | First words in **2.2–5.4 s**, full answer in **6.8–14.8 s** (5 test questions) |
| Four at once | First words in 6.8–8.5 s; all four done in **29.8 s** |
| GPU server gone | Card-only answers in **0.3–1.1 s**; search still worked (confidence 0.70–0.80) |

These times include about 0.6 s per round trip from Nairobi to the pod. The box also used the long prompt
(`PROMPT_MODE=full`). The GPU was probably an L4: RunPod didn't name it, but the price and the times match
E-001's L4 run (8.1 s and 24.2 s). A Kenyan server with a 3090/4090-class card should be faster on all three
counts.

**What the run taught us** (each is now a requirement or a follow-up):

1. **A GPU host can silently run the model on its CPU.** One RunPod host's driver didn't work with the current
   Ollama image. Ollama loaded the model with **0 GB on the GPU** and answered at 3.4 tokens/s: 50–125 s per
   answer, and one fell back to the cards. Nothing reported an error. **The GPU server's health check must
   fail when the model is not fully on the GPU** (acceptance test 8), and the gate should report it.
2. **Card-only answers are in English.** During an outage a Sheng question gets the card's English wording.
   That wording is safe ("must never be shared"), but it is not what the member asked for. Follow-up: say in
   the member's language that the AI server cannot be reached, and show reviewed Sheng or Kiswahili wording
   where it exists.
3. **The node's console wasn't reachable.** The kit's web server didn't route `/pilot`, so a node had no
   console (reports, suggestions, invitations). Fixed in the kit, and tested in a browser on the box.
4. **The smoke test assumed history is stored.** It now checks that a no-storage server kept no text.

## Data and privacy

- **The GPU server sees, in memory only:** the community's prompt rules, the reviewed cards found for the
  question, a short recent history (up to 8 turns), and the question.
- **It stores nothing of this:** no conversation, no account and no embedding.
- **The box keeps everything it keeps today,** under its own retention setting ([F-002](F-002-privacy-settings.md)).
- **Afribit is a data processor** for each community while a question is in transit. A data processing
  agreement and the legal review in [data stewardship](../governance/data-stewardship.md) come before the
  first paying community.

## Acceptance tests

1. **Embeddings stay on the box.** With a separate embedding server, embeddings go there in its own API style.
   The chat server's key is never sent to it (`test:embeddings`, built). On the RunPod run, the pod sees no
   `/api/embed` requests.
2. **Members are told the truth.** A box with `MODEL_LOCATION=afribit` reports `modelLocation: "afribit"`.
3. **A down server degrades safely.** With the GPU server unreachable, the box answers from the cards and its
   search still uses its own embeddings.
4. **The gate.** A missing or wrong key gets 401. Over the limit gets 429. A pull, delete or copy request is
   refused.
5. **No text in logs.** A canary phrase sent through the gate appears in no log on the server (gate, Ollama,
   journald).
6. **The host checklist passes:** swap, core dumps, debug off, open ports, disk encryption.
7. **Speed from a Kenyan box:** median and slowest answer time, for one person and for four at once, from the
   pilot box over its real uplink.
8. **The model is really on the GPU.** The server's health check fails, and the gate reports it, when the
   model's memory on the GPU (`/api/ps` → `size_vram`) is less than its size.

**Where each test stands (8 Oct 2026):**

| Test | Status |
|---|---|
| 1, 2, 3 | Passed on the RunPod runs, with a box on a laptop |
| 4 (the gate) | Passed in the gate's tests (`test:gate`), the tunnel rehearsal and the real-GPU run |
| 5 (no text in logs) | Passed for the gate's log and usage file in all three. On the real server, `check-host.sh` repeats it with a canary across the gate, Ollama, the journal and `/var/log` |
| 6 (host checklist) | `harden-host.sh` and `check-host.sh` written; they run on the real server |
| 7 (speed from a Kenyan box) | Measured from Nairobi against pods in Romania; repeated from the pilot box once the server is in Kenya |
| 8 (model on the GPU) | Passed: the gate's `/healthz` read a real GPU (100% on the GPU), and fails on a CPU fallback in the tests |

### Results of part 2 (8 Oct 2026)

- **The gate's tests: 14 of 14** (`node --test deploy/gpu-server/gate/gate.test.mjs`, in `pnpm test`).
- **Tunnel rehearsal: 18 of 18.** The real scripts and gate ran on throwaway Linux containers: one server, two
  boxes and an outsider.
  - The server end came up, with forwarding from the tunnel dropped.
  - Each box made its own key pair and was added with a tunnel address and a key shown once.
  - Asking through the tunnel with the box's key worked. Without the key: 401. With the other box's key,
    from the wrong address: 401. A model pull: 403.
  - The boxes route only the GPU server through the tunnel. An outsider on the same network reached neither
    the gate nor Ollama.
  - Removing one community cut it off and left the other working.
  - The gate's log and usage file held no text, key or address.
- **The whole path with a real GPU** (Gemma 4 26B-A4B on a RunPod pod in Romania, test questions only): box →
  gate → Ollama.
  - Box smoke test **35 of 35**.
  - One at a time: first words in **1.1–1.8 s**, full answers in **2.4–4.0 s**. Four at once: all done in
    **7.8 s**. That is about E-001's RTX 3090 figures, so the gate adds no noticeable delay.
  - The gate counted tokens on all 19 real answers. Its log and usage file held no question, key or address.
  - With the pod deleted: `/healthz` returned 503, and the box answered from its cards in 0.6 s.

## Not in this feature

- Several communities' adapters on one server (ADR 0015, later).
- Billing and provisioning tools.
- Confidential computing.
- A second GPU for failover. It is a later decision, once one GPU is in use.

## Decisions

1. **Our own small gate.** Agreed 8 Oct 2026. It is auditable and counts tokens per community. Caddy with a
   rate-limit plugin was the alternative.
2. **WireGuard plus a key per community,** with HTTPS plus the key as the fallback. Agreed 8 Oct 2026.
3. **Still open: where the GPU sits first,** Afribit's premises or a Kenyan provider. This follows the
   purchase/rental decision ("for now, RunPod").

## Depends on

- E-001: the model and the GPU size (24 GB).
- F-001: the label.
- F-002: the box's retention.
- A GPU in Kenya, for part 2.
