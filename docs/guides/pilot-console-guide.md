# Pilot console guide

For the people running the pilot: Afribit's programme lead and the developers who act as reviewers. The console shows, live, what is happening with real use, so it can be monitored and quoted honestly in reports and funding proposals.

Open `/pilot` on your service (for example `https://your-service/pilot`) and log in with a **reviewer** or **administrator** account. It works on a phone. If the server serves several community packs, `/pilot?pack=<id>` shows that pack.

## Who can do what

| You are | You can |
|---|---|
| Reviewer | See the Overview, work the Queue (read what was asked and answered, resolve reports), make links |
| Administrator | All of that, plus download the daily CSV and manage the Team tab (make someone a reviewer or administrator) |
| Anyone else | Nothing here. Learners never see the console |

Accounts are by invitation ([F-012](../features/F-012-invitation-only-accounts.md)). An administrator creates a single-use code in **Team → Invitations** for a contributor or a reviewer; the person enters it under Contribute in the app. To change a role later, an administrator finds them in **Team** and sets it. The change applies on their next request (they may need to log in again to get a fresh session). Every role change is written to the audit log, and the last administrator cannot be demoted, so the service cannot be left without one.

## Privacy: what the console knows and does not know

- Anonymous chat has **no identity**. The console counts *conversations* (sessions), not people. The same person on two phones, or on two days after clearing their browser, is several conversations.
- Overview and the CSV are **aggregates only**: counts, shares, times, cost. No question or answer text.
- Question and answer text appears **only in the Queue tab** (reported or not-helpful answers, and answers flagged by the safety system), only to reviewers and administrators, and is **never in any export**. Treat it as sensitive; do not paste it into reports, chats or proposals.
- A **channel label** says where a link was shared (`?ref=kibera-hub`). It is not a person. See [data stewardship](../governance/data-stewardship.md#channel-labels-source).

## Overview: how to read each number

Pick a period (today up to a year) and optionally one channel. Days are Nairobi time. "Last 7 days" is today plus the six days before it. The page refreshes every minute while it is open and visible; the server caches the numbers for 30 seconds.

| Number | What it is | Read it carefully |
|---|---|---|
| Conversations started | Chats that began in the period | Not people. One person can start several |
| With 2 or more questions | Conversations where the learner asked at least twice | A rough sign of real use rather than curiosity; still not people |
| Questions asked | Messages learners sent (including ones refused for containing a secret) | |
| Helpful / not helpful | Thumbs from learners | Only a minority rate anything. Say "of the answers that were rated", never "X% of learners were satisfied" |
| Reports waiting | Not-helpful or reported answers nobody has resolved yet | Your work queue |
| Per day chart | Bars: questions. Line: conversations started | Quiet days are real zeros |
| Channels | Conversations, questions, thumbs per link label | "(no label)" is anyone who arrived without a `ref` link, or with an invalid one |
| Language chosen | Share of conversations by the language the learner had selected at the start | Not a measure of how well each language works |
| Saved card shown because the model failed | The AI could not answer, so a reviewed card was shown instead | A reliability number, not a quality number |
| Withheld by the output safety check | Answers stopped because they broke a safety rule | Should be near zero. Look at each one in the Queue's flagged list |
| Search found little | Answers where no reviewed card matched well (confidence under 0.3) | These are topics that need a new card |
| Answer time | Middle and slowest-1-in-20, for the **whole** answer | Not time to first word (that is not recorded) |
| Safety events | Secrets caught on the way in (nothing was sent to a model), and answers flagged for names or figures that were not in the cards | |
| Cost | Hosted-model calls, failures, cost, and cost per 1,000 answers | Hosted-model spend only (includes reviewers' test answers). It leaves out electricity and hardware for a community node. Shown for **all channels** only, because a failed call cannot be tied to a channel |
| Corrections | Reports raised and resolved in the period, and how many wait now | This is the pilot plan's "corrections raised and resolved" |
| Knowledge cards by status | The review pipeline | |
| Community contributions | Language entries submitted through Microtasks in the period | |

When there is no data the page says so ("No data yet") instead of showing zeros that look like results.

## Queue: closing the loop on bad answers

A learner can tap thumbs-down and say why. Each report appears here with the question, the answer, the reason and comment, the language and channel, and the reviewed cards the assistant was given (links open the review page). The notice **"No card was found"** means the assistant had nothing reviewed to answer from: write a card.

For each report choose what happened and add a note:

| Resolution | Use when |
|---|---|
| The answer was fine | The learner disagreed but the answer is correct |
| I fixed the card | The card was wrong or incomplete and you edited it in the review page |
| A new card is needed | No card covered this; you (or someone) will write one |
| The wording needs fixing | The facts were right but the language was stiff or unnatural. Raise it with the language reviewers |
| The report was mistaken | A mis-tap, spam or unrelated |
| Something else | Say what in the note |

Each resolution is logged (who, when, what) in the audit log. Open reports are listed oldest first. The collapsible **Flagged by the safety system** list shows answers the checks flagged even though nobody reported them; it is read-only.

Answers from before this feature was added have no record of which cards were used; the page says "not recorded".

## Team (administrators)

Search by name or email, change a role, save. Roles: `contributor` (can do Microtasks), `reviewer` (can edit cards, use the console), `admin` (everything, including this tab and the export). The command line `pnpm --filter @afribit/api db:promote:admin <email> reviewer|admin` still works if you ever need it.

**Invitations** (open the panel at the top of the tab):

1. Choose the role (contributor or reviewer), who it is for (optional, for your own records) and when it expires (1, 7 or 30 days).
2. **Create invitation.** The code (like `AFB-7K4M-Q9TX`) is shown **once**. Copy it and pass it on privately, in person or in a direct message, never in a group chat. It is not stored, so it cannot be shown again; if it is lost, revoke it and make a new one.
3. The list shows each invitation as open, used (by whom, when), expired or revoked. **Revoke** stops an open one.

Administrators are never made by invitation: invite the person as a reviewer, then change their role here. Every invitation created, used or revoked is written to the audit log.

Without the console (a new node, or a terminal on the server): `pnpm --filter @afribit/api invite:create --role reviewer --note "who it is for"`, or on a node, `docker compose exec api node dist/auth/inviteCli.js --role reviewer`.

**Accounts made before invitations (before 8 Oct 2026)** could be created by anyone. Look through the list and change to `contributor`, or ask to remove, any account you don't recognise.

## Links: counting where learners come from

Type a label for a place, group or poster (lowercase letters, numbers and hyphens, up to 32 characters, such as `kibera-hub`). The console gives you `https://ai.afribit.africa/app?ref=kibera-hub`, a Copy button, and a QR code (also downloadable as SVG) to print on posters. The QR code is drawn in your browser; nothing is sent anywhere. The app address can be changed (it is remembered in your browser) for a community running its own service.

- Use one label per place or event. Labels are permanent once learners have used them.
- Use a label for a group of about 10 or more learners. See the small-count rule below.
- Never put a name, phone number or anything personal in a label.
- The label is kept in the learner's browser, so it survives reloads and installing the app to the home screen. Some browsers (notably iPhones) keep an installed app's storage separate from the browser, so a person who opens a link and then installs may be counted as "(no label)" afterwards. Treat channel counts as a lower bound.

## The daily CSV and the small-count rule

Administrators can download a CSV from the Overview. Each row is one **day and channel**:

`date, source, sessions, questions, helpful, not_helpful, fallbacks, safety_events`

**Any cell below 5 is left blank, including zero, and a row with nothing left is dropped**, so that a very small group (three learners at one hub on one day) cannot be picked out. The CSV never contains question or answer text, identifiers, or anything but dates, channel labels and counts. `safety_events` includes secrets caught, answers flagged as ungrounded, and answers withheld by the output check.

Because small cells are blank, adding up a column will not equal the Overview total. For totals, use the Overview; for anything you share outside the team, use the CSV or numbers rounded from the Overview, and apply the same rule yourself: do not quote a count below 5 for a channel.

## What is NOT measured

- **Learning, trust and scam recognition.** The console cannot show whether anyone understood more or fell for fewer scams. Those need the educator-run before/after check in the [assisted-sessions protocol](../program/assisted-sessions.md) and the survey in the [pilot plan](../program/pilot-plan.md).
- **Unique people, returning users, retention.** Chat is anonymous by design.
- **Time to first word.** Only the whole answer time.
- **Whether the answers are correct.** Thumbs are a signal, not an audit. Factual accuracy comes from reviewers sampling answers.
- **Anyone without a phone, data or the ability to read.** The console only sees people who used the app.
- **Cause.** A rise in questions after a poster went up is consistent with the poster working; it does not prove it.

## Quoting numbers honestly in proposals

1. Say what the number counts: "1,240 conversations", not "1,240 users".
2. Give the period and the channel mix, and say it was a pilot with a small, self-selected group.
3. Report the bad news next to the good: not-helpful share, fallbacks, reports raised and how many were resolved.
4. Quote ratings as "of the N answers that were rated", never as satisfaction.
5. Do not write that the assistant "reduced scam losses" or "improved understanding" from these numbers. Say what you did measure and that learning is being assessed separately.
6. Round, and never quote a count under 5 for a single channel or day.
7. State the date you read the numbers, and keep a copy of the screen or the CSV you quoted.
8. Costs are hosted-model spend only; say so, and add node electricity and hardware if you quote total cost.
9. Never include text from the Queue.

## Where this lives in the code

`apps/api/src/pilot` (queries, rules), `apps/api/src/routes/pilot.ts` (routes), `apps/api/public/pilot` (the page and its QR encoder), migration `db/migrations/015_pilot_console.sql`. The same queries power `pnpm --filter @afribit/api pilot:report`, which prints them in a terminal.

### Routes

| Route | Role |
|---|---|
| `GET /pilot`, `/pilot/app.js`, `/pilot/qr.js`, `/pilot/style.css` | public files (the page asks for a login) |
| `GET /api/v1/pilot/stats?days=7&source=&pack=` | reviewer or admin |
| `GET /api/v1/pilot/queue?state=open\|resolved&limit=` | reviewer or admin |
| `POST /api/v1/pilot/queue/:feedbackId/resolve` | reviewer or admin |
| `GET /api/v1/pilot/export.csv?days=30` | admin |
| `GET /api/v1/admin/users?q=&limit=&offset=` | admin |
| `PUT /api/v1/admin/users/:id/role` | admin |

Roles are checked against the database on every call, so demoting someone locks them out of these routes immediately, not when their login expires.
