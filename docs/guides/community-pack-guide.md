# Community pack guide

How to give the Afribit AI engine your community's language, voice and knowledge, and run it on a machine you control.

Read [the concept](../concept/README.md) first if you want the "why". This page is the "how". To show your own name, colour and logo, see [the white-label guide](white-label-guide.md) and the [branding policy](../BRANDING.md). It is accurate for the code as of 2 October 2026 and says what does not work yet.

## What you need

- **People:** at least two reviewers who speak the language and know the subject, and one person comfortable with a command line. Reviewers matter more than hardware.
- **A machine:** for a real model with no cloud, a computer with an NVIDIA GPU with 10–16 GB of memory (we measured a 2014 desktop with no GPU: it cannot do it). Without a GPU, use `INFERENCE_MODE=hybrid` or `cloud` with an OpenRouter key; questions then leave your network, and your users should be told.
- **Software:** Docker, Node 22 and pnpm for development; Docker alone for running a node ([the node kit](../../deploy/community-node/README.md)).

## Five-minute start

```bash
pnpm install
pnpm --filter @afribit/api pack:init ../../packs/my-community \
  --id my-community --name "My Community Guide" --community "My community" \
  --domain health --label "health information" --modes plain_en,my_language \
  --contact you@example.org
pnpm --filter @afribit/api pack:validate ../../packs/my-community
```

This writes a valid pack with one draft example card. `validate` reports every problem at once.

To try it against a database:

```bash
pnpm --filter @afribit/api db:migrate
pnpm --filter @afribit/api pack:install ../../packs/my-community      # loads cards and builds the search index
COMMUNITY_PACK_DIR=$PWD/packs/my-community pnpm --filter @afribit/api dev
curl localhost:3001/api/v1/pack                                         # what your front end reads
```

The server refuses to start, listing the problems, if the pack is invalid.

## What is in a pack

```
packs/my-community/
  pack.json                 identity, community, domain, modes, knowledge file list
  language/
    <mode>.full.md          how to write in this mode (long prompt)
    <mode>.compact.md       the same in two or three lines (short prompt)
  prompts/                    every file optional; safe generic wording is used if absent
    identity.full.md   safety.full.md   communication.md
    identity.compact.md   safety.compact.md   shape.compact.md
    code-switched.compact.md   few-shots.json
    vocab-intro.full.md   vocab-intro.compact.md   no-knowledge.full.md
    serve-identity.md   serve-safety.md   ticket.md   chef.md
    secret-warning.md   output-withheld.md   service-unavailable.md   ungrounded-note.md   (messages learners see)
    notification-title.md   notification-body.md   (the push notification)
  language/postprocess.json clean-up rules applied to every answer (optional)
  retrieval/synonyms.json   extra search words for words people type (optional)
  knowledge/cards.json      topics and cards
  eval/retrieval.json       real questions and the cards that should answer them (optional, strongly advised)
  starter-questions.json    suggested first questions per mode (optional)
  brand/logo.svg            your logo (optional; referenced from "branding" in pack.json)
```

Text files end in one newline; it is removed when the pack is read. In any prompt file you may write `{{name}}`, `{{community}}`, `{{domain}}` and `{{contact}}`; they are filled from `pack.json`. An unknown placeholder is a validation error.

### pack.json

