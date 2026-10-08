# The Afribit Community Node Program

**One line:** a community's own AI, starting with Bitcoin education — it feels like any AI chat, teaches in the community's language (Sheng, Kiswahili and English for Kibera), keeps the community's data on hardware the community controls, is free for learners, and learns only through gates the community controls.

## The problem

1. **Wrong register.** Most AI assistants answer in formal textbook Kiswahili even when asked in Sheng, and most Bitcoin material assumes you already understand banks and networks. Beginners switch off — and people who stay are easy targets for scams.
2. **Wrong place.** Useful AI today means an account, a card or a data bundle, and a connection to someone else's servers. The people with the most to gain from clear Bitcoin education are often those least able to pay per question, and least able to trust a distant company with what they ask.
3. **Wrong owner.** The language, the knowledge and the questions of a community end up in systems the community neither owns nor can inspect.

## The approach

Think of a restaurant ([ADR 0012](../adr/0012-the-restaurant-pipeline.md)):

- The **customer** asks in Sheng, Kiswahili, English or a mix.
- The **waiter** — a small model that speaks the customer's language — writes a neutral order ticket, and at the end serves the answer back in the customer's own words. It runs on the community's own machine.
- The **chef** — the best available larger model, optionally hosted with zero data retention — cooks from that ticket and the community's reviewed knowledge. It never sees the customer's words, name or dialect.
- The **pantry** is the community's reviewed knowledge. It is the only source of facts, and nobody — human or model — approves their own work.

What the community owns is the **harness**: the waiter's language rules, the safety floor, the knowledge, the evaluation and the review process. It works with whatever model is best next year. That is the program's real asset, and the reason a better chef never means a worse deal for the community.

Ways to run it, so every community can start where it is ([ADR 0007](../adr/0007-community-node-and-tiered-clients.md), [ADR 0009](../adr/0009-inference-modes-and-privacy.md), [ADR 0016](../adr/0016-afribit-local-community-box.md)):

