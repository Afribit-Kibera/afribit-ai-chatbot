# F-013 — The public website tells today's story

**Status:** Built 8 Oct 2026 · **Roadmap stage:** 1 · **Related:** [F-001](F-001-model-location-label.md),
[F-002](F-002-privacy-settings.md), [F-003](F-003-say-it-your-way.md), [F-012](F-012-invitation-only-accounts.md),
[ADR 0015](../adr/0015-how-the-assistant-learns.md), [ADR 0016](../adr/0016-afribit-local-community-box.md),
[ADR 0017](../adr/0017-ask-anything-mode.md)

## Problem

The public site (`ai.afribit.africa`) was written before the 8 October decisions. Some of it is now wrong:

- it says chats stay on the server until a member asks for deletion (they are deleted after 30 days, and
  members can delete them at any time);
- it says an account is needed to contribute (anyone can suggest wording; accounts are by invitation);
- it describes the "waiter and kitchen" pipeline, which the public service does not run;
- its GPU sizes come from before E-001.

It also leaves out what the project now is:

- a community's own AI, run two ways (self-hosted, or Afribit Local);
- how it learns (only through the community's reviewers);
- the privacy choices members see in the app;
- what is still planned.

## What people see

The same design and sections, with new words:

| Section | Message |
|---|---|
| Hero | A community's own AI assistant: its language, its reviewed knowledge, its own machine. Starting with Bitcoin education in Kibera and Nairobi |
| Three benefits | Your language (and you can suggest better wording) · Reviewed knowledge (it says when it doesn't know) · **You see where your question goes** (the app shows where the AI runs and how long chats are kept; delete them any time) |
| How it works | Ask in your words · an answer from reviewed cards · know where it goes (the public service's real setup) |
| Trust | **People decide what it learns** · secrets have no place in chat · **you choose what is kept** · the code is open |
| Community | Two ways to run it: **run it yourself, free** (a node) · **Afribit Local, planned** (a box keeps the data; Afribit's server in Kenya answers and keeps nothing). Plus: shape it in your community's words (members suggest; invited trainers and reviewers approve) |
| FAQ | Updated answers on privacy, cost, who checks, accounts. New: "Where does the AI run?" and "Will it answer anything?" ("Ask anything" is planned, labelled and off by default) |
| Community node page | GPU sizes from E-001; Afribit Local for communities without a GPU |

## Rules for the words

- Every sentence must be true **today**, or be marked as planned. The claims register and the copy truth table
  decide.
- Never a bare "private". Name the setup.
- Never "it learns from your chats".
- Afribit Local has **no price** and is **not available yet**.
- "Open-source software", not "open-source model", until the default model switches (ADR 0018).

## How it works

- English text in `apps/web/src/locales/en.json`. The Kiswahili and Sheng files are refreshed with English
  placeholders until reviewers translate them (the pending-translation banner stays).
- `PublicSite.tsx`: the third benefit, the trust items, a third community option, two FAQ entries.

## Acceptance tests

1. The browser journeys still pass. Prerendered pages work without JavaScript, and the axe checks pass.
2. No sentence contradicts the claims register (checked by hand against it, line by line).
3. The live site shows the new text after deploying.

## Not in this feature

Translations, which the community reviewers do. A new design.
