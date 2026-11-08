# F-004 — The gap list: what people ask that no card answers

**Status:** Built and tested 8 Oct 2026 (migration 019); not yet released · **Roadmap stage:** 2 · **Decision records:**
[ADR 0015](../adr/0015-how-the-assistant-learns.md) · **Related:** [F-003](F-003-say-it-your-way.md),
[data stewardship](../governance/data-stewardship.md)

## Problem

The assistant answers from reviewed knowledge cards. When people ask about something no card covers, it says
it isn't sure, and nobody learns from that. Reviewers can't see what is missing:

- the console only counts "search found little";
- the pilot's own report, and members' reports, catch a few cases by hand.

The community learns the same day only if reviewers know which cards to write next (ADR 0015, "the second
speed"). The gap list closes that loop.

## What people see

- **Reviewers and administrators,** in the console's new **Gaps** tab:
  - the topics people asked about that no card answered well, with how many times in the last 7 or 30 days;
  - the nearest existing card (often the one to extend);
  - the language most of them used.

  For each topic they choose **"card written"** (with the card), **"out of scope"** (not something this
  assistant should answer), or reopen it. A topic marked "card written" that keeps appearing shows that the new
  card isn't being found.
- **Members:** nothing changes, and nothing extra is kept about their question.

## How it works

1. **What counts as a gap.** After an answer has been sent, the question is a gap when no card is close **in
   meaning**: the best card's meaning-match score (bge-m3 cosine similarity) is below `GAP_THRESHOLD`
   (default **0.65**), or meaning search found no card at all. If meaning search did not run (switched off, or
   the embedding call failed), nothing is recorded, because it can't be judged. Questions refused for containing
   a secret are never gaps.
   - *Why not the older "confidence":* that value is the larger of the word-match and meaning-match scores, and
     the word-match score reaches 1 whenever a question shares common words such as "bitcoin" with a card. In the
     8 October test, questions no card covers (Kenyan tax, ATMs) scored 1.0. The console's "search found little"
     figure uses that value, so it undercounts. The Gaps tab replaces it.
   - *Calibration (8 Oct 2026, bge-m3, 27 test questions):* questions no card covers scored **0.42–0.65**; covered
     ones **0.67–0.79**. The margin is thin and the set is ours, so the threshold is a setting, reviewed after the
     pilot's first month. A different embedding model needs a new calibration.
2. **A topic, not the question.** After the answer has gone to the member, a small model (the waiter
   profile: the hosted model in cloud mode, the community's own model on a node) reads the question once and
   returns a **topic label**:
   - 2–6 words, in English, general;
   - it reuses an existing open topic when one fits, so counts add up;
   - no names, numbers, amounts, or places smaller than a city.

   The gate then rejects any label that has digits, an email or web address, a phone number or a secret, or
   is too long. A rejected label, or `GAP_LABELS=off`, counts the gap as "unlabelled".
3. **What is stored** (table `gap_events`): the topic, the **day** (not the time), the language mode, the
   nearest card's id, and the confidence rounded to one decimal. **No question text, no conversation or
   message id, no user, no address.** The day and the rounding make it impractical to match a gap back to a
   stored chat.
4. **Shown only at 5 or more.** The list shows a topic only when it has at least 5 questions in the period.
   Smaller topics are summed into one line ("12 more questions in 9 topics with fewer than 5"). Languages are
   named only where they have 5 or more.
5. **Decisions are audited.** Each status change records who made it, when, and the card and note.
6. **Per community.** Topics and events carry the pack id, like everything else.

## Data and privacy

- **No new kind of personal data.** The topic label is derived from the question but general by design. It
  is checked mechanically, and shown only in aggregates of 5 or more. This is the "gap list" row already
  agreed in data stewardship ("counts of questions no approved card answered, by topic; never shown below
  5"). No consent is needed because nothing about the person is kept.
- **The labeller sees the question once more, after the answer:**
  - On a node, this is the community's own model (Afribit's server for Afribit Local). Nothing new leaves.
  - On the public service, it is the small hosted waiter model (Gemma 3 12B), through the same routing service
    as the answers with zero-data-retention routing enforced. That may be a different underlying provider from
    the one that wrote the answer, so the question reaches one more hosted service. `GAP_LABELS=off` avoids
    this and keeps unlabelled counts.
- **It holds up under "no storage"** (`CHAT_RETENTION=none`): no text is kept for the gap list either.
- Deleting a conversation needs no extra step, because gap events are not linked to conversations.

## Acceptance tests

1. A question whose best meaning-match is 0.65 or more creates no gap. Below 0.65, or with no card, creates
   one. A question that can't be judged (meaning search off or failed) creates none, and neither does a secret.
2. The labeller's prompt lists existing topics. The output is parsed, and labels with digits, names-like
   patterns, emails, URLs, secrets or more than 6 words are rejected and counted as unlabelled.
3. Labels that differ only in case or spacing are the same topic.
4. The list hides topics under 5 and sums them. Languages under 5 are not named.
5. Only reviewers and administrators (by token and database role) can read the list or decide. Decisions
   are audited.
6. The `gap_events` table has no column that can hold question text or link to a conversation, user or
   message (checked against the real schema).
7. Gap recording never delays or breaks an answer: it runs after the answer, and its failures are logged,
   not thrown.

## Not in this feature

- Clustering by embeddings.
- Showing example questions.
- Suggesting card text automatically (a reviewer writes the card).
- Leader-facing reports beyond the console.

## Results (8 Oct 2026)

- **Standing tests:** `test:gaps` (11) and `test:db` (+4, real PostgreSQL), both in `pnpm test`.
- **With a real model** (a community box with Gemma 4 26B-A4B on a rented GPU; test questions only; Book entry
  2026-10-08-m):
  - **19 of the 19** uncovered questions became gaps; **0 of the 8** covered ones did.
  - **Labels.** After one prompt revision (prefer broad topics; reuse an existing topic for the same subject),
    the six tax questions became one topic, "Bitcoin taxation in Kenya" (6). Two more topics formed: "Bitcoin ATMs
    in Kenya" (5) and "Bitcoin mining" (5). Before the revision the tax questions split 3 + 3, so neither reached
    the 5 shown.
  - **No personal details reached a label.** Questions naming people, a phone number, amounts, a street and a
    landlord became "Withdrawing Bitcoin", "Paying rent with Bitcoin" and "Buying Bitcoin".
  - **The console:** in a browser, the three topics with 5 or more showed, and the three single-question topics
    appeared only as a sum. A reviewer marked one out of scope with a note; it was audited.
  - **Nothing kept:** with "no storage" set, 0 of 132 chat messages kept text.
- **Not yet tested:** labels from the public service's hosted Gemma 3 12B, which the test did not use.

## Decisions

- **Meaning-match threshold 0.65** (changed from the planned 0.3 after the test showed the old measure saturates)
  and **minimum 5:** the latter agreed through ADR 0015 and data stewardship.
- **Topic labels by the waiter model,** new in this spec. They follow the agreed "by topic" design and are
  on by default; `GAP_LABELS=off` turns them off and keeps unlabelled counts with the nearest card. Review
  after the pilot's first month: do the labels group well, and is any label too specific?

## Depends on

Retrieval confidence (live), the waiter profile (live), the pilot console (live), packs (live).