| Setup | Hardware | Where questions go | Status |
|---|---|---|---|
| **Community node** (self-hosted, `node`) | A machine with a 10–16 GB GPU, on the local network | Nowhere. Nothing leaves the network. | Built; 16 GB GPU measured ([results](community-node.md#what-we-measured)) |
| **Afribit Local** (community box + Afribit GPU) | A small box at the community, no GPU | To Afribit's GPU server in Kenya over an encrypted tunnel, answered and not stored; all data stays on the box | Decided; the node already supports a remote model server; tunnel and hardened server planned |
| **Local-first, hosted brain** (`hybrid` + restaurant) | Any small server, no GPU needed for the chef; a modest GPU for the waiter | The hosted chef sees only a scrubbed English ticket; everything is stored locally | Built, off pending review |
| **Cloud demo** (`cloud`) | None (we host it) | Hosted models with zero-data-retention routing | Live |
| **Cards on the phone** | Any phone, no network | Nowhere | Planned |

Four rules run through everything:

- **The model is an interface to knowledge, not the knowledge.** In the default Learn mode, answers come from knowledge community reviewers approve. A community may switch on a separate, clearly labelled "Ask anything" mode for general questions ([ADR 0017](../adr/0017-ask-anything-mode.md)); its answers are never presented as reviewed.
- **The AI learns only through the community's gates** ([ADR 0015](../adr/0015-how-the-assistant-learns.md)). Approved knowledge and language are live the same day; members can suggest how to say things ("say it your way"), and reviewers decide; a person can opt in to the assistant remembering their own progress; the model itself changes only in releases that pass the community's tests and a reviewer vote. It never trains itself on conversations, and any use of data for training needs written, opt-in consent ([data stewardship](../governance/data-stewardship.md)).
- **Free at the point of use.** Learners never pay per question. A self-hosted node is funded by the community and its supporters — hardware grants, donations and local connectivity income. A community that uses Afribit Local pays a monthly fee for the service, not its members per question.
- **Open models where possible.** The default model is moving to one with an open-source licence (Gemma 4, if it matches today's model on our tests: [ADR 0018](../adr/0018-open-licensed-default-model.md)).

## What exists today

Honesty matters more than polish. Status as of October 2026:

| Capability | Status |
|---|---|
| Chat in Sheng / Kiswahili / English over reviewed knowledge, with a safety layer | **Built, live** (cloud demo) |
| 61 Bitcoin cards, 25 communication chapters, 271 phrases — community-approved v1.0 | **Built** |
| Evidence-based retrieval: right card in the top 3 for 97.5% of benchmark questions (25% a week ago) | **Live** — [ADR 0011](../adr/0011-rank-fusion-for-retrieval.md), [ADR 0013](../adr/0013-local-embeddings.md) |
| Educational questions about seed phrases and scams answered (not blocked); real secrets still refused | **Live** — [ADR 0008](../adr/0008-content-based-secret-detection.md) |
| Compact prompt (about a fifth the size; scored higher on language and accuracy), waiter ticket (right card in the top 3 for 40/40 questions), the full restaurant pipeline | **Built and tested; off by default** until community reviewers compare it blind |
| Blind review tool for community reviewers | **Built**; first round with three reviewers pending |
| Evaluation tooling: language rubric, factual-accuracy judge, retrieval benchmark, security audit | **Built** |
| Community node: local model provider, deployment kit; Gemma 3 12B on a rented 16 GB GPU answers in 10–19 s and serves 4 people at once in ~14 s | **Built and measured** on rented hardware |
| A 2014 desktop with a 4 GB GPU as a node | **Measured: not viable** (1.5 tokens/s; 32–85 s to the first word). It still works as a local-first node with a hosted chef |
| Community Wi-Fi / mesh (local routers and MikroTik) serving the node | **Not tested** — needs the hardware |
| Local semantic search (embeddings) on a node | **Built and measured**: `bge-m3` on the node's CPU finds the right card in the top 3 for 97.5% of benchmark questions with no cloud call |
| Contributor accounts; submit / review / vote on phrases | **Built** (no promotion step or review UI yet) |
| Several community packs on one server; the redesigned web app configures itself from the pack | **Built** (web app in the current development branch) |
| Afribit Local: community box + Afribit GPU in Kenya | **Decided**; the remote model server path works in code; tunnel, hardened GPU server and provisioning planned |
| Teach mode ("say it your way"), the gap list, opt-in learner memory | **Planned** |
| "Ask anything" mode | **Planned** (off by default) |
| Open-licensed default model (Gemma 4) | **Decided, conditional on our tests** |
| Offline cards on the phone; sats rewards for contributors | **Planned** |
| Users and measured impact | **None yet** — the pilot produces the first numbers |

## Phases and exit tests

The full plan, with every task, is the [roadmap](../../ROADMAP.md). In short:

1. **Foundations.** Three community reviewers compare setups blind; the default model is chosen with published results; privacy settings (no storage, retention, deletion). *Exit:* a supervised pilot can run for weeks without a maintainer watching the logs.
2. **Kibera on its own infrastructure.** Kibera's data on a box at the hub; the model on Afribit's GPU server in Kenya first and on the hub's own GPU when funded; Teach mode and the gap list; a supervised pilot of 20–50 learners ([pilot plan](pilot-plan.md)). *Exit:* a correct, safe Sheng answer with the community's data never leaving its box, and the cost of serving it reported.
3. **A second community, and "Ask anything".** A language readiness check, a shared Bitcoin core with community overlays, a second community live with its own reviewers. *Exit:* its results published.
4. **Afribit Local as a service**, then **pluggable** (API keys, widget, channels), then **a model tuned on community-approved data** (research).

## Why open source

Communities adopt and trust what they can inspect and change. Everything here is open: code under Apache-2.0, content under CC BY-SA 4.0, decisions in the open ([ADRs](../adr/README.md)), results published either way. That also makes the program replicable — another community should be able to run a node for its own language and its own reviewers.

## Where to read next

[Community node specification](community-node.md) · [Pilot plan](pilot-plan.md) · [Governance](../governance/governance.md) · [Data stewardship](../governance/data-stewardship.md) · [Threat model](../security/threat-model.md) · [Evaluation](../evaluation/methodology.md) · [Roadmap](../../ROADMAP.md)