| Field | Meaning |
|---|---|
| `schema` | Always `afribit-community-pack/0.1` |
| `id` | Lowercase, digits, `-` or `_` |
| `name` | What the assistant is called |
| `version` | `1.2.3`; bump it when cards change |
| `license` | Your licence for the pack's content. We use CC-BY-SA-4.0 so communities can share and improve packs |
| `maintainers` | Who answers for this pack (name and contact) |
| `community` | `{ "name", "country" }` |
| `domain` | `{ "id", "label", "retrievalDomains": [...] }`. Only cards in these domains are searched |
| `modes` | The ways of speaking you offer. See below |
| `defaultMode` | One of the modes |
| `knowledge.files` | List of card files |
| `knowledgeLabel` | Word used for the knowledge block in the prompt |
| `safety.secretDetection` | `true` keeps the check that blocks passwords, PINs and recovery phrases from being sent to a model. Leave it on unless your domain has no such secrets |
| `safety.grounding` | `"log"` (default), `"enforce"` or `"off"`. After each answer the engine checks for names and figures that appear nowhere in what the model was given (cards, instructions, the conversation). `log` records a safety event only; `enforce` also withholds the answer (or, when streamed, appends the `ungrounded-note.md` text). See "Grounding check" below |
| `disclaimers` | Short lines a front end should show |
| `branding` | Optional. Your short name, tagline, accent colour, logo, first-screen wording and the "Powered by Afribit AI" line. Presentation only: it never reaches a prompt. See [the white-label guide](white-label-guide.md) and the [branding policy](../BRANDING.md) |

### Language modes

A mode is a register the **learner chooses** (we never guess it): `{ "id": "my_language", "label": "…", "description": "…", "codeSwitched": false }`. Ids are lowercase letters, digits and `_`.

Set `codeSwitched: true` for mixed registers (like Sheng) where the model tends to translate from a formal language and then decorate. For those modes the engine also uses your `few-shots.json` (real example turns) and any reviewed vocabulary, and your `code-switched.compact.md` rules.

**Write the `language/*.md` files yourselves, with your reviewers.** Do not machine-generate a community's slang. The Kibera pack's style guide came from reviewed corpus work and was still found wrong in places by our own evaluation.

### Knowledge cards

```json
{
  "topics": [{ "id": "library.borrowing", "title": "Borrowing", "domain": "library" }],
  "entries": [{
    "id": "library.borrowing.limit.001",
    "topic": "library.borrowing",
    "title": "How many books you can borrow",
    "domain": "library",
    "canonical_answer": "The full, accurate answer, written for a reviewer to check.",
    "beginner_answer": "The same, in the simplest words.",
    "safety_notes": ["Anything that must be said alongside it."],
    "status": "approved"
  }]
}
```

Rules that keep it honest:

- **One idea per card.** Retrieval finds cards by meaning; a card that mixes three ideas matches badly.
- **Write the fact, not the speech.** The assistant composes the answer in the learner's mode. The card says what is true.
- **`status` is a gate.** `draft`, `needs_factual_review`, `needs_language_review`, `deprecated`, `archived` are never used to answer. Only `approved` and `published` are. Validate warns when most cards are not live.
- **Cards the assistant gets wrong are card problems first.** Fix the card, then the prompt.

### Prompts

Leave `prompts/` empty to start: the defaults are cautious (answer only from the cards, never ask for secrets, never promise outcomes). Replace files one at a time as your reviewers write better wording. `ticket.md` and `chef.md` matter only if you turn on the optional waiter and restaurant pipeline (see ADR [0010](../adr/0010-compact-prompt-and-the-waiter.md), [0012](../adr/0012-the-restaurant-pipeline.md)).

## Grounding check

The assistant must answer only from cards, and mostly does, but models sometimes add facts from their own memory. After each answer the engine looks for **name-like words in the middle of a sentence and figures of two or more digits that appear nowhere in the prompt**. That is a net for invented names and numbers, not a fact-checker: it cannot see an invented name that opens a sentence, or a wrong claim in ordinary words, and it sometimes flags a harmless made-up example amount.

On the Kibera pack (45 real answers, `log` mode) it flagged 9: two were clearly outside facts (it named other coins, "Ethereum" and "Dogecoin", and gave halving reward figures), others were list headings and invented example amounts. So start in `log`, read the flagged answers (`safety_events` where `kind = 'ungrounded_answer'`), and switch to `enforce` only when you are happy with what it would have withheld. Write `prompts/ungrounded-note.md` in your community's language so a withheld answer sounds right.

## Changing the wording live (Voice Lab)

