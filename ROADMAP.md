# Roadmap

**Direction:** a community's own AI, starting with Bitcoin education. It feels like any AI chat, but it
speaks the community's language, answers from knowledge the community's own reviewers approved, and keeps
the community's data in the community's hands.

There are two ways to have it:

- **Run it yourself, free.** The software is open source. A community node runs on a machine the community
  controls.
- **Afribit Local**, for a monthly fee per community. A small box at the community holds all of its data,
  and Afribit's AI server in Kenya answers the questions without storing them
  ([ADR 0016](docs/adr/0016-afribit-local-community-box.md)).

Learners never pay per question.

**How it learns** ([ADR 0015](docs/adr/0015-how-the-assistant-learns.md)), at three speeds:

- **For you, at once:** your language and level (opt-in).
- **For everyone, the same day:** words, phrases and answers the community taught it, once a reviewer
  approves them.
- **The model itself, in releases** the community tests and votes on.

It never updates itself from live conversations.

**How to read this.** Stages, not calendar dates, because the order depends on what we learn. Each stage
has an exit test, something you could check. Items marked **(research)** are open questions; we publish the
results either way. We don't claim an item works until it is done and measured, and the evidence is logged
in [the Book](docs/book/README.md).

**Every feature has an ID and a written spec before it is built** ([docs/features](docs/features/README.md)):
the problem, what people see, how it works, its data, its acceptance tests and the decisions it needs.
`F-` marks features, `E-` evaluations.

---

## Stage 1 — Foundations (now)

Done:

- [x] Public repository, licences, contribution, security and governance documents.
- [x] **Secret blocking fixed and live.** "What is a seed phrase?" is answered; only a message that actually
  contains a secret triggers the warning ([ADR 0008](docs/adr/0008-content-based-secret-detection.md)).
- [x] **Retrieval fixed and live.** The right card is in the top 3 for 97.5% of benchmark questions, up from
  25%, after a rank-fusion fix ([ADR 0011](docs/adr/0011-rank-fusion-for-retrieval.md)) and a better
  multilingual embedding model ([ADR 0013](docs/adr/0013-local-embeddings.md)).
- [x] **Node mode built:** a local-model provider, per-profile timeouts, no cloud calls in `node` mode, local
  embeddings, a deployment kit and tests ([ADR 0009](docs/adr/0009-inference-modes-and-privacy.md)).
- [x] **The harness built:** a compact prompt, the waiter's ticket and the restaurant pipeline with a privacy
  scrubber ([ADR 0010](docs/adr/0010-compact-prompt-and-the-waiter.md),
  [ADR 0012](docs/adr/0012-the-restaurant-pipeline.md)). All off by default until reviewers weigh in.
- [x] **Measured on real hardware:** a 2014 desktop can't serve a live chat; a rented 16 GB GPU answers in
  10–19 s and serves four people at once ([evaluation](docs/evaluation/methodology.md)).
- [x] **Community packs:** several packs on one server; the redesigned web app configures itself from the
  pack ([ADR 0014](docs/adr/0014-community-packs.md)).
- [x] **A blind review tool** for community reviewers ([`tools/blind-review`](tools/blind-review)).
- [x] **The Book started:** dependency register, test and evaluation log, rules for keeping them current.
- [x] **Direction decided:** how it learns, Afribit Local, an "Ask anything" mode, an open-licensed default
  model ([ADRs 0015–0018](docs/adr/README.md)).

To do:

- [ ] **First blind review with three community reviewers**, then switch on whatever they prefer.
- [ ] **E-001 · Evaluate Gemma 4** (E4B, 26B-A4B, 31B) against Gemma 3 12B on our tests and on real GPUs, and
  decide the GPU. Switch the default where it matches and fits
  ([spec](docs/features/E-001-gemma4-and-gpu.md), [ADR 0018](docs/adr/0018-open-licensed-default-model.md)).
  **Done (8 October 2026), apart from the reviewers' blind comparison.**
  - Hosted: Gemma 4 26B-A4B passed 15 of 15 language cases and was accurate on 15 of 15. The same models
    with no engine passed only 1–2.
  - At 4-bit on rented GPUs: 26B-A4B scored 14/15 and was accurate on all 15. On an RTX 3090 it answered
    four people at once in 8.4 s, faster than today's Gemma 3 12B.
  - The 6.6 GB E4B scored 14–15/15. 31B is ruled out.
  - Recommended GPU for Afribit's server: a 24 GB RTX 3090/4090-class card.
