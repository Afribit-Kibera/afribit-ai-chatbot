# Data Stewardship

What data the program holds, who owns it, how long it is kept, and what it may be used for. **Status: proposed policy plus an honest account of what the software does today.** It is reviewed with the community's reviewers, and with legal advice on Kenya's Data Protection Act, before the pilot. **We do not claim legal compliance until that review is done.**

## Principles

**Local implementation update, not deployed (26 October, F-017):** members may restrict a conversation
to local processing before any rewriting, embedding or generation. That restriction persists through
later history and background work. Approved-cards-only answers use no model and no embeddings. Source
labels distinguish direct approved text from generated and outage answers. These controls grant no
training permission and do not establish hardware confidentiality. [Guide](../guides/processing-policy.md).

1. **Collect the least.** If we do not need it, we do not keep it.
2. **Consent for each purpose.** Using a conversation or a contribution for something other than what the person agreed to needs new consent.
3. **The AI does not train itself on conversations.** There is no online learning. What everyone hears changes only through review; the model changes only in tested releases ([ADR 0015](../adr/0015-how-the-assistant-learns.md)).
4. **Training is a separate, opt-in decision** by the people whose language it is.
5. **Open outputs, private where it matters.** Evaluation sets and public model adapters built from consented data are released openly, with their limits stated. An adapter trained on data a community did not consent to publish stays on that community's own node, because model weights can leak what they were trained on.
6. **Leaders see aggregates, not people.** A community's leaders and administrators see counts and trends. In the new account flow, reporting or automatic flagging does not disclose stored chat text; a member must explicitly attach it for review. The host still controls the underlying database.

## Data classes

| Data | Examples | Owner / licence | Default handling |
|---|---|---|---|
| **Knowledge** | Bitcoin cards, communication chapters | Afribit Africa and contributors; CC BY-SA 4.0 | Public. Changes only through review. |
| **Language corpus** | Phrases, glossary, contributed examples | Contributors and the community; CC BY-SA 4.0 for approved items | Every row records source, whether it is synthetic, whether a human reviewed it, and three separate permissions: retrieval, evaluation, training. **All default to "no".** |
| **Accounts** | Email, hashed password, role | The person | Needed only for contributors and admins. Chat needs no account. |
| **Conversations** | Questions and answers | The person | See below. |
| **Operational** | Health, errors, aggregate counts, channel labels | Program | No message content. |

## Conversations — what the software does today

**F-015 update (26 October, local tests only):** learners may have an account without contribution rights.
Membership and invitations are scoped to a community; policy can require enrollment for AI and knowledge
access. Account chat text/drafts stay in browser memory and are cleared on identity changes, while server
retention remains configured separately. The learner token uses sessionStorage; people sharing a live
browser profile must still sign out. Public guest history remains device-local and separate. Persistent
personal memory is not yet implemented. [Membership guide](../guides/community-membership.md).

**26 October local implementation:** [F-014](../features/F-014-private-conversation-access.md) restricts
conversation reads, continuation, feedback, linked suggestions and deletion to the verified account owner
or a separate guest token. New guest tokens expire after 30 days and only their hashes are stored on the
server. The learner browser stores the raw token locally, separately from conversation IDs. Older ownerless
conversations have no token and cannot be claimed by ID. This is not deployed; migration 020 and a coordinated
client/API release are required. It does not add personal memory, private-community enrollment, or protection
against a host administrator. Shared-browser guest history is still shared-device data.

Be precise about the gap between policy and code:

- **Retention is a setting, and the app tells people what it is** ([F-002](../features/F-002-privacy-settings.md), built 8 October 2026):
  - `CHAT_RETENTION=none` — no message text is written on the server; the conversation lives only in the person's browser, which sends the last few turns with each question. The pilot node uses this.
  - `CHAT_RETENTION=30d` — text is emptied after 30 days by an hourly job. The default for the cloud demo and Afribit Local.
  - `keep` — kept until deleted.
  - Only metadata (time, language, token counts, card ids, safety flag) stays, so aggregate counts work.
- **People delete their own data:** a conversation, or all of this phone's conversations, at once from the app; a contributor's account (keeping their contributions without their name, or deleting them). Deleted data can remain in encrypted backups for up to **14 days**.
- **Reports:** when no chats are stored, a learner may attach the question and answer to a report. That text is cleared 30 days after the report is resolved.
- **Accounts come only from a verified sign-in**, never from what a request claims.
- Messages that contain a detected secret are replaced before storage and never sent to a model; a secret in the browser's recent turns is dropped before it reaches a model. Prompt logging is off by default.
- No individual conversation is used for any purpose beyond serving the answer unless the person opts in.
- In `cloud` mode, questions pass through a hosted model provider. In `hybrid` mode they do so when the node fails. `node` mode keeps them on the network. Which mode a deployment runs is always stated to its users.

## Learning features and their data (planned, ADR 0015 and ADR 0017)