Editing the files and redeploying is the right way to make the first big batch of changes, and the only way to change a pack's manifest or knowledge. For fine-tuning how the assistant *talks*, reviewers can instead use the **Voice Lab** at `/voice`: edit a mode's guide, the example conversations, the fixed messages and the other wording files, **try an answer immediately** (with or without saving), and keep the history. Safety-critical prompts (`safety.full.md`, `safety.compact.md`, `serve-safety.md`, `ticket.md`, `chef.md`) are editable by administrators only.

It is off unless the server has `COMMUNITY_PACK_OVERRIDES_DIR` set to a persistent folder. The pack in git stays the reviewed **baseline**; each save writes an **override** file at `<overrides>/<packId>/<same path as in the pack>`, which replaces that one file; deleting it restores the baseline. Only these can be overridden: `language/<mode>.full.md`, `language/<mode>.compact.md`, `language/postprocess.json`, `retrieval/synonyms.json`, every file in `prompts/`, and `starter-questions.json`. `pack.json`, `knowledge/` and `eval/` never can. A change is accepted only if the whole pack still loads with it, and the pack is reloaded into the running server at once; requests in flight finish with the wording they started with. When wording has been tuned live, `pnpm --filter @afribit/api pack:overrides-export <packId> <outDir>` writes it out in the pack's layout so it can be reviewed with `git diff` and committed. See [the Voice Lab guide](voice-guide.md) for how to use it and how to run it.

## What is the community's, and what stays in the engine

Everything a learner reads, and everything that shapes how the assistant speaks, is in the pack, in your language: the identity and safety wording, the language guides and examples, the messages shown when a password is pasted or an answer is withheld, the "service unavailable" text, the push notification, the clean-up rules (`language/postprocess.json`), the search synonyms (`retrieval/synonyms.json`) and the words the privacy scrubber must not mistake for names (`knownTerms` in `pack.json`). Apart from the safety nets below, no community's wording is in the engine's answer path; a test checks that a different pack's prompts contain none of Kibera's or Bitcoin's.

What stays in the engine, deliberately, because it is a safety net rather than a voice:

- **The secret detector** (recognising a pasted recovery phrase, PIN, key or password) and the **output safety check** (an answer that asks for a secret or guarantees a return) use patterns written for English and Kiswahili. A community working in another language gets the English patterns and whatever of its own words overlap. Extending these per pack is a known gap: if you need it, open an issue with examples.
- The shape of the prompts (the order of identity, safety, style, mode, level, knowledge).
- The development tools in `dataset-lab/`, which are specific to the Kibera corpus.

## The review loop (this is the work)

**Reviewers use a web page for this, at `/review` on your service** (see [the reviewer guide](reviewer-guide.md)). Create reviewer accounts by having each person register, then run `pnpm --filter @afribit/api db:promote:admin <email> reviewer` on the server. Set `REVIEW_TWO_PERSON=true` once you have two or more reviewers, so nobody can make their own edits live. Making a card live also adds it to the search index immediately. Editing the files directly (below) works too and is better for the first big batch.

1. Reviewers draft cards from material they trust (an official leaflet, a manual, their own expertise). Set `status: "needs_factual_review"`.
2. A second person checks facts against the source. Set `approved`.
3. A language reviewer reads the assistant's answers in each mode, using real questions from the community, and records what is stiff, wrong or unsafe.
4. Fix cards or `language/*.md`, bump `version`, `pack:validate`, `pack:install`.

Keep a set of real questions as a benchmark, in `eval/retrieval.json`:

```json
{
  "cases": [{ "id": "L01", "query": "How many books can I take home?", "expected": ["library.borrowing.limit.001"] }],
  "notCovered": [{ "id": "N01", "query": "How do I renew my passport?" }]
}
```

Write the questions the way people really type them (mixed languages, slang, misspellings), not the way your cards are worded. `pnpm --filter @afribit/api pack:eval <packDir>` runs them through the real search and reports how often the right card is first, in the top 3 and in the top 5, and lists misses. The `notCovered` questions are ones the pack should not be able to answer: the report shows how confident search still is about them. In the Kibera pack that confidence is *not* a reliable signal (an off-topic Swahili question scored 1.00 on a word it shared with a card), so the model, guided by the "answer only from the cards" rule, is what declines. Measure answers too, by reading them with your reviewers; there is no automated answer-quality runner for new packs yet. Method and the Kibera results: [the evaluation notes](../evaluation/methodology.md).

