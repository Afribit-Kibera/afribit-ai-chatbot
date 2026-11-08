# Learner accounts and community access

F-015 is built and tested locally, not deployed. It builds on F-014 conversation ownership. No rented GPU,
model download or external identity provider is required for enrollment or authorization.

## Deployment

Deploy migrations **020 and 021** with the matching API and web build. Follow the normal database backup
and release procedure. `pnpm db:migrate` applies migrations to the configured database; the local automated
checks use a separate embedded PostgreSQL instance and do not migrate a running node.

Communities remain public unless a current administrator explicitly enables members-only access. Existing
users are not automatically enrolled and community invitations do not promote anyone to a contributor or
reviewer. Configure members-only access before installing private knowledge: previously public content,
including copies and cached responses, cannot be made secret by changing a setting.

## Operator workflow

Send these requests to the node's API over its protected connection. Every administrative request needs
`Authorization: Bearer <administrator-token>` and `x-pack: <community-id>`. The server checks the current
database role, so an old administrator token stops working after demotion.

1. `PUT /api/v1/admin/community/access` with `{ "membersOnly": true }` enables membership enforcement.
   The administrator is not automatically given membership or permission to read personal conversations.
2. `POST /api/v1/admin/community/invitations` returns a code once. It is valid for seven days, for this
   community only and for a single redemption. Only its hash is stored. Deliver it directly to the intended
   member; do not put it in URLs or public logs.
3. New members open the learner account panel, choose **Create learner account**, and supply the code,
   email and password. The account gets the `learner` role and is enrolled atomically. Existing account
   holders sign in, then use **Join this community** with their code. Their global role stays unchanged.
4. Check `GET /api/v1/community/access` under the member's own sign-in. It reports the selected community,
   whether membership is required and whether that person is enrolled. It exposes no private knowledge.
5. Revoke membership with `DELETE /api/v1/admin/community/members/<user-id>`. Revoke an unused invitation
   with `DELETE /api/v1/admin/community/invitations/<invitation-id>`. Both actions are community-scoped.

Members lose access on subsequent protected requests after revocation, including with an otherwise valid
JWT. Already-running work and information previously obtained are not recalled. Owner-authorized deletion
and account erasure remain available after revocation. An administrator may explicitly restore enrollment
by issuing a new code. These are current bootstrap powers; 4-of-7 approval is a later milestone.

## Learner browser and shared devices

Learner sign-in is separate from contributor sign-in. The learner token stays in sessionStorage for the
current browser tab. Account history and drafts are held in memory, separated by account/API/community;
they are cleared on identity changes and are never written as account chat text to localStorage. The
server retains conversations according to its existing retention setting; `GET /api/v1/me/conversations`
lists only the signed-in person's conversations in the selected community.

Guest chat on a public community retains the existing device-local history. It does not silently migrate
into an account, and guest capabilities never accompany account chat requests. An explicitly selected
community (`?pack=<id>` on entry) stays selected during in-app navigation. Names/branding/languages remain
public; members-only pack descriptions, starter examples and knowledge counts are omitted from discovery.

Sign out before handing over a shared device. This design does not protect an unlocked browser profile,
developer tools, compromised page scripts or the community host administrator. Account text is unavailable
after an offline page reload until the server can be reached again. `CHAT_RETENTION=none` therefore cannot
offer persistent account chat history: the browser does not secretly add a disk copy to compensate.

Language/level choices in an account workspace currently reset with that workspace; persistent account
preferences and explicit long-term memory are separate follow-up work. Password reset, email verification
and automatic invitation delivery are not implemented. Operator-assisted account recovery needs a defined
identity-verification process before a real deployment.

## What has been checked

`pnpm test` includes PostgreSQL route/store tests for invitation scope, expiry, replay, atomic registration,
role boundaries, live-JWT revocation, private-content gating, cross-pack routing and owned history. Browser
unit tests cover separate history/drafts, credential selection and late sign-in/fallback responses. A real
browser check with synthetic API responses exercised A sign-in/chat/draft, sign-out and B sign-in; A's text
was absent from B's workspace and browser localStorage. This is not a live-model or TEE evaluation.
