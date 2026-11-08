# Personal memory and reviewed sharing

This is a local implementation for the Mesh proof, dated 26 October 2026. It has not been deployed.
Install migration **022** after 020/021 with the matching API and web build. No new service or model
subscription is required. Back up the database and stop the previous API while applying this coordinated
release; do not start an older API against these new privacy expectations.

## A member's flow

Sign in through the learner account panel and open **Personal memory**. Memory starts off. Enabling it
permits explicitly saved notes, not automatic extraction from conversations. Save up to 20 notes, each
500 characters. You can edit, disable or erase them. These notes belong to this account and selected
community; even a reviewer has no API override to inspect someone else's private notes.

Each note starts local-only. The separate remote checkbox permits that note in the configured remote
model's answer prompt. It grants no training or publication rights. The UI explains that explicitly saved
notes persist independently of chat retention, including `CHAT_RETENTION=none`. Guests have no account
memory. New privacy controls use English in all locales pending community translation review.

Local-only notes enter prompts only with `INFERENCE_MODE=node` and a configured loopback/container model
endpoint. Hybrid, cloud and remote node endpoints omit these notes. Every answering attempt checks the
restriction, including fallback. Local providers reject HTTP redirects. Once a conversation has used a
local-only note, its stored `personal_local_context` flag keeps all subsequent answering attempts local,
even if the note is deleted or memory disabled, because an earlier answer could quote it. Start a new
conversation for remote answers. Endpoint configuration and the local host remain trusted: this is not
attestation, root protection or proof a local operator cannot proxy requests.

Only the final answering stage receives selected notes. Search rewriting, retrieval embeddings, the
chef and gap labelling receive no saved memory. Existing user-entered questions and approved cards still
follow the deployment's inference/embedding configuration; this feature does not make those paths private.
F-023 places notes inside the final user message, labeled as untrusted personal context, rather than
creating consecutive user turns. This preserves stricter model chat templates without elevating notes
to system instructions. [Combined API proof](community-harness-proof.md) covers owner/pack isolation,
concurrent histories, deletion and remote exclusions with synthetic canaries.
F-017 now lets a member explicitly strengthen a conversation's processing policy before any of those
calls. See the [processing guide](processing-policy.md) for inherited restrictions and direct card answers.

## Share one snapshot deliberately

Save any edits first. Tick the explicit review consent under the selected note and submit it. Reviewers
receive exactly that saved snapshot. Other private notes and later edits are not visible in the queue.
Sharing permits review and, after approval, community use through its configured AI services. It does not
permit model training or cross-community distribution.

Reviewers sign in through the learner account panel with their reviewer/admin account and open **Review
community snapshots**. Check facts, relevance and permission to publish. Submitters cannot decide their
own snapshots. The first approval waits; a different current reviewer is required to publish. If the
first approver loses their role or private-community membership, the next approval replaces that stale
vote and a second valid reviewer is still required. Rejection ends the review; corrected content needs
a new owner-submitted snapshot. This two-reviewer flow is separate from planned 4-of-7 infrastructure
administration.

Approved snapshots produce cards restricted by `community_pack_id`, in addition to retrieval domain.
Two communities using the same domain therefore cannot retrieve each other's promoted cards. Existing
shared pack cards retain their existing domain behavior. Generated snapshot cards are excluded from
ordinary editable knowledge workflows; edit the private source and submit a new copy for corrections.
Publication creates a lexical-search card/chunk without calling an embedding service. Generic embedding
backfill excludes these snapshots; adding a scoped indexing worker with withdrawal coordination is later
work. Ordinary shared pack cards keep their existing indexing behavior. Portable pack export and the
existing dataset-generation campaign also exclude these snapshots; publication is not export/training
consent.

## Erasure, backups and remaining limits

Deleting a private note withdraws its unapproved copies. Approved copies remain independent until the
owner explicitly withdraws them. Withdrawal clears the submitted text, deprecates and empties its card,
and removes chunks, cascading embeddings and stored card versions in one transaction. Historic answers,
running requests, independently saved copies and backups cannot be recalled by deleting the source.
Account deletion always removes private notes/settings. Its existing keep/delete-contributions choice
also governs approved snapshots; unapproved copies are cleared either way.

Account thumbs-down reports and safety flags expose no stored question/answer text in the pilot review
queue unless the account owner explicitly attaches it. Counts, flags and identifiers remain available.
This does not change the existing guest feedback behavior or grant confidentiality against the host.

Use the project's encrypted **14-day backup rotation** before a real pilot. A deployment must maintain an
erasure journal outside restorable snapshots and replay account/note/withdrawal deletions while the
restored service is isolated, before reopening it. This change implements live database erasure; it does
not implement or validate that backup journal/restore automation. Do not promise permanent erasure or
mark P2's backup/restore exit check complete until an operator performs and records that drill.

The proof still needs private-document/team ACLs, broader routing/egress evidence and a representative
community deployment. Do not use hospital, pupil or other real sensitive records in the rental showcase.

## Reproduce the checks

`pnpm test` includes PostgreSQL memory/promotion cases, actual synthetic chat prompt construction,
gateway fallback/redirect rejection and browser request identity-switch checks. `pnpm typecheck` and
`pnpm build` validate the matching clients and migration consumers. The browser fixture and manual
journey are in `output/playwright/f011-synthetic-fixture.js` and `f011-browser-check.js`; the fixture uses
synthetic API replies, while backend authorization/publication are exercised separately against PGlite.
No paid provider or rental is involved in these checks.