`pnpm pack:export <dir>` writes the cards your database currently holds as `approved`/`published` back into a pack folder, so cards edited through the admin API can be committed and shared.

## Running a node

[The node kit](../../deploy/community-node/README.md) runs the database, the model server and the app in Docker. To serve your pack set `COMMUNITY_PACK=my-community` in its `.env`; the kit mounts `packs/` and loads your cards on first run. To serve several set `COMMUNITY_PACKS=a,b` instead (see "Serving several packs from one server").

| Mode | Where the question goes | Say to your users |
|---|---|---|
| `node` | Only to your machine | "Your questions never leave this network" |
| `hybrid` | To your machine; to the cloud only if it fails | Name the fallback |
| `cloud` | To a hosted model with zero data retention | "We use a provider that does not keep or train on questions" |

Pick the smallest model that passes your own language review. We tested Gemma 3 12B and others for Kiswahili and Sheng; we have not tested other languages.

## Serving several packs from one server

Put the packs side by side in one folder (this repository's `packs/` is one) and point the server at it:

```bash
COMMUNITY_PACKS_DIR=$PWD/packs                         # every subfolder with a pack.json
COMMUNITY_PACKS=kibera-bitcoin,my-community            # optional: serve only these ids
DEFAULT_PACK=kibera-bitcoin                            # optional: the pack when a request names none
pnpm --filter @afribit/api pack:list ../../packs       # checks each pack and that they fit together
pnpm --filter @afribit/api pack:install                # with COMMUNITY_PACKS_DIR set: installs every served pack
```

Every pack needs its own `id`, its own `domain.retrievalDomains`, and card and topic ids no other pack uses (prefix them with your domain, as the example pack does with `library.`). The server refuses to start otherwise. Clients choose a pack with the `x-pack` header or `?pack=<id>`; `GET /api/v1/packs` lists what is served and `GET /api/v1/pack` describes the one the request names. A conversation stays in the pack it started in. Reviewers open `/review?pack=<id>`. `usage:report --pack <id>` reports one pack's model use.

Verified: the two bundled packs served together on one server against a real database, with real model calls (see ADR [0014](../adr/0014-community-packs.md)). Not verified: more than two packs on a real server, or a pack in a language other than English alongside Kibera.

## Limits today

- One server can serve several packs (above), but the model, embedding model and inference mode are server-wide, and reviewer accounts are not per pack: a reviewer can review every pack the server serves.
- The review page edits cards in the database, not the pack folder; run `pack:export` to write approved cards back to the folder. Language guides and prompts are edited as files, or live in the [Voice Lab](voice-guide.md) (then `pack:overrides-export` brings them back into the folder).
- The reference web app reads `GET /api/v1/pack` (language modes, starter questions, disclaimers and `branding`: name, accent colour, logo, Powered-by line; the logo itself is `GET /api/v1/pack/brand/logo`), but its interface wording is Afribit's, in `apps/web/src/locales`. [The white-label guide](white-label-guide.md) lists what is and is not yours to change yet.
- Retrieval quality for a new language depends on the embedding model; we measured Kiswahili and Sheng with bge-m3. Measure yours.
- The community language corpus (reviewed vocabulary used for code-switched modes) is part of the Kibera deployment's database, not yet a pack file.
- The model can still be wrong. The cards limit it; they do not remove the risk. Treat sensitive domains (health, legal) with extra reviewers and a visible disclaimer.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Server exits on start with a list of errors | Run `pack:validate`; fix each line |
| The assistant says "I'm not certain" to everything | No `approved`/`published` cards, or you did not run `pack:install`, or the search index is missing: run `pnpm knowledge:embed` |
| Answers mention another community | A prompt file still has old wording; search your pack for names |
| `languageMode must be one of…` | The client sent a mode your pack does not declare |
| A card is never found | Its `domain` is not listed in `domain.retrievalDomains` (validate catches this) |
