<p align="center">
  <img src="logo/Afribit%20AI%20logo%20concept.png" alt="Afribit AI" width="360">
</p>

<h1 align="center">Afribit AI</h1>
<p align="center"><strong>Learn Bitcoin in the language you actually speak.</strong></p>
<p align="center">
  An open-source Bitcoin education assistant for Kibera and Nairobi. It talks in Sheng, Kiswahili and English the way people really talk — and it is being built to run on hardware the community owns, free to use on the local network, with no internet needed.
</p>

<p align="center">
  <a href="https://ai.afribit.africa"><strong>Try it live</strong></a> ·
  <a href="docs/program/overview.md">The program</a> ·
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="CONTRIBUTING.md">Contribute</a> ·
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/code-Apache--2.0-blue.svg"></a>
  <a href="LICENSE-CONTENT"><img alt="Content: CC BY-SA 4.0" src="https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg"></a>
</p>

---

## Why this exists

Ask most AI assistants about Bitcoin in Nairobi Sheng and you get formal
textbook Kiswahili back, or an explanation written for someone who already
understands banks and computer networks. Beginners switch off. Worse,
people who *do* keep going are easy targets for scams.

Afribit AI starts from a different rule:

> **The community does not have to learn to speak like AI. The AI learns to speak like the community.**

## What it does

- **Explains Bitcoin simply** — wallets, Lightning, receiving and paying, fees, confirmations, backups, scams — at the level you choose: simple, normal, or deep.
- **Speaks your language** — pick English, Kiswahili, Sheng, or a natural mix. Sheng answers are written the way people talk, not translated from formal Kiswahili and sprinkled with slang.
- **Answers from knowledge people have reviewed** — the assistant is an interface to a knowledge base that community reviewers approve, not a model improvising from whatever it remembers. When the knowledge base doesn't cover a question, it is designed to say so rather than guess.
- **Keeps you safe** — it never asks for your seed phrase, private key, PIN or password, never promises returns, and teaches you to spot the scams people in your community actually meet.
- **Lets the community teach it** — contributors can propose Sheng and Kiswahili phrases, review each other's, and vote on what sounds natural. Nothing reaches learners until a human has approved it.
- **Designed for modest phones** — an installable web app aimed at low-end Android devices and patchy connections.

### See it

A real answer from the live app (Sheng mode, lightly shortened):

> **You:** Bitcoin ni nini bro, explain kama mimi ni mgeni
>
> **Afribit AI:** Sawa, Bitcoin ni pesa ya digital. Ni kama cash, lakini huwezi kuishika physically. Inatumika kwa internet, na unaweza kutuma ama kupokea Bitcoin bila bank katikati.
>
> Bitcoin ina-run kwenye network kubwa ya computers, na hakuna kampuni moja inayo-control system yote. […] Wallet ni kama app kwenye simu yako inayokusaidia kumanage keys zako za Bitcoin. […] Uko na swali yoyote ama unataka kujua kitu kingine?

## Community-owned, private by design — and where we are

Freedom technology means people hold their own data. Afribit AI is built so a **community can have its own AI**: it feels like any AI chat, speaks the community's language, answers from knowledge the community's own reviewers approved, and keeps the community's data in the community's hands. There are two ways to have it:

- **Run it yourself, free.** A *community node* — one machine at a community hub — serves everyone on the local Wi-Fi. In its default mode **nothing leaves the network**, and it works with no internet.
- **Afribit Local**, a monthly service for communities without a GPU. A small box at the community holds all of its data; Afribit's AI server in Kenya answers the questions and keeps nothing ([ADR 0016](docs/adr/0016-afribit-local-community-box.md)). Members never pay per question.

