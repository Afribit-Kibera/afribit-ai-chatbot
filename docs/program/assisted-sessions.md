# Assisted sessions: reaching people without their own phone or data, and measuring what changes

Status: **protocol draft, 3 October 2026. Not yet run.** Nothing here is a result.

## The gap this closes

The app needs a smartphone, mobile data and the ability to read. The people most exposed to Bitcoin scams are often the ones missing at least one of those. We have a node mode that removes the data cost for people within range of the community Wi-Fi, but that still assumes a phone. We have no SMS, USSD or voice channel (see the [roadmap](../../ROADMAP.md)).

So the first route to those people is **a person**: an Afribit educator or a trusted community member who runs the assistant *with* learners, on a shared device, at a place the learners already go. It is cheap, it works today, and it lets us measure whether anything changes, which no amount of technology can do for us.

## What a session is

- **Where:** a place learners already are: a market stall, a community hall, an Afribit connectivity point.
- **Who:** 3–8 learners and one educator, 45–60 minutes. Learners do not need a phone or an account.
- **Device:** the educator's phone or a shared tablet, connected to the community node (no data cost) or, until a node exists, to the cloud service.
- **Language:** each learner chooses; the educator never picks for them.

## Session outline

1. **Consent and explanation (5 min).** In the learners' language: what this is, that it can be wrong, that nothing is stored with their name, that they can stop at any time, that nobody should ever type a real seed phrase, PIN or password. (The consent wording must be written and reviewed by the community reviewers, not drafted by a model.)
2. **Before check (10 min).** Each learner answers the scam-recognition check below on paper, with the educator reading aloud for those who prefer.
3. **Ask the assistant (25 min).** Learners ask their own questions in turn. The educator reads the answer aloud and lets the group discuss. The educator marks any answer that seems wrong, stiff or unsafe with the thumbs-down button and a one-word reason.
4. **After check (10 min).** The same check with different but equivalent scenarios (so it measures understanding, not memory).
5. **Two questions (5 min).** "Did you understand the answers?" and "Would you ask it again?", on a paper card.

## The before/after check (scam recognition)

Eight short scenarios, each with a true answer a reviewer has agreed. For each: *"Is this safe, a scam, or not sure? What would you do?"* Score 1 for the correct judgement with a sensible action, 0 otherwise. Scenarios come from real patterns the reviewers have seen (fake support asking for a recovery phrase, "double your Bitcoin" giveaways, pressure to send first, a wrong-address payment, a promise of guaranteed returns, a request to borrow to buy).

- **Two parallel forms (A and B)** with different details. Half the learners do A before and B after; half the other way round.
- **Written by the three reviewers**, in the learners' language. Nobody at Afribit writes the scenarios in Sheng or Kiswahili by machine.
- **Answer key and scoring rules fixed before the first session.**

## What we report, and what we don't claim

We report, with the number of learners:

- The change in average score from before to after, and how many learners improved, stayed the same or got worse.
- The ratings: understood / would ask again.
- From `pilot:report`: questions asked, answers rated helpful or not, fallbacks, safety events, which topics had no good card (these become new cards).

We do **not** claim:

- Reduced scam losses. A single-session score change is not behaviour change. A follow-up call after four weeks ("have you been approached? what did you do?") can be added, and is still self-reported.
- Anything from fewer than about 30 learners except as an illustration. With 20–50 learners we can show whether the direction is positive and what went wrong, not a precise effect size, and there is no control group.
- That learners learned *from the AI* rather than from the educator and the group. To separate the two, run a few sessions where the educator teaches the same material from the plain cards with no AI, and compare. This is worth doing if funding allows.

## Roles and training

- **Educator:** trained for half a day. Knows the handouts, how to use the thumbs-down, what to do if a learner reveals a secret (stop, do not repeat it, tell them to move any funds and generate a new wallet).
- **Reviewer on call:** one of the three reviewers can be reached during the sessions to look at an answer a learner or educator doubts.
- **Escalation:** an answer found unsafe is recorded, the card is taken off air in the [review page](../guides/reviewer-guide.md), and we tell the other educators the same day.

## Data and privacy

- Paper forms use a code, not a name.
- The service stores no names; chat sessions are anonymous. Do not link a code to a chat session.
- The [pilot console](../guides/pilot-console-guide.md) (`/pilot`) and `pilot:report` show counts. Give each session site its own learner link (`?ref=<site>`) so its use shows as a channel; keep groups of 10 or more so the export's small-count rule does not blank them.
- `pilot:report` prints counts. `--samples` prints only answers rated unhelpful or blocked, for reviewers; handle those as sensitive.
- Participants can withdraw their paper form at any time.
- Before the first session: the privacy notice is translated and reviewed, and we have taken legal advice on Kenya's data-protection rules (see [data stewardship](../governance/data-stewardship.md)).

## Reaching further than a session

Sessions reach people one room at a time. They also generate the evidence and the corrections that make other channels worth building:

| Channel | What it needs | Honest status |
|---|---|---|
| Educator-led sessions | This protocol | Ready to run once consent wording and the check are written |
| Shared kiosk or tablet at a trusted place | A device, the node, someone responsible | Easy once a node exists |
| Printed cards and QR posters pointing at the app | Content reviewed by the reviewers | Easy |
| Feature phones: SMS/USSD | A partner with the shortcodes and a telco relationship (Machankura operates USSD in Kenya) | Not built; talk to them after the pilot |
| Voice (spoken questions and answers) | Speech models for Sheng and Kiswahili that work | Research; not planned for the pilot |
| Offline cards on the phone | Build work | Planned |