| Feature | What is kept | Consent | Who sees it |
|---|---|---|---|
| **"Say it your way"** (built 8 Oct 2026, F-003) | The member's rewrite, the answer it rewrites, and their question if they leave "include my question" ticked. Deleting the conversation clears the shared text; the suggestion stays | The member chooses, per suggestion, whether it may be used for answers (ticked by default), testing and training (never by default). An approved suggestion's `allowed_for_*` flags are that choice AND the reviewer's approval | Reviewers (pilot console, Suggestions tab) |
| **Gap list** (built 8 Oct 2026, F-004) | Per unanswered question: a short general topic label (written by the waiter model, checked for names, numbers and secrets), the day, the language mode, the nearest card and a rounded score. **No question text; no link to a conversation, message or user.** Shown only at 5 or more per topic | None needed: aggregate only. On the public service the labeller is one more hosted model call (zero-data-retention routing); `GAP_LABELS=off` avoids it | Reviewers, administrators |
| **Learner memory** (built/tested locally 26 Oct 2026, F-011; not deployed) | Up to 20 explicitly saved short notes per account/community; no automatic extraction; independent of chat retention | Off by default; local-only by default; per-note remote permission; inspect/edit/delete | Owner and final answering model under that permission; local infrastructure operator remains trusted |
| **Reviewed memory snapshot** (built/tested locally 26 Oct 2026, F-016; not deployed) | Only the immutable copy explicitly submitted; approved cards restricted to that community; generic embedding jobs exclude these cards | Separate review/publication consent; two distinct current reviewers; owner may withdraw; no training permission | Reviewers see submitted copies; approved cards reach community retrieval and its configured AI services |
| **"Ask anything" mode** | The same as any conversation under the node's retention setting; never added to knowledge, never used for training | Off unless the community switches it on | As for any conversation |

## Afribit Local: who holds what (ADR 0016)

On Afribit Local the community's data — accounts, conversations (if kept), knowledge, language, backups — lives on the community's own box. Each question, with its retrieved cards and recent history, crosses an encrypted tunnel to Afribit's GPU server in Kenya, is answered, and is not stored there: no prompt or answer logging, nothing written to disk. That makes Afribit a **data processor** for the community, so each community signs a data processing agreement before it starts. Learners are told plainly where their questions are answered. Rented GPUs outside Kenya are used only for benchmarks, never for learners' questions.

## Channel labels (`source`)

A learner link can carry a label, for example `https://ai.afribit.africa/app?ref=kibera-hub`. The app keeps the label in the browser and sends it as `source` when a conversation starts, so the program can see which places and groups bring learners in.

**What `source` is:** a short lowercase label (letters, digits, hyphens, at most 32 characters) chosen by Afribit for a place, group or poster. It is stored once on the conversation record, when the conversation is created, and never changed. It appears in aggregate counts and, next to a reported answer, in the reviewers' queue.

**What `source` is not:** it is not a user ID, a device ID, a name, a phone number or a location, and nothing else about the learner is collected to go with it. It is the same for everyone who opens the same link, so it cannot tell two learners apart. Labels must never contain personal information; the app and the server ignore anything that is not a valid label, and the database refuses it.

**Limits:** a very small channel can still make its few learners guessable to someone who knows who attended an event. For that reason the shareable daily export blanks every count under 5 and drops rows left empty, and Afribit does not publish per-channel figures for groups that small. The live console, which only reviewers and administrators can open, shows exact counts.

## The pilot console and who can see what

The [pilot console](../guides/pilot-console-guide.md) is for reviewers and administrators. Aggregate numbers contain no message text. Question and answer text is visible **only** in its queue of reported, not-helpful and flagged answers, only to reviewers and administrators, and is never included in any export. Resolving a report is recorded in the audit log with who did it. Which cards the assistant was given for each answer is recorded (card identifiers only) so a reviewer can see why an answer came out as it did.

## Use for training

- Nothing in the corpus is cleared for training today: every row has `allowed_for_training = false`.
- Before any training use, the community's reviewers agree a written policy covering: which data, for what model, who can see the result, how a person withdraws, and how the resulting model and data are released.
- Conversations are never used for training without individual opt-in. Contributed phrases are used only if the contributor agreed to that specific use.

## Retention and deletion

- Aggregate counts: kept.
- Accounts: kept until the person asks to leave; then deleted, with contributions either deleted or, if they were published under CC BY-SA, retained without the person's name at their choice.
- Backups are encrypted and rotated.

## Sharing

- We do not sell data. We do not share individual conversations.
- Published datasets contain only content that was approved and consented for publication, with no personal identifiers.

## Open items

- Legal review against Kenya's Data Protection Act, 2019, including whether and how the program and each node must register, Afribit's role as a processor on Afribit Local, a data processing agreement template, and the Data Commissioner's cross-border transfer guidance for the `cloud` and `hybrid` modes.
- A plain-language privacy notice in English, Kiswahili and Sheng, reviewed by community members.
- The training-consent policy and its approval by reviewers.
- ~~Implementation of the no-storage / short-retention and deletion settings.~~ Built 8 October 2026 (F-002); live since API release 20261008133325.
