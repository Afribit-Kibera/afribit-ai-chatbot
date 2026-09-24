# Security Audit — 2026-09-23

Delegated review: `/security-review` (a general-purpose sub-agent given the
full diff of everything ahead of `origin/master` — 4 local commits, plus
this session's uncommitted work — and instructed to find only
high-confidence, newly-exploitable issues, explicitly excluding DOS,
on-disk secrets, and rate-limiting concerns).

Note on scope: the agent reviewed the full local-ahead-of-origin diff, not
just this session's own changes, so the findings below are in code
committed in an earlier session (the push-notifications feature), not
code written today. Fixed anyway, since the ask was "audit and fix," not
"audit only what I personally touched."

## Result: 2 real findings, both fixed same day

### Vuln 1 (Medium) — unauthenticated push-notification trigger to arbitrary installations

**Where:** `apps/api/src/routes/chat.ts`, `apps/api/src/chat/chatService.ts`,
`apps/api/src/notifications/pushService.ts`.

**Finding:** `POST /api/v1/chat` and `/api/v1/chat/stream` accepted a
client-supplied `notifyInstallationId` and passed it straight to
`sendPushToInstallation()` with no check that the caller controls that
installation. `installationId` is a non-secret `crypto.randomUUID()`
generated and stored client-side (`apps/web/src/lib/pwa.ts`,
`localStorage`) — nothing about it proves ownership. Anyone who learned or
guessed another user's installation ID could make the server push a
notification to that victim's device on demand, by including it in their
own chat request.

**Fix:** replaced the trigger credential entirely. `db/migrations/008_notification_token.sql`
adds `notification_subscriptions.notify_token`, a server-generated random
secret (`gen_random_bytes(24)`, unique). `PUT /api/v1/notifications/subscription`
now returns this token only to the client that just proved it controls
that exact push endpoint by registering it; the web client stores it
separately from `installationId` (`apps/web/src/lib/pwa.ts`'s
`getNotifyToken()`). `chatService.ts`'s `SendMessageInput.notifyToken` and
`pushService.ts`'s `sendPushByToken()` now require this token, not the
installation ID — an attacker who knows a victim's `installationId` has no
way to derive their `notify_token`. Old field names
(`notifyInstallationId`, `sendPushToInstallation`) were renamed throughout
the stack rather than kept as a parallel insecure path.

Verified: full workspace typecheck clean (`pnpm typecheck`), migration
applied and confirmed live (`notify_token` column + unique index present),
no remaining references to the old function/field name anywhere in
`apps/api/src` or `apps/web/src`.

### Vuln 2 (Low) — unverified `x-afribit-user-id` header

**Where:** `apps/api/src/routes/notifications.ts` (`getExternalUserId`).

**Finding:** `PUT /api/v1/notifications/subscription` reads an
`x-afribit-user-id` header and links the subscription to a `users` row
keyed on it, with no verification the caller is actually that identity.
Any caller can claim any `external_auth_id`.

**Fix:** not a code change — this is already the exact limitation the
README documents as deliberate for the current anonymous-installation
phase ("push subscriptions are tied to an anonymous installation id...
bind them to authenticated users before using notifications for sensitive
account events"), and nothing in the codebase currently reads this
linkage for anything sensitive. Added a loud in-code warning at the
function itself (`routes/notifications.ts`) so a future change that *does*
start relying on it for something sensitive has to consciously override
an explicit comment, not just miss an implicit gap. Real auth is the
actual fix; that's a bigger, separate piece of work, not something to
improvise here.

## What the audit explicitly ruled out

SQL injection (every new/modified query in this diff — `budget.ts`,
`critique.ts`, `judge.ts`, `runCampaign.ts`, `runEval.ts`,
`embedBackfill.ts`, `retrieval.ts`, `retrieveLanguageExamples.ts`,
`seedCommunityManuals.ts`, `promoteCommunityManuals.ts`,
`runCommunicationEval.ts`, `runFallbackBakeoff.ts`, `notifications.ts` —
uses `$1`/`$2` parameterized placeholders, none string-interpolated);
path traversal (`seedCommunityManuals.ts` reads two hardcoded filenames
from a fixed local directory, no user input reaches it); XSS (no
`dangerouslySetInnerHTML`/`innerHTML` introduced; the service worker's
push-payload handler only ever receives data the server itself sent,
using the private VAPID key); hardcoded secrets (none found; the new
embeddings provider reuses the existing `OPENROUTER_API_KEY` handling
pattern in `config/env.ts`).

## Follow-up not done here

Real authentication (session/JWT-backed identity) is the actual fix for
Vuln 2 and for the broader anonymous-installation limitation the README
already tracks. Out of scope for a same-day audit-and-fix pass — this is
product/infrastructure work, not a patch.
