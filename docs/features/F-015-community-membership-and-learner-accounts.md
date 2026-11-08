# F-015 — Learner accounts and community membership

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P1 · **Date:** 26 October 2026.

## Problem and result

F-014 enforces conversation ownership. Learners now need their own account workspace and communities need
an enforceable enrollment boundary. Joining a community must not grant contributor, reviewer or admin powers.

Add a `learner` account role, scoped single-use community invitations, revocable memberships and an opt-in
members-only policy per pack. Public communities keep guest chat. Existing contributor invitations remain
separate. An existing account can join through the same scoped community code; a new account is created
as a learner. No existing account receives automatic membership or role promotion.

## Data and API

Migration 021 adds community policies, memberships and hashed community invitations. The public community
identity/language/branding metadata remains discoverable. Private starters, descriptions and knowledge
counts are omitted from the public pack response when membership is required. Previously published public
content cannot be made secret retrospectively; enable the policy before installing sensitive knowledge.

- `GET /api/v1/community/access`: own membership state and public access policy, no private content.
- `POST /api/v1/member/register`: code, email and password; atomic learner creation, enrollment and consumption.
- `POST /api/v1/community/join`: signed-in account redeems a code for the selected pack.
- `PUT /api/v1/admin/community/access`: a current database administrator sets the pack's members-only policy.
- `POST /api/v1/admin/community/invitations`: a current administrator creates a scoped, expiring code.
- `DELETE /api/v1/admin/community/invitations/:id`: revoke an unused code in the selected community.
- `DELETE /api/v1/admin/community/members/:userId`: revoke membership with an audit entry.
- `GET /api/v1/me/conversations`: owner-only, pack-scoped conversation listing for the account workspace.

Protected API routes check membership on each request. Internal chat setup also checks it, including
implicit continuation into another pack. Revocation stops subsequent requests, not already-running work
or copies already obtained by the member. Account deletion and owner-authorized erasure remain possible
after revocation. Administrative enrollment operations are bootstrap powers, explicitly outside 4-of-7
governance until P6; they do not grant access to personal conversations.

## Browser behavior

Learner sign-in is explicit and separate from contributor sign-in. Chat uses the learner bearer token;
guest tokens never accompany account requests. Account conversations and drafts stay in memory locally,
and server history is loaded under verified ownership. Guest browser history stays separate. Identity
changes unmount/abort the old chat and reject late updates from its workspace. Account sign-out clears
in-memory account history/drafts; no account chat text is persisted to localStorage. The sign-in token
uses sessionStorage, so members must still sign out on a shared browser profile. This is not protection
against a person with access to the same live browser, XSS or the community host administrator.

## Acceptance

- Wrong-community, expired, revoked and reused codes cannot enroll or create an account; failure rolls back.
- A new member has the learner role and cannot call contribution, reviewer or administrator operations.
- A revoked member's existing JWT/guest token cannot read knowledge, chat, continue, stream or cross-route
  into the members-only pack. Public guest operation remains available. Denied calls never reach a model.
- Another member's conversations remain inaccessible, even within the same community.
- Private metadata is not cached as public content; no private responses are cached by the browser worker.
- Account A, B and guest history/drafts are separate; sign-out clears account text, including late results.
- Database/injection tests cover real SQL, registration/login, membership policy and role restrictions;
  browser tests cover credentials and identity transitions. Run the full repository checks.

## Limits / dependencies

Depends on F-014 and migrations 020/021. This introduces no private-document/team ACLs, long-term personal
memory, hosted model changes, paid compute, training or confidential-processing claims. Password reset,
email verification and invitation delivery remain operator-assisted, as with existing account operations.

The [operator guide](../guides/community-membership.md) records the deployment and enrollment sequence.
