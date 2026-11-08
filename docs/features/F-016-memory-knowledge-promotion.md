# F-016 — Explicit memory-to-community knowledge promotion

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P2 · **Date:** 26 October 2026.

An account owner can submit one selected private note as an immutable snapshot for this community's
reviewers. `consentToReview: true` is required. The queue exposes only submitted copies; it never reads
the private-memory table to display other notes. Review consent does not grant training or network-wide
sharing rights. The member sees the publication status and can withdraw their contribution.

## API and state transitions

- `POST /api/v1/me/memory/items/:id/submit`: owner/pack/version checks, explicit sharing consent.
- `GET /api/v1/me/memory/submissions`: the member's own copies and status.
- `DELETE /api/v1/me/memory/submissions/:id`: withdraw own snapshot; remove future retrieval eligibility.
- `GET /api/v1/community/knowledge-submissions`: current reviewers/admins, selected community only.
- `POST /api/v1/community/knowledge-submissions/:id/decide`: approve/reject immutable snapshot.

First approval leaves the copy pending. A second distinct current reviewer makes it an approved knowledge
card in this community's retrieval domain and explicit pack scope. The submitter cannot approve; an earlier approver whose role or
membership was revoked cannot count toward publication. Neither approver edits the snapshot. Corrections
require a new owner-submitted copy and a new review. Transactions lock the submission to prevent duplicate
publication. Every decision is audited as IDs/status only, without private content in audit logs.
If the earlier approver is no longer eligible, the next approval becomes the new first approval.
Ordinary editable knowledge workflows exclude these generated cards; corrections require resubmission.
Generic pack exports, dataset-generation campaigns and embedding backfill exclude snapshot cards.
They are searchable lexically within the approved pack; scoped semantic indexing is later work.

Deleting a private note withdraws pending copies. An already approved copy is independent: it remains
until explicitly withdrawn or removed by governance. Withdrawal clears the submitted copy, deprecates and
clears its generated knowledge card, and removes derived chunks/embeddings and stored versions. It cannot
recall copies in prior answers, other users' memories or backups. Account deletion respects the existing
keep/delete-contributions choice; private memory always disappears. Training exports are not added.

## Acceptance and limits

No pending/rejected/withdrawn copy is eligible for RAG. Prove user/pack isolation, exact snapshot consent,
self/duplicate/demoted-approver rejection, two approvals, atomic publication, withdrawal and account deletion
using the real SQL. Show that unrelated private notes never appear in the review queue or embeddings.
Reviewers remain accountable for accuracy and permission to publish; two votes are not proof of truth.

Depends on [F-011](F-011-personal-memory.md), F-014/F-015 and migration 022. Private-document/team permissions,
cross-community distribution, autonomous training and 4-of-7 infrastructure administration are separate work.