Phones don't run the model — we measured, and small models that fit on a phone can't yet speak good Sheng. A shared machine can run a far stronger one and spread the cost across everyone. The community owns its knowledge, its voice and its review process — not any one model — and we are moving the default model to one with an open-source licence (Gemma 4, if it matches today's model on our tests: [ADR 0018](docs/adr/0018-open-licensed-default-model.md)).

| Setup | Data lives | Model runs | Status |
|---|---|---|---|
| **Community node** (self-hosted, free) | The community's machine | The community's GPU (10–16 GB) | **Built; measured** — answers in 10–19 s on a 16 GB card; mesh untested |
| **Afribit Local** (community box + Afribit GPU) | A small box at the community | Afribit's GPU server in Kenya; nothing stored there | **Built and tested** (8 Oct 2026, with a rented GPU standing in, test questions only); not yet running for any community: launches when our GPU server in Kenya is ready |
| **Local-first, hosted brain** | A small local server | A hosted zero-retention model sees only a scrubbed English ticket | Built; off pending community review |
| **Cloud** | Our server | Hosted models | Live demo |
| **Cards** | Your phone | Nothing | Planned |

**How it learns** ([ADR 0015](docs/adr/0015-how-the-assistant-learns.md)): instantly *for you* (your language and level, opt-in — planned); the same day *for everyone* (words, phrases and answers the community taught it, once a reviewer approves them — partly built); and *the model itself* in releases the community tests and votes on (research). It never trains itself on conversations. By default it answers from approved knowledge; a community can also switch on a clearly labelled **"Ask anything"** mode for everything else ([ADR 0017](docs/adr/0017-ask-anything-mode.md) — planned).

**Be clear-eyed about today:** the live demo is the *cloud* setup. It sends questions to a hosted model (with zero-data-retention routing requested) and stores chat history on a server. Chatting needs no account and prompt logging is off by default, but it is not private in the sense a node is. The program is described in the [program overview](docs/program/overview.md); what we still have to prove is in the [roadmap](ROADMAP.md); what it depends on and how it is tested is in [the Book](docs/book/README.md).

## What's here

| | |
|---|---|
| **A chat app** | Installable web app (PWA): chat, language and level settings, push notifications, contributor sign-in. |
| **An API** | Retrieval-augmented chat over the reviewed knowledge base, a safety layer, and the contributor (Microtasks) workflow. |
| **A knowledge base** | 61 Bitcoin knowledge cards and 25 communication-skills chapters, plus 271 Sheng and Kiswahili phrases. The two teaching manuals behind most of it were approved by community reviewers (version 1.0, September 2026). Openly licensed — see [Licensing](#licensing). |
| **A language-quality toolkit** | Evaluation tooling for how natural, accurate and safe the responses are, including a factual-accuracy check, a retrieval benchmark, and a [blind review tool](tools/blind-review) so community Sheng speakers can compare answers without knowing which model wrote them. |
| **Community packs** | [`packs/`](packs): a community's languages, voice and reviewed knowledge in a folder. The Kibera pack is one; an example library pack shows another. [How to make yours](docs/guides/community-pack-guide.md) · [the idea](docs/concept/README.md) · [run it under your own name](docs/guides/white-label-guide.md) ("Powered by Afribit AI": [branding policy](docs/BRANDING.md)). |
| **A community node kit** | [`deploy/community-node/`](deploy/community-node): everything to run Afribit AI and its model on one machine for a local network. |
| **Program documents** | [`docs/`](docs): the program, pilot plan, governance, data stewardship, threat model, evaluation results, and architecture decisions. |

## Status

Afribit AI is an **early-stage project**: usable, actively developed, and not
yet something to rely on for real money. Answers can be wrong — never treat
them as financial advice, and never share a seed phrase with anyone.

What works today is listed above. What is planned — Kibera's assistant on its
own box, a supervised pilot, Teach mode, a second community, Afribit Local,
an "Ask anything" mode, and later a model tuned on community-approved Sheng —
is on the [roadmap](ROADMAP.md).

## Get involved

You do not need to write code to help.

- **Speak Sheng or Kiswahili?** Tell us what sounds wrong, dated, or unnatural, and what you would say instead. [Open a language correction](https://github.com/afribit/afribit-ai/issues/new?template=language_correction.yml).
- **Know Bitcoin?** Check the answers for accuracy and safety. [Report an unsafe or wrong answer](https://github.com/afribit/afribit-ai/issues/new?template=unsafe_or_wrong_answer.yml).
- **Build things?** Start with [CONTRIBUTING.md](CONTRIBUTING.md) — the app, the API, and the community-node research on the [roadmap](ROADMAP.md) all need hands.
- **Can host a node?** A community hub, a spare machine, power protection and a steward are what's needed. See the [node kit](deploy/community-node/README.md) and [pilot plan](docs/program/pilot-plan.md).
- **Fund or partner with us?** Reach out at [eddie@afribit.africa](mailto:eddie@afribit.africa).

## Run it yourself

Needs Node 22+, pnpm and Docker.

```bash
pnpm install
cp .env.example .env            # add an OPENROUTER_API_KEY to enable the language model
pnpm db:up                      # Postgres (pgvector) + Redis
pnpm db:migrate
pnpm db:seed                    # starter knowledge cards
pnpm db:seed:manuals            # the two Sheng teaching manuals (loaded as "needs review")
pnpm --filter @afribit/api db:promote:manuals   # mark the approved v1.0 content published
pnpm --filter @afribit/api knowledge:embed      # optional: semantic search (needs the API key)
pnpm dev:api                    # http://localhost:3001
pnpm dev:web                    # http://localhost:5173
```

Without an API key the app still works in a no-model mode that answers
straight from the knowledge cards. More in [CONTRIBUTING.md](CONTRIBUTING.md)
and [ARCHITECTURE.md](ARCHITECTURE.md).

## Licensing

- **Code** (`apps/`, `packages/`, `db/migrations/`): [Apache-2.0](LICENSE).
- **Content** (the Sheng/Kiswahili/English teaching manuals and the knowledge and phrase data derived from them): [CC BY-SA 4.0](LICENSE-CONTENT) — free to use and adapt with credit, derivatives stay open.
- Imported third-party data keeps its own license — see [NOTICE](NOTICE).
- The Afribit name and logo are not covered by these licenses.

## Acknowledgements

Built with and for the Afribit community in Kibera. Language research builds
on openly licensed work from [LughaKonnect](https://lughakonnect.co.ke) and
[Kencorpus](https://doi.org/10.7910/DVN/6N5V1K) (both CC BY 4.0).

<p align="center"><sub>Smarter communities. Brighter futures.</sub></p>
