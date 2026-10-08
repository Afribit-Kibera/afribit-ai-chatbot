# F-002 — Privacy settings: no storage, retention, deletion

**Status:** Live since 8 Oct 2026 (API release 20261008133325) · **Roadmap stage:** 1 · **Policy:** [data stewardship](../governance/data-stewardship.md)

## Problem

Today the server keeps every chat message forever. Anyone holding a conversation's ID can read it
(`GET /api/v1/chat/:sessionId`), and nobody can delete anything. The data-stewardship policy promises three
things:

- a no-storage option;
- a short, fixed retention period;
- per-person deletion.

None of them is built, and the pilot cannot start without them.

## What people see

- **The setting, in the privacy sentence** ([F-001](F-001-model-location-label.md)):
  - "Chats are not stored on the server; they stay on your phone."
  - "Chats are deleted after 30 days."
  - "Chats are kept until you delete them."
- **In a conversation's menu:** **Delete this conversation**. It is removed from the server at once and,
  optionally, from this phone.
- **In Settings → Your data:**
  - **Delete all my conversations**, which removes every conversation this phone started.
  - For people with an account, **Delete my account** (account, preferences and conversations).
  - Each action has a plain-language confirmation.
- **When reporting an answer** while the server stores no chats, the report form says: "To help the reviewers,
  include this question and answer with your report?" It is ticked only if the member chooses.

## How it works

### The setting

`CHAT_RETENTION` takes one of:

- `none`;
- a number of days, e.g. `30d`;
- `keep`.

The community may also set it in its pack (`privacy.retention`), which wins for that pack. The value is
published in `GET /api/v1/pack` → `service.retention`.

### `none`

- **No message text is written to the database.** The server still writes one row per message holding only
  metadata: role, time, language, token counts, the IDs of the cards used, the safety flag, and an empty
  `content`. The pilot console's counts therefore keep working.
- **Context comes from the browser.** The browser already keeps each conversation locally
  (`apps/web/src/lib/history.ts`). With each message it sends the last turns as `history`: at most 8 turns,
  each at most 2,000 characters, roles `user` or `assistant` only.
  - The server validates them and uses them instead of `loadHistory()`.
  - A member could edit their own `history`. That only affects their own answer, and every safety check still
    runs on the output.
- **`GET /api/v1/chat/:sessionId` returns an empty list**, so there is nothing to read.
- **Reports carry their own text.** A report may include the question and answer text, only if the member
  ticked the box. It is stored on the report (`message_feedback.question_text`, `answer_text`) and deleted
  when the report is resolved, plus the retention period for reports (decision 3).

### `Nd`

An hourly job empties `content` for messages older than N days and records `content_deleted_at`. It also
clears report comments and attached text older than N days, unless the report is still open.

### Deletion

- **`DELETE /api/v1/chat/:sessionId`.** Holding the conversation's ID is the permission, exactly as reading it
  is today. Deleting removes:
  - the conversation and its messages, with their feedback by cascade;
  - the conversation's link from its safety events (the events stay, with no session).

  It answers `204` even when the ID is unknown, so it reveals nothing.
- **`POST /api/v1/chat/delete`** with `{ sessionIds: [...] }` (up to 50) removes all of this phone's
  conversations at once.
- **`DELETE /api/v1/me/conversations`** and **`DELETE /api/v1/me`** (signed in): conversations, preferences and
  the account.
  - Contributions (phrases, "say it your way" suggestions) are kept without the person's name, or deleted, as
    they choose. Data stewardship already describes this choice.
  - Deletions are recorded in the audit log as counts only, never content.

### A fix this depends on

Today the chat routes accept a `userId` from the request body without checking it. Before any "my
conversations" feature exists, the user ID must come only from the signed-in token. Otherwise anyone could
attach a conversation to someone else's account, or delete theirs.

### Backups

Deleted data remains in encrypted backups until they rotate. The privacy notice states the backup period
(decision 2).

## As built (8 October 2026)

- **Migration:** `db/migrations/016_privacy_settings.sql` (`content_deleted_at`; `question_text` and
  `answer_text` on reports).
- **API:**
  - the setting: `config/env.ts` `CHAT_RETENTION`, default `30d`; the node kit default is `none`;
  - `privacy/retention.ts`, `history.ts`, `store.ts` (deletion and the sweep), `sweep.ts` (hourly);
  - `routes/privacy.ts` (the four delete routes);
  - `routes/chat.ts` (history, the empty GET under `none`, report text, **`userId` from the verified token
    only**);
  - `pilot/store.ts` (the review queue uses shared report text when no chat text exists).
- **Web:**
  - "Delete everywhere" in the conversation dialog;
  - "Delete all my conversations" in Settings;
  - "Delete my account" on the contributor page;
  - the report form's share option when no chats are stored;
  - recent turns sent with each message.
- **Deferred:** a per-pack retention override (the setting is per server in v1); a user-facing export.
  Backup rotation (14 days) is an operations setting, recorded here and in the privacy notice.
- **Tests:**
  - `test:privacy`: 22 checks (routes, fakes, rules);
  - a real-PostgreSQL check of every SQL statement in `privacy/store.ts` and the queue query: 9 checks,
    run with PGlite in the maintainers' experiments (`2026-10-08-privacy-sql`); to move into CI;
  - web unit tests;
  - the Playwright journeys for deleting.

## Data and privacy

The data this feature is about. It changes the [data stewardship](../governance/data-stewardship.md) "today"
section from planned to built, and the privacy notice draft.

## Acceptance tests

1. **`none` writes no text.** After a two-turn chat, every stored `content` for that session is empty
   (database test). Answers still use the previous turn: a follow-up question resolves "it", using the
   history the client sent.
2. **`none` keeps the counts.** Pilot console counts (questions, conversations) still increase.
3. **`30d` empties old text.** The job empties text older than 30 days and leaves newer text (test with
   back-dated rows). Open reports keep their text.
4. **Deleting a conversation.** `DELETE /api/v1/chat/:id` removes the session and messages; a second call, or
   an unknown ID, still returns `204`.
5. **Deleting in bulk.** `POST /api/v1/chat/delete` removes up to 50 conversations and refuses 51.
6. **Signed-in deletion.** `DELETE /api/v1/me/conversations` removes only the signed-in person's
   conversations. A `userId` in the body is ignored (security test).
7. **History validation.** Over-long or malformed `history` is rejected with `400`.
8. **The web app.** The delete actions call the API and clear local history when asked; the report form only
   sends text when ticked (Vitest and Playwright).
9. **Docs.** Data stewardship and the privacy notice draft describe the shipped behaviour.

## Not in this feature

- Encrypted backups and their rotation (Stage 2 operations).
- Learner memory ([F-011](README.md#register)).
- Exporting your own data. A small follow-up: the browser already holds your conversations.

## Decisions (agreed 8 Oct 2026)

1. **Default retention.** **Agreed:** 30 days for the cloud demo and Afribit Local; no storage on the pilot node. Recommended:
   - `30d` for the cloud demo and for Afribit Local;
   - `none` as the recommended setting for the pilot node, since the pilot's analysis uses aggregates and
     consented reports only.
2. **Backup rotation period.** **Agreed:** 14 days. It sets how long deleted data can survive. Recommended: 14 days.
3. **How long resolved reports keep attached text.** *Taken as recommended (30 days after resolution); not explicitly answered.* Recommended: 30 days after resolution.

## Depends on

Nothing external. Build together with [F-001](F-001-model-location-label.md), which displays the setting.
