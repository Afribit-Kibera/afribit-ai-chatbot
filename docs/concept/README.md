# The idea: a community's own AI, from an open engine and a pack

Status: **concept document, 2 October 2026.** It separates what exists today from what is planned. Where something is not built, it says so.

## The problem

AI assistants are built far away, by a few companies, for the languages and concerns of a few markets. A community that wants one that speaks the way it speaks, answers only from knowledge it trusts, and keeps its questions at home, has two bad choices: accept a general assistant that does none of that, or build everything from scratch.

Afribit AI is our attempt at a third choice, built first for **Bitcoin education in Sheng, Kiswahili and English for Kibera and Nairobi**, and designed so that another community can do the same for its own language and subject without our help or our permission.

## Three parts

| Part | What it is | Who owns it |
|---|---|---|
| **The engine** | Open-source software: chat, retrieval, the model gateway, safety checks, review tools, evaluation, a deployment kit | Everyone (Apache-2.0) |
| **A community pack** | A folder: who the assistant is, how the community speaks, what must never be said, and the reviewed knowledge it answers from | The community (CC BY-SA 4.0 by default, so packs can be shared and improved) |
| **A node** | A machine, in the cloud or in the community's own room, running the engine with one or more packs and a model | Whoever hosts it |

Swap the pack and the same engine serves a different community. Swap the model and the community keeps everything it built. This is the "restaurant" idea: the community owns the recipes, the waiter's way of speaking and the review process; the cook (the language model) is replaceable.

## Two ways to have it

| | **Self-hosted** (free) | **Afribit Local** (monthly, per community) |
|---|---|---|
| Who runs it | The community, on its own machine | Afribit runs the model; the community keeps a small box |
| Where the data lives | The community's machine | The community's box |
| Where the model runs | The community's GPU (10–16 GB) | Afribit's GPU server in Kenya, which stores nothing |
| Works with no internet | Yes | Cards only, until the uplink returns |
| Status | **Built** (node kit) | **Decided** ([ADR 0016](../adr/0016-afribit-local-community-box.md)); planned |

Both run the same open-source software. Learners pay nothing per question in either.

## How it learns, and where that memory lives

The assistant learns at three speeds, each with its own gate ([ADR 0015](../adr/0015-how-the-assistant-learns.md)). It never updates the model from a live conversation: a model that learned straight from chats could be taught scams (a few hundred planted examples are enough to plant a backdoor), would memorise people's names and numbers, and would break the promise that nothing is used without consent.

| Layer | What it holds | Who approves | Status | Where it lives |
|---|---|---|---|---|
| **Knowledge (the pantry)** | Reviewed answers, one card per idea, each with a safety note and a review status. In Learn mode the assistant answers *only* from approved cards | Reviewers | **Built** | The node's own Postgres database, loaded from the pack |
| **Language corpus** | Community-approved words and phrases with provenance, used to ground slang instead of improvising it | Reviewers | **Built** (Kibera pack) | The node's database |
| **Teaching signals** | "Say it your way" rewrites from members, and a list of questions no card answered (shown only at 5 or more) | Reviewers, before anything changes for others | **"Say it your way" live** (8 Oct 2026); the gap list built | The node's database |
| **Conversation memory** | The current chat, so a follow-up makes sense | — | **Built** (a recent window) | The node's database |
| **Learner memory** | What a person has learned, so the assistant can build on it | The person (opt-in, deletable) | **Planned**; needs a privacy design first | Per person, on the node |
| **The model's own weights** | A community adapter trained on consented, approved examples | A human test set, a safety suite, and a reviewer vote | **Research** | Public adapters are published; private ones stay on the community's node |

Nothing is shared between nodes. A community's data stays on its own machine unless that community chooses to contribute to a shared pack.

## Two modes: Learn, and Ask anything

**Learn** (the default) answers from approved knowledge and says "I don't know that yet" otherwise. **Ask anything** answers general questions like any AI chat, with the same privacy and safety floor, and labels every answer as not checked by the community's reviewers. It is off until a community switches it on ([ADR 0017](../adr/0017-ask-anything-mode.md), planned).

## Starting from nothing (cold start)

A new community begins with **an empty pantry**. The honest behaviour, which is what the engine does, is for the assistant to say it does not know and suggest asking a person, rather than fall back on a model's general memory. Knowledge arrives as the community's reviewers write and approve cards. Cards move `draft → needs_factual_review → approved`, and only approved cards are ever used. So the system is useful in proportion to what the community has reviewed, and never confidently wrong about what it hasn't.

