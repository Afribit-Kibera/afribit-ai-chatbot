# F-003 — "Say it your way": members suggest wording, reviewers decide

**Status:** Live since 8 Oct 2026 (API release 20261008133325) · **Roadmap stage:** 2 · **Decision records:** [ADR 0015](../adr/0015-how-the-assistant-learns.md) (the "same day, for everyone" speed)

## Problem

The assistant's register is the thing members notice first and models get last. Members are the experts:
they know when an answer sounds formal, foreign or wrong. Today a member can only report a bad answer. They
cannot show how it should sound, and that is the most valuable language data we could have.

ADR 0015 also rules out learning straight from chats, so every suggestion must pass a reviewer before it
changes what anyone else hears.

## What people see

**Member, under any answer:** a **Say it your way** action, in the member's language (for example "Sema kwa
style yako" — exact wording by the reviewers). It opens a short form:

1. The answer, and a box to write how they would say it. The box starts empty: suggestions should be their
   words, not small edits.
2. "What was off?" (optional): too formal · wrong words · wrong facts · other.
3. **What may we use it for?** Each has its own checkbox:
   - "Improve the assistant's answers, after a reviewer checks it". Ticked by default; the member can untick.
   - "Test the assistant". Not ticked.
   - "Train future versions of the assistant". Not ticked.
4. **Send.** "Thank you. A reviewer will check it. Nothing changes for anyone else until then."

**Reviewer, in the review area:** a **Suggestions** queue. Each item shows:

- the original question and answer (when the member shared them);
- the suggestion, its language and the reason;
- the member's consent choices.

Actions:

- **Approve as wording.** The phrase is added to the community's approved language examples, with the uses
  the member allowed.
- **Card needs fixing.** It opens the card in review when the problem is a fact, not the wording.
- **Ask for changes.**
- **Reject**, with a reason.

**Leader:** counts in the console. Suggestions raised, approved and rejected this week, and roughly how long
reviews take.

## How it works

### Endpoint

`POST /api/v1/teach`. No account needed.

```json
{
  "sessionId": "…",
  "messageId": "…",
  "answerText": "…",
  "questionText": "…",
  "suggestion": "…",
  "languageMode": "sheng",
  "reason": "too_formal|wrong_words|wrong_facts|other",
  "consent": { "answers": true, "testing": false, "training": false }
}
```

- `messageId` is optional.
- `answerText` and `questionText` are sent only when the member shares them. They are needed when the server
  stores no chats ([F-002](F-002-privacy-settings.md) `none`).

### Checks

- The suggestion has 3–1,000 characters.
- `languageMode` is a mode of the pack.
- **Secret detection** runs on the suggestion: a suggestion containing a seed phrase or key is refused, with
  the usual warning.
- Rate limits: 5 per hour per IP and 3 per conversation.

### Storage

- A new table, **`teach_suggestions`**, holds:
  - the suggestion and the shared question and answer text;
  - the reason and the language;
  - **the member's consent**, kept separately from any use flag;
  - the pack ID, a status (`pending`, `approved`, `needs_changes`, `rejected`, `card_fix`) and timestamps;
  - the reviewer and the decision.
- **Nothing is usable until approved.**
  - On approval, the reviewer's edited phrase becomes a `language_entries` row with
    `source = 'teach_mode'`, `human_authored = true`, `synthetic = false` and `status = 'approved'`.
  - Each `allowed_for_*` flag is set to *the member's consent AND the reviewer's approval*. A suggestion
    without training consent can never become training data.
- The existing retrieval of language examples (`retrieveLanguageExamples`) already uses approved entries
  cleared for retrieval, so an approved suggestion shapes the next answers at once. That is the "same day"
  speed.

### Review rules

- No one approves their own suggestion.
- Suggestions on safety topics (seed phrases, scams, sending money) need a **second reviewer**. This reuses
  the two-person rule built for cards.
- Every decision is written to the audit log.

### If the conversation is deleted

Deleting the conversation ([F-002](F-002-privacy-settings.md)) removes the shared question and answer text and
the link to the conversation. The suggestion itself was given with consent, so it stays, unless the member
deletes it with their other contributions.

## As built (8 October 2026)

**API:**