- [ ] **E-002 · Community benchmark:** 50 questions written by Afribit's educators, a bare open model against
  Afribit, scored blind by reviewers, with a go / no-go verdict before any grant uses the numbers
  ([spec](docs/features/E-002-community-benchmark.md)).
- [x] **F-001 · Where the AI runs:** an honest label, true in every setup
  ([spec](docs/features/F-001-model-location-label.md)). Built 8 October 2026; ships with the next release.
- [x] **F-002 · Privacy settings:** no storage, a retention period, and deleting a conversation or an account
  ([spec](docs/features/F-002-privacy-settings.md), [data stewardship](docs/governance/data-stewardship.md)).
  Built 8 October 2026: 30 days by default, nothing stored on the pilot node. Ships with the next release.
- [ ] **F-012 · Accounts by invitation only:** for authorized trainers; members chat and suggest without one
  ([spec](docs/features/F-012-invitation-only-accounts.md)).
- [ ] **A reviewer model that lasts:** reviewers paid for their time, hours measured, spot checks; never paid per
  approval. Agreed before the pilot.
- [ ] **Training-safe synthetic data:** our data-generation tools use only open-weight "teacher" models whose
  licences allow it; earlier synthetic batches stay evaluation-only.
- [ ] **Test coverage:** API route tests against a real database (unit tests and browser journeys already run
  in CI).
- [ ] **Contributor tooling:** a review-and-vote screen, and a promotion step with a reviewer quorum.
- [ ] **Operations:** uptime alerting, off-site backups, pinned image versions, password reset, a hard spend
  cap on the hosted-model key.

**Exit test:** a supervised pilot can run for weeks without a maintainer watching the logs; the default model
is chosen with published results; and the community benchmark has a go / no-go verdict.

## Stage 2 — Kibera on its own infrastructure

The community's data lives on a box at the hub. The model runs on a GPU, and where that GPU sits is a
setting: Afribit's GPU server in Kenya first ([ADR 0016](docs/adr/0016-afribit-local-community-box.md)), the
hub's own GPU when it is funded. Moving it moves no data.

- [ ] The pilot machine becomes Kibera's box (app, database, local embeddings, backups).
- [ ] **F-006 · Afribit's GPU server:** in Kenya, an encrypted tunnel, a key per community, no prompt logging,
  nothing written to disk. Sized by E-001.
- [ ] Encrypted off-site backups and a restore drill.
- [ ] **F-005 · Community console v1:** the pilot console plus knowledge, team and data controls. Leaders see
  aggregates, not members' conversations.
- [x] **F-003 · "Say it your way"** ([spec](docs/features/F-003-say-it-your-way.md)): built 8 October 2026,
  reviewed in the pilot console's Suggestions tab; ships with the next release.
- [ ] **F-004 · the gap list**: questions no card answered, for the reviewers. Completes the daily learning loop.
- [ ] **Supervised pilot** of 20–50 learners ([pilot plan](docs/program/pilot-plan.md)), in Learn mode.
  Measure how people reach it: link, installed app, or an educator's phone.
- [ ] **F-007 · A channel where people already are**, as an experiment: Telegram first, if the pilot shows the
  web app is a barrier. Each channel is labelled with who else can see the messages. WhatsApp adds Meta and a
  business account, so it is a later, separate decision.
- [ ] With a GPU at the hub: the node answering over local Wi-Fi with **no internet uplink**.

**Exit test:** someone at the hub asks a Bitcoin question in Sheng and gets a correct, safe answer. The
community's data never leaves its box, and we report what it cost to serve.

## Stage 3 — A second community, and "Ask anything"

- [ ] **F-009 · Language readiness check**, packaged from the community benchmark (E-002): the community's
  speakers write their own starter questions; candidate models are scored blind. The result is ready,
  partial or not ready ([why](docs/adr/0015-how-the-assistant-learns.md)).
