# F-001 — Where the AI runs: an honest model-location label

**Status:** Live since 8 Oct 2026 (API release 20261008133325) · **Roadmap stage:** 1 · **Decision records:** [ADR 0009](../adr/0009-inference-modes-and-privacy.md), [ADR 0016](../adr/0016-afribit-local-community-box.md)

## Problem

The same app runs in four setups. In each one a member's question goes somewhere different:

| Setup | Where the question goes |
|---|---|
| A community node with its own GPU | Nowhere |
| A community box using Afribit's GPU in Kenya | To that GPU, not stored |
| `hybrid` | To an outside AI service when the node fails |
| `cloud` | Always to an outside AI service |

Today the app cannot tell which setup it is in, so any privacy sentence it shows could be false. Members
should see, in their own language, where their question is answered and how long it is kept, and it must
always be true.

## What people see

- **On the first screen** (onboarding and an empty chat), one sentence, for example:
  - *Community GPU:* "This assistant runs on Kibera's own server. Your questions stay here."
  - *Afribit Local:* "Your community's data stays on its own box. Questions are answered by Afribit's AI
    server in Kenya and are not stored there."
  - *Hybrid:* "Answered on Kibera's server. If it is down, some questions may go to an outside AI service."
  - *Cloud:* "Answered by an outside AI service that promises not to keep your question."
- **Retention**, from [F-002](F-002-privacy-settings.md), is appended to that sentence, for example: "Chats
  are deleted after 30 days."
- **In the chat header:** a small lock icon with a two-word label (e.g. "Stays here", "Afribit, Kenya",
  "Outside service"). Tapping it opens the full sentence and a link to the privacy page.
- **On an individual answer:** in `hybrid` mode, an answer that actually came from the outside service carries
  a short marker: "Answered by an outside AI service."
- The wording comes from the community's pack where it provides it, otherwise from the engine's defaults.
  Sheng and Kiswahili defaults are written by reviewers; until they approve them, the English text is used.

## How it works

- **A new setting, `MODEL_LOCATION`,** takes one of: `auto` (the default), `community`, `afribit`.
- **The API derives the location** it reports:

  | `INFERENCE_MODE` | `MODEL_LOCATION` | Reported location |
  |---|---|---|
  | `cloud` | any | `cloud` |
  | `hybrid` | any | `hybrid` |
  | `node` | `afribit` | `afribit` |
  | `node` | `community` | `community` |
  | `node` | `auto` | `community` **only if** `LOCAL_LLM_BASE_URL` points at this machine or its private network (localhost, a private IP range, or a container name without a dot); otherwise `remote` |

  `remote` is shown as "Answered on another server" with a warning in the server log asking the operator to
  set `MODEL_LOCATION`. So a misconfigured box can never claim "your questions stay here".
- **`GET /api/v1/pack` gains a `service` object:**
  `{ modelLocation: "community" | "afribit" | "hybrid" | "cloud" | "remote", retention: { mode, days } }`.
  The web app already reads this endpoint (`apps/web/src/lib/pack.ts`), so no new request is needed.
- **Each answer is marked with where it came from.** Answer responses (stream `done` event and JSON reply)
  gain `answeredBy: "local" | "outside"`. The gateway already knows which provider served the answer.
- **New pack strings, optional:** `privacy.location.<location>` and `privacy.short.<location>`.
  `pack:validate` checks them when a pack provides them.

## As built (8 October 2026)

- `apps/api/src/privacy/location.ts` (the rule), `privacy/service.ts` (what the API publishes),
  `routes/pack.ts` (`service` in `GET /api/v1/pack`), `chat/chatService.ts` (`answeredBy` on every answer).
- Web: `apps/web/src/lib/privacy.ts`, `components/PrivacyLine.tsx` (empty chat, Settings, header chip and its
  dialog), `MessageBubble.tsx` (the per-answer marker).
- **One tightening of the spec:** `auto` treats **private network addresses as `remote`**, not `community`.
  An Afribit Local box reaches Afribit's GPU through a tunnel on a private address, so a private address is
  not proof that the model is "here". Only this machine (`localhost`) or a sibling container counts. Anything
  else needs `MODEL_LOCATION=community` or `afribit`.
- **Deferred:** pack-provided wording (`privacy.location.*` in a pack). v1 uses the app's own wording, which is
  in the translation queue for the reviewers.
- **Tests:** `pnpm --filter @afribit/api test:privacy` (location rule, pack endpoint, `answeredBy`);
  `apps/web/src/lib/privacy.test.ts`; the Playwright journey "privacy label follows the server…".

## Data and privacy

This feature only reads configuration. It stores nothing.

## Acceptance tests

1. **Derivation** (unit tests):
   - `node` + `auto` + `http://ollama:11434` gives `community`.
   - `node` + `auto` + `https://gpu.example.com` gives `remote`.
   - `node` + `afribit` gives `afribit`.
   - `hybrid` gives `hybrid`; `cloud` gives `cloud`.
2. **The endpoint:** `GET /api/v1/pack` returns `service.modelLocation` and `service.retention` (pack route
   test).
3. **Answer marking:** in `hybrid`, a reply served by the cloud fallback carries `answeredBy: "outside"`; in
   `node` it is always `local` (gateway test with a fake provider).
4. **The web app:** for each location, the banner, header label and privacy page show the matching text
   (Vitest), and the Playwright journey checks the banner appears on first load.
5. **Never overstating:** no code path shows "stays here" unless `modelLocation` is `community`. A test asserts
   this for every combination.

## Not in this feature

- Proving the GPU server keeps nothing. That is the security review of [F-006](README.md#register).
- Per-channel labels (Telegram etc.). Those come with [F-007](README.md#register).

## Decisions

1. **Accept the `remote` fallback.** *Taken as recommended on 8 Oct 2026 (not explicitly answered — say if you disagree).* This means an unconfigured box says "another server" rather than
   guessing. Recommended: yes.
2. **Who writes the Sheng and Kiswahili sentences.** Recommended: the three reviewers, as part of the
   blind-review round.

## Depends on

Nothing external. [F-002](F-002-privacy-settings.md) supplies the retention part of the sentence. The two can
be built together.