Starting is cheap: `pnpm pack:init` writes a working skeleton in a minute. A *good* pack takes weeks of reviewer time. That is the real cost, and it is the point: the review is the value.

## Can another community plug in?

**Yes, in the sense that matters, with limits we state plainly.**

What works today (verified on a fresh database, with a fictional English library pack and no Bitcoin or Kibera text reaching the model):

- A pack is a folder. Validate it with `pnpm pack:validate`, load it with `pnpm pack:install`, serve it with `COMMUNITY_PACK_DIR`.
- One server can serve several packs at once (`COMMUNITY_PACKS_DIR`): each request names its pack, a conversation stays in its pack, and packs cannot see each other's knowledge. Verified with the Kibera pack and the example library pack together on one server.
- Any number of language modes, named by the community. Not limited to four.
- Any subject: the example pack is a library guide.
- The Kibera pack ships in the same format, and the tests prove it produces byte-for-byte the same prompts as before the format existed.

What is **not** there yet:

- Packs on one server share its model, embedding model and reviewer accounts (a reviewer can review every pack it serves). We have tested two packs together, not more.
- Writing a pack is editing files. There is no review website for non-technical editors yet.
- Quality for a new language is not automatic. A pack for Luo, Hausa or Pidgin needs that community's reviewers and a model that can handle the language; we have tested Sheng, Kiswahili and English only. Sheng is Kibera's register, not anyone else's. So every new community starts with a **language readiness check** (planned): its speakers write their own starter questions, candidate models are scored blind, and the result decides whether it launches on day one, launches in a bridge language with community-written cards, or collects data first.
- Bitcoin facts are the same everywhere; each pack copies them today. A shared Bitcoin core with community overlays (language, currency, local scams) is planned.
- The redesigned web app configures itself from `GET /api/v1/pack` (modes, starter questions, brand) in the current development branch; a community that wants its own front end can use the same endpoint.

Setup instructions: [the community pack guide](../guides/community-pack-guide.md).

## Beyond education

The engine is not about Bitcoin and not about teaching. It answers from reviewed cards, in a chosen register, with safety rules, in a place the community controls. That fits anything where the answer must be *right and local* rather than *fluent and general*:

- **Health information** from a clinic's approved leaflets, in the local language.
- **Civic and legal information:** how to get an ID, register a business, what a notice means.
- **Agriculture:** local planting guidance from an extension officer's own material.
- **Support for a service** (a savings group, a clinic, a utility): FAQ from the organisation's own policies.
- **Safety and scam awareness** in the language scams are actually written in.

We start with education because Bitcoin learners are exposed to scams and need plain answers now, and because we can measure whether an answer is right. Each new domain needs its own reviewers: nothing here makes medical or legal answers safe by itself.

## For developers

There is a developer idea attached to this: let people building their own community tools use the engine's model gateway, with usage metering and optional payment, and let hosts of local nodes earn by lending compute. It is a **draft concept, not built**: [developer-gateway.md](developer-gateway.md).

Short answer to "can a developer in another community run their own local model without us?": **yes, and they should be able to.** Ollama or llama.cpp plus any open model works without Afribit AI. What the engine adds is the part that is hard to do alone: the reviewed-knowledge retrieval, the language and safety checks, and the evaluation that catches answers that sound right and are wrong.

## What is true today

| Claim | Today |
|---|---|
| Open-source engine (Apache-2.0) | True |
| A community can run it on its own machine with no internet and no cloud | True (node mode, needs a 10–16 GB GPU for a good model; a small 2014 PC measured and does not work) |
| Packs: another community can define its own languages, voice and knowledge | True, with the limits above |
| Hosted entirely by communities | **Not yet.** The live service runs on Afribit's server. The pilot node is the first community-hosted one |
| Afribit Local (community box + Afribit GPU in Kenya) | **Built and tested, not yet running** ([ADR 0016](../adr/0016-afribit-local-community-box.md), [F-006](../features/F-006-afribit-gpu-server.md)): launches when the GPU server is in Kenya |
| Learns from the community | **Through review only:** approved cards and phrases are live at once; members suggest wording that reviewers approve ("say it your way", live); learner memory is planned; no model has been trained |
| A normal AI chat for anything | **Planned** as the labelled "Ask anything" mode, off by default |
| A network of nodes sharing compute | **Not built** (the mesh is a later phase) |
| A "protocol" | **Not yet.** A pack *format* and an engine. A protocol needs a second community using it |