- [ ] **F-010 · A shared Bitcoin core plus community overlays:** facts are shared; language, currency, local
  scams and examples are the community's.
- [ ] An onboarding playbook, and reviewer roles per community where one server serves several.
- [ ] **A second community live** (ideally another language), with its readiness and launch results published.
- [ ] **F-008 · "Ask anything" mode** ([ADR 0017](docs/adr/0017-ask-anything-mode.md)): built, tested on its
  own test set, off by default, and switchable per community.

**Exit test:** a second community runs with its own reviewers, and its results are public. Until then, "any
community can use it" is a design, not a result.

## Stage 4 — Afribit Local as a service

- [ ] A provisioning script for boxes, then a small control plane: the community registry, health, versions.
  It holds no community content.
- [ ] Billing per community, payable in sats.
- [ ] A data processing agreement; legal review of Kenya's data-protection obligations; an independent
  security review of the box and the GPU server.
- [ ] An operator console without access to community content; a public status page.
- [ ] Full hosting (data in Afribit's colocated servers) only after the security review, and only for
  communities that can't keep a box.

**Exit test:** three communities on Afribit Local, a restore drill passed for each, and the cost of serving a
community published.

## Stage 5 — Pluggable

- [ ] Per-community API keys, an OpenAI-compatible chat endpoint, and an analytics and export API for leaders.
- [ ] An embeddable chat widget; channel connectors (Telegram, WhatsApp, SMS/USSD with partners). Each is
  labelled with who else can see the messages.
- [ ] A first integration partner using a community's assistant, with that community's consent.

**Exit test:** one external product in production uses a community's assistant under its key and its rules.

## Stage 6 — A model that speaks like the community *(research)*

- [ ] A training-consent policy agreed with the community, in writing. (Today no row is cleared for training.)
- [ ] A human-labelled test set and a safety suite per community.
- [ ] A training export that refuses any row without training consent.
- [ ] A first adapter on the open-licensed base model; the community votes on whether it ships. Publish the
  public adapter, recipe, data card and results; keep private adapters on the community's own node.
- [ ] Distil into a smaller model so cheaper hardware can serve it.

**Exit test:** the tuned model beats prompt-only in blind review with zero safety regressions, and anyone can
reproduce it from the published recipe.

## Later

- **Opt-in learner memory:** the assistant remembers what you have learned, only for you, and you can delete it.
- **Voice in Swahili and Sheng:** a community recording campaign first, then speech recognition.
- **Sats rewards** for reviewed contributions, with abuse protection and reputation.
- **Local-first contribution:** write and review offline, sync when a connection appears.
- **Locale layers:** variants for neighbourhoods and regions, each owned by its community.
- **Other domains as packs** (health, civic information, agriculture), each with its own reviewers and honest
  limits. Bitcoin stays first for Afribit's own deployment.
- **Federated training** across communities; confidential computing on the GPU servers.
- **Offline cards on the phone** for when the node is out of reach.
- **Interoperability:** Lightning wallets, Nostr, feature phones.

---

## What we will not do

- Build or promote a token.
- Hold user funds.
- Ask for, collect, or store seed phrases, private keys, or PINs.
- Train on anyone's conversations without opt-in consent, or update the model directly from live chats.
- Charge learners per question. (A community may pay Afribit to run its assistant; its members don't pay.)
- Send a community's questions to foreign AI companies on Afribit Local.
- Let community leaders read members' conversations. They see aggregates, plus only what a member reports
  or chooses to share.
- Put closed-source components in the core. The managed service runs the same open-source node kit.

## Open questions

- Does Gemma 4 match Gemma 3 12B in Sheng and Kiswahili, and which size fits which hardware?
- What does serving one community from Afribit's GPU cost, and how many communities can share a GPU?
- What monthly price covers that without excluding the communities that need it most?
- How do we fund long-term community review, the scarcest resource in the project?
- What is the right split between "show approved text" and "generate"?
- What are the Kenya Data Protection Act obligations, for each node and for Afribit as a processor?

Want to help answer one of these? See [CONTRIBUTING.md](CONTRIBUTING.md).
