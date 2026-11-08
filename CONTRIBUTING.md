# Contributing to Afribit AI

Thank you for helping. Afribit AI rests on one rule: **the community doesn't
learn to speak like AI — the AI learns to speak like the community.** So this
project needs more than code. It needs people who speak Sheng, Kiswahili and
English the way Kibera and Nairobi speak them, and people who understand
Bitcoin well enough to catch a wrong or unsafe answer before a beginner sees
it.

Everyone taking part is expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
To report a security problem, see [SECURITY.md](SECURITY.md) — please don't
open a public issue for it.

There are four ways to contribute. Pick whichever matches what you know.

## 1. Language review — no coding needed

Sheng changes by age, neighbourhood and context. A phrase that sounds natural
to one person can sound dated or wrong to another, so this is a living
reviewing process, not a finished one.

**To suggest a correction**, open a
[language correction issue](https://github.com/Afribit-Kibera/afribit-ai-chatbot/issues/new?template=language_correction.yml)
and tell us:

1. the original phrase,
2. what you would actually say instead,
3. why (too formal? dated? means something else in your area?),
4. your area and age group, and how confident you are.

Don't just say "wrong" — say what you'd say instead. Never include a real
seed phrase, private key, password or other secret; use obviously fake
placeholders.

**If you'd rather edit the content directly**, the teaching content lives in
[`apps/api/src/db/data/`](apps/api/src/db/data) as JSON (chapters with their
Simple English, Sheng teaching version, examples and common confusions, plus
glossaries and phrase banks). Open a pull request. Because wording changes can
alter meaning, content changes are reviewed by a maintainer *and* at least one
other Sheng or Kiswahili speaker before they are merged, and they ship as a new
reviewed version rather than a silent edit.

**To add new phrases**, use the in-app contributor flow: register in the app's
Settings screen, submit a phrase, and other contributors review and vote on it.
You cannot review your own submission — the server enforces that.

**To compare answers blind** — the most useful thing a Sheng or Kiswahili speaker can do — ask a maintainer for a review page (see [`tools/blind-review`](tools/blind-review)). You will see questions and several unlabelled answers, and say which sound natural, which are correct, and which you would show a learner. It takes 30–40 minutes on a phone and works offline.

## 2. Bitcoin and safety review

If you know Bitcoin well, read the content for accuracy and safety, not just
language. Flag anything outdated, technically wrong, or that gives advice it
shouldn't — anything that reads as a guaranteed return, or that would make
sense to ask for a seed phrase. If you're correcting a fact, cite where the
correction comes from.

Found the live app giving a wrong or unsafe answer? Use the
[unsafe or wrong answer issue](https://github.com/Afribit-Kibera/afribit-ai-chatbot/issues/new?template=unsafe_or_wrong_answer.yml).
Include the exact question and answer. These reports are the most valuable
thing you can send us.

## 3. Code

Standard flow: fork, branch, pull request. Look for issues to pick up, or
propose one first for anything large. See [ROADMAP.md](ROADMAP.md) for where the
project is heading; proving a community node on modest hardware is the biggest open area.

### Set up

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev:api    # http://localhost:3001
pnpm dev:web    # http://localhost:5173
```

Requires Node 22+, pnpm and Docker. An `OPENROUTER_API_KEY` is optional —
without it the API answers directly from the knowledge cards, which is enough
for most development. The full setup is in the [README](README.md); how the
pieces fit together is in [ARCHITECTURE.md](ARCHITECTURE.md).

### Before you open a pull request

GitHub Actions is currently disabled for this repository. Run the checks locally and include
the command results, commit and limitations in your PR. Do not describe absent CI as passing.
All release commits use the configured maintainer identity; do not add assistant co-author trailers.


```bash
pnpm typecheck
pnpm test        # prompt, secret-detector, provider, retrieval-fusion, waiter and chef checks; need no database or API key
pnpm build
```

If you change the live chat prompt (`apps/api/src/prompt/`), run the evaluation
scripts too (`pnpm --filter @afribit/api dataset:communication-eval`; they call
a paid model and need an API key) and describe the before/after in your PR.
Results on a single run vary — read the individual judge notes, not just the
pass count.

### Rules that are not optional

- **Provider abstraction.** Nothing outside `apps/api/src/gateway` and
  `apps/api/src/providers` may know which inference provider is active. Application
  code calls `AfribitAIGateway.chat()`, never a provider directly. This is what
  makes a move to a community node or self-hosted models an infrastructure change instead
  of a rewrite.
- **Status gate.** Never write code that lets unreviewed content (`draft`,
  `needs_language_review`, `needs_factual_review`) reach a learner, and never let a
  model's — or a contributor's — judgment of their own output count as review. If
  you touch retrieval or anything that queries `knowledge_entries` or
  `language_entries`, check this first.
- **Auth.** New admin or Microtasks routes need `requireAdmin` / `requireAuth`
  (`apps/api/src/auth/plugin.ts`). There is deliberately no public path to admin.
- **Never ask for secrets.** Nothing may prompt for, collect, log or store a seed
  phrase, private key, PIN or password.
- **Safety examples use obviously fake data** — no real-looking wallet addresses,
  phone numbers or scam scripts.
- **Privacy.** No new telemetry, third-party calls or data collection without a
  discussion first. Where this project is heading is *less* data leaving the
  device, not more.

Keep pull requests small and focused, with a clear description of the problem and
how you checked the fix.

## 4. Research on the community node

The [roadmap's](ROADMAP.md) "Prove one node" stage is open research: finding the smallest open model that passes our Sheng and Kiswahili rubric, a compact (~1,000-token) prompt, local embeddings, and measuring how many people a modest machine can serve. Run a node with the [kit](deploy/community-node/README.md) on whatever hardware you have, evaluate it with the [methodology](docs/evaluation/methodology.md), and share what you measure — results published either way are useful. Open an issue to coordinate.

## Licensing of contributions

By contributing you agree that:

- original application code you contribute is licensed under [AGPL-3.0-only](LICENSE);
- content you contribute (teaching material, phrases, translations, knowledge
  entries) is licensed under [CC BY-SA 4.0](LICENSE-CONTENT);
- you wrote it, or have the right to contribute it.

Third-party material you add must be openly licensed, and its license and
attribution recorded in [NOTICE](NOTICE). Do not submit text copied from sources
you don't have the rights to — including scraped dictionaries and translated
religious texts of unclear provenance.

## Questions

Open an issue or a discussion. For anything about funding or partnerships, write
to [eddie@afribit.africa](mailto:eddie@afribit.africa).
