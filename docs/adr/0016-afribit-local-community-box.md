# ADR 0016 — Afribit Local: a community box with Afribit's GPUs

**Status:** Accepted, 8 October 2026. Partly built: the node can already use a remote model server. The
tunnel, the hardened GPU server, the model-location label and provisioning are planned.

**Context:**

Many communities that want their own assistant cannot run a community node themselves. A node needs a
10–16 GB GPU, power protection and someone to look after it (see the
[community node specification](../program/community-node.md); a 2014 desktop with a 4 GB GPU measured
far too slow). We want a paid option for them that keeps the promise that matters most: the community's
data stays with the community. It must also pay for the GPUs and the work of running them, without
charging learners per question.

We considered three ways to run it:

| Option | Data lives | Model runs |
|---|---|---|
| A. Self-hosted | Community's machine | Community's GPU |
| **B. Community box + Afribit GPU** | **A small box at the community** | **Afribit's GPU server in Kenya** |
| C. Fully hosted | The community's isolated space on Afribit's servers in colocation | Afribit's GPUs |

**Decision:** The first managed option is **B**.

- **The data plane stays at the community.** A small box runs the unchanged node kit: web app, API,
  database, local embeddings (bge-m3 on the CPU) and backups. A modest PC is enough, because the box
  never runs the language model. The pilot's 2014 desktop qualifies.
- **The model runs on Afribit's GPU server in Kenya.** The box uses `INFERENCE_MODE=node` with
  `LOCAL_LLM_BASE_URL` pointing at that server over an encrypted tunnel (WireGuard), plus a per-community
  key (`LOCAL_LLM_API_KEY`). The server speaks the Ollama or OpenAI-compatible API that `LocalProvider`
  already supports. Each request carries the question, the retrieved cards and a short recent history, as
  in any node.
- **Rules for the GPU server:**
  - It keeps nothing: no prompt or answer logging, no request bodies in logs, nothing written to disk.
  - It sits in Kenya: Afribit's premises first, a Nairobi colocation facility once several communities
    use it.
  - Each community has its own key and rate limit.
  - Rented GPUs abroad are for benchmarks only and never carry a learner's question.
- **If the GPU server is unreachable,** the box answers from the reviewed cards, as a node does today. It
  falls back to a hosted cloud model only if the community has chosen `hybrid` mode and tells its users so.
- **The label is honest.** Members are told: "Your community's data stays on its own box. Questions are
  answered by Afribit's AI server in Kenya and are not stored there." The app learns where the model runs
  from a setting (planned: a model-location field the API publishes), so the banner can't overstate it.
- **Same open-source software.** The managed option uses the same node kit anyone can self-host. The only
  extra pieces (provisioning, billing, fleet health) hold no community content.
- **Price.** Communities pay a monthly fee; learners never pay per question. No price is set until the
  Kibera pilot measures what serving a community costs.
- **Option C waits** until after an independent security review of B, and until there is a community that
  cannot keep a box.

**Why B before C:**

- "The data stays with the community" is literally true in B; in C it is a contract.
- Afribit holds no stored community data in B, which keeps the legal and security burden small.
- B reuses the node kit and a code path that already works.
- The box can later get its own GPU (becoming option A) without moving any data. Only the model's
  address changes.

**Consequences:**

- Afribit processes questions in transit, so it is a **data processor** for each community. That needs
  a data processing agreement, and a legal check of Kenya's registration rules and the ODPC's
  cross-border guidance (data that stays in Kenya avoids the latter).
- The **GPU server becomes critical infrastructure**: hardening, monitoring, a spare, and a capacity plan
  (how many communities share one GPU depends on peak demand, which the pilot measures).
- **The no-internet promise weakens.** A box needs its uplink to reach the GPU; with the uplink down it
  serves cards only. A community that needs offline answers needs its own GPU (option A).
- **New work:**
  - The tunnel and its setup in the node kit.
  - The hardened GPU server configuration.
  - The model-location label.
  - A provisioning script for boxes.
  - Per-community keys and usage reports on the GPU server.
  - Later, per-community adapters loaded by the GPU server (ADR 0015).
