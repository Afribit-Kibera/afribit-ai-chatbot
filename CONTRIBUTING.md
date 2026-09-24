# Contributing to Afribit AI

Afribit AI is built on a simple rule: **the community doesn't learn to speak
like AI — the AI learns to speak like the community.** That means this
project needs more than code. It needs people who actually speak Sheng,
Kiswahili, and English the way Kibera and Nairobi speak them, and people
who understand Bitcoin well enough to catch a wrong or unsafe answer
before a beginner ever sees it.

There are three ways to contribute. Pick whichever matches what you know —
you don't need to be a developer to make this product better.

## 1. Language review (no coding required)

The two source teaching manuals in this repo —
[`Bitcoin_Basics_in_Kenyan_Sheng_Afribit_AI.docx`](Bitcoin_Basics_in_Kenyan_Sheng_Afribit_AI.docx)
and
[`Basic_Communication_Skills_in_Kenyan_Sheng_Afribit_AI.docx`](Basic_Communication_Skills_in_Kenyan_Sheng_Afribit_AI.docx) —
were presented to and approved by community reviewers on 2026-09-23 as
each manual's **Version 1.0, first community-approved version**. That
approval isn't a finish line, though: Sheng changes by age, neighbourhood,
and context, and this is a living document — a phrase that sounds natural
to one reviewer can sound dated or wrong to another, or to the same
reviewer a year from now. Every chapter ends with a review worksheet built
for exactly this ongoing correction process, and future corrections ship
as new reviewed versions, not silent edits to v1.0.

To review:

1. Read a chapter's Sheng Teaching Version against the Simple English
   next to it.
2. Ask: does this sound like something a real person in your
   neighbourhood would actually say? Is anything outdated, too formal, too
   informal, or unsafe?
3. Record corrections using each manual's own Appendix C worksheet format
   (original phrase → suggested phrase → reason → your area/age group →
   confidence). Don't just say "wrong" — say what you'd actually say
   instead and why.
4. Never include a real seed phrase, private key, password, or other
   secret in a correction or example — use obviously-fake placeholders
   only, the same rule the manuals themselves teach.

For corrections to the two existing manuals, send them through whatever
channel the person who shared this repo with you set up (issue, pull
request editing the source `.docx`/`.json`, or a direct message) — that
part still has no dedicated tool.

For a **new** phrase or example (not a correction to existing content),
there's now a real submission path: **Microtasks**. Register an account
(`POST /api/v1/auth/register`, or the "Contributor account" section in
the app's Settings screen), submit a phrase, and other contributors can
review it. See [`docs/AUTH_AND_MICROTASKS_2026-09-24.md`](docs/AUTH_AND_MICROTASKS_2026-09-24.md)
for the full API. You cannot review your own submission — that's
enforced by the server, not just a guideline.

**Where your review goes:** Version 1.0 of both manuals is already
`published`/`approved` in the database and live in chat retrieval — your
correction doesn't need to clear a first-time review gate, it becomes the
next reviewed version. New content (a future volume, or a correction that
changes meaning rather than just phrasing) still starts at
`status = 'needs_language_review'` and is **not** shown to real users
until a reviewer's correction gets it promoted — same gate, just not the
one v1.0 is behind anymore. See [`docs/LANGUAGE_CORPUS.md`](docs/LANGUAGE_CORPUS.md)
for the full provenance model, and
[`docs/adr/0005-microtasks-human-feedback-layer.md`](docs/adr/0005-microtasks-human-feedback-layer.md)
for why AI-generated or unreviewed content can never promote itself.

## 2. Bitcoin content review

If you know Bitcoin well: read the same two manuals for factual accuracy,
not just language. Flag anything that's outdated, technically wrong, or
gives advice the manual's own rules say it shouldn't (e.g. anything that
reads as a guaranteed-return claim, or that would make sense to ask for a
seed phrase). The manuals cite their sources at the end of each document —
if you're correcting a fact, cite where you got the correction too.

## 3. Code

Standard GitHub flow: fork, branch, PR. A few things specific to this repo:

- **Read [`Afribit_Chatbot_PRD.md`](Afribit_Chatbot_PRD.md) and
  [`docs/adr/`](docs/adr) first.** Several design decisions here look
  unusual until you've read the reasoning — in particular, the provider
  abstraction rule below is load-bearing, not a style preference.
- **The provider abstraction rule is not optional.** Nothing outside
  `apps/api/src/gateway` and `apps/api/src/providers` may know which
  inference provider is active. Application code calls
  `AfribitAIGateway.chat()`, never `OpenRouterProvider` directly. See the
  README's "Key architectural rule" section for why.
- **New admin or Microtasks routes need `requireAdmin`/`requireAuth`.**
  See `apps/api/src/auth/plugin.ts`. There is no public path to admin
  anywhere in this codebase (an operator runs `promoteToAdmin.ts` by
  hand) — don't add one, even for convenience.
- **Knowledge and language data have a status gate for a reason.** Never
  write code that lets unreviewed content (`draft` / `needs_language_review`
  / `needs_factual_review`) reach a real user, and never let one AI model's
  (or one self-interested human's) judgment of their own output count as
  review — see `docs/adr/0005-microtasks-human-feedback-layer.md` and
  `routes/microtasks.ts`'s self-review block. If you're touching
  `apps/api/src/knowledge/retrieval.ts` or anything that queries
  `knowledge_entries`/`language_entries`, this is the first thing to check.
- **Run the checks before opening a PR:**

  ```bash
  pnpm typecheck
  pnpm --filter @afribit/api test:prompt-golden   # prompt-construction regression check, no DB/API needed
  ```

  If your change touches the live chat prompt (`apps/api/src/prompt/`),
  also read [`docs/COMMUNICATION_STYLE_EVAL.md`](docs/COMMUNICATION_STYLE_EVAL.md)
  before and after — it's both a worked example of how this project tests
  prompt changes and the regression history for two real bugs found that
  way.
- **Don't invent secrets or scam scenarios with real-looking detail.**
  Safety examples throughout this codebase use obviously-fake data
  (`Bei ni ngapi kwa KES?`-style scripts, not real wallet addresses or
  phone numbers). Keep it that way.
- **Small, focused PRs.** This is a young prototype (see the README's
  "Status" section) — large speculative refactors are harder to review
  than a working product justifies right now.

## Questions

Start with [`README.md`](README.md) and [`Afribit_Chatbot_PRD.md`](Afribit_Chatbot_PRD.md) —
most "why does it work this way" questions are answered in one of the two.
For anything not covered, open an issue.