- Migration `017_teach_suggestions.sql`.
- `apps/api/src/teach/rules.ts`: validation, the safety-topic rule, consent mapping and decisions.
- `teach/store.ts`: suggestions are stored; approval writes the language entry, the decision and the audit
  record in one transaction.
- `routes/teach.ts`: `POST /api/v1/teach`, `GET /api/v1/teach/queue`, `POST /api/v1/teach/:id/decide`.
- The reviewer queue is the pilot console's new **Suggestions** tab.

**Web:**

- `components/TeachDialog.tsx`, opened from a "Say it your way" action under each answer.
- The quoted answer is shown for context.

**Differences from the spec, on purpose:**

- **No "ask for changes".** An anonymous member cannot be reached, so reviewers tidy the wording themselves
  before approving. The decisions are **approve**, **card needs fixing** and **reject**.
- **What is shared.** The answer being rewritten (the AI's words) is always sent. The member's own question
  is sent only while "Include my question" stays ticked; it is ticked by default and can be unticked.
- **Safety topics** are recognised by a deliberately broad multilingual word rule (seed phrase, PIN,
  password, scam, support, "tuma pesa" and its verb forms…). A false positive only means a second reviewer.
- **Where an approved phrase is used.** It goes into the community's language examples, which the engine
  uses for **code-switched modes (Sheng and mixed)**. In plain English or Kiswahili modes, approved phrases
  are kept, but they do not reach the prompt yet. That is an engine limit to revisit, not a feature of this
  design.
- **Limits:** 5 suggestions per hour per address, and 3 per conversation per day.
- **Account deletion.** A signed-in member who deletes their account with "delete my contributions" also
  removes their undecided suggestions. Approved ones are handled like their other contributions.

**Tests:**

- `test:teach`: 12 checks.
- The real-PostgreSQL check: 6 suggestion checks, including that the language-example query actually finds
  an approved phrase, and the two-reviewer rule.
- `src/lib/teach.test.ts`.
- The Playwright journey "say it your way…".

## Data and privacy

- Stores what the member chose to send, with per-use consent.
- A new row in the [data stewardship](../governance/data-stewardship.md) "learning features" table, which
  already describes this feature.
- The [threat model](../security/threat-model.md) row "Poisoning through Teach mode" is answered by the review
  gate, the second reviewer on safety topics, and the rate limits.

## Acceptance tests

1. **Validation.** Length, mode, rate limits; a suggestion containing a seed phrase is refused and not stored.
2. **Consent stays separate.** A stored suggestion has every `allowed_for_*` false until approved. After
   approval each flag equals consent AND approval. Training is never true without training consent.
3. **Review rules.** Self-approval is refused. A safety-topic suggestion needs two reviewers.
4. **It actually changes answers.** After approval, the phrase is returned by `retrieveLanguageExamples` for a
   matching question (database test).
5. **Deletion.** Deleting the conversation clears the shared texts and keeps the consented suggestion.
6. **The web app.** The form, the consent defaults (only "answers" ticked) and the thank-you message
   (Vitest), plus one Playwright journey from answer to queue.
7. **Metrics.** The console counts raised, approved and rejected suggestions per week.

## Not in this feature

- Rewards in sats for approved suggestions (Later; needs anti-abuse and reputation first).
- Voice suggestions.
- Automatic approval of anything.
- Using suggestions to train a model. That needs the training-consent policy and the release gate
  (roadmap Stage 6).

## Decisions

1. **The exact label in each language.** Still open: the reviewers write it. The reviewers decide.
2. **Whether anonymous members may suggest, or only signed-in contributors.** **Agreed:** anonymous, with rate limits, every suggestion reviewed. Accounts are for authorized trainers only ([F-012](F-012-invitation-only-accounts.md)). Recommended: anonymous, with
   the rate limits, so learners can teach it without an account. Revisit if spam appears.
3. **Whether "Improve answers" is ticked by default.** *Taken as recommended (ticked; training never ticked); not explicitly answered.* Recommended: yes, because it is reviewed first and the
   member can untick it. "Training" is never ticked by default.

## Depends on

- [F-002](F-002-privacy-settings.md), for the shared-text rules when no chats are stored.
- The review page (built) for the queue.
- Reviewers being available weekly, which Stage 2 measures.
