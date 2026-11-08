# Running community member node on Wi-Fi - 28 October 2026

**Real app/API browser journey passed; fresh synthetic node left active for the iPhone. Physical
phone sign-in/chat and uplink loss are awaiting user observation.** This advances P5's local account/
retrieval side without new paid inference. [F-033](../../features/F-033-running-member-lan-node.md)
was specified before implementation. [Try the running node](../../guides/running-member-lan-node.md).

Two fictional member-only communities/four actual password accounts, isolated in-memory PGlite,
real auth/membership/notes/history/chat routes and built learner app. SQL lexical retrieval returns
actual approved local cards. Every request uses reviewed-only scope; no LLM provider, GPU, generated
fixture answer, training or production database. No F-032 language candidate activated.

## New trials and failures

| Trial | Result |
|---|---|
| [2301fc64](../../../output/trials/2301fc64-3cf0-49c8-b2ee-f453521a3a04.json) | Initial API suite failed its static-route expectation: unauthenticated unknown API requests correctly received401 before route resolution. Test corrected to authenticate when testing404; earlier authorization tests remain separate |
| [73cf51b5](../../../output/trials/73cf51b5-5807-44c9-9aee-8e9d612a7a9f.json) | Corrected API suite9/9, owned cleanup/process-state restoration |
| [92ab44d3](../../../output/trials/92ab44d3-10ab-40ab-a4fe-b05fe173c24e.json) | Initial full-suite node9/9 |
| [e71d7c1a](../../../output/trials/e71d7c1a-ba07-46e6-82bd-6d231900c04f.json) | Final-source full-suite node9/9 |
| [4954df44](../../../output/trials/4954df44-a5ff-41bc-8cea-81704e9afdab.json) | First live node, subsequently cancelled after browser failure. Owned process force-stopped, process/port absence later confirmed; no graceful metrics export. Synthetic ephemeral DB discarded |
| [15f09a41](../../../output/trials/15f09a41-5119-4a14-b602-67c85d56f403.json) | First browser run failed: plain LAN HTTP lacks Crypto.randomUUID; app crashed before sign-in. Browser closed, failure retained |
| [30cc60fc](../../../output/trials/30cc60fc-d70a-42ac-8688-1c5b8855d48d.json) | First owned-stop observer could not confirm absence immediately; retained needs-attention |
| [df0a3213](../../../output/trials/df0a3213-a129-4ef9-b67b-7d2938f3f3a0.json) | Follow-up scoped observer confirmed obsolete process and4189 listener absent, resolving previous attention. Original lifecycle journal now cancelled, never marked a successful app run |
| [9d3e8706](../../../output/trials/9d3e8706-0714-4cc4-99cc-39eb00173eba.json) | Corrected QA node: browser exercised A2/B2. Local stop-marker path then gracefully closed app/DB, exported metrics and completed lifecycle journal |
| [f26f03f6](../../../output/trials/f26f03f6-0856-4581-bce5-af5a920d23ea.json) | Actual built-app browser journey completed at390x844: password sign-in, two communities' approved answers, A2 note creation, sign-out, B2 memory isolation, final sign-out, zero console errors, browser closed |
| [6d154bab](../../../output/trials/6d154bab-40b1-4591-b559-10a77a2c3700.json) | Initial cleanup-handoff verifier failed an incorrect note-count expectation9. It had already closed QA node cleanly; actual4 seeded notes plus1 new note equals5 |
| [83ef688b](../../../output/trials/83ef688b-63c2-4945-a235-a9ecc09fa6f0.json) | Corrected final handoff verifies5 notes, actual source labels, zero model/egress, closed QA journal and unreachable QA listener; freezes logs/web hashes and45 related trial entries |
| [c9293b08](../../../output/trials/c9293b08-90cb-4c07-989a-5e797777f6c9.json) | Fresh phone node **active**, new credentials/ephemeral DB, observed Wi-Fi bind only. Expires23:38:35 Nairobi. Deliberately left running; not a completed physical test |
| [0c70b211](../../../output/trials/0c70b211-c2e8-447e-8d60-c63f6a1dab41.json) | Fresh readiness observer completed: actual app200, both public access endpoints200/members-only, current source match. No phone or model call |

An early typecheck found a possibly undefined network-interface entry; changed to an explicit guard,
then final typecheck/build passed. The first immediate metadata read raced startup readiness; retry
read the ready file without restarting or creating an extra service. Both diagnostic results remain
in local command logs; neither was a provider/model call. A private stop marker was added for future
graceful Windows background-process shutdown; no network-accessible stop/admin endpoint.

## Observed behavior

Nine API checks cover real hashed-password sign-in, wrong password/closed registration, normal
generate requests forced to reviewed-card answers, membership/owner refusal including known IDs,
parallel account-note transactions, reviewed-only streaming, owner history/read/delete, static-file
allowlist/refusals, zero model/egress, single-instance guard and owned app/DB cleanup restoring pool,
environment, registry and fetch. Test static assets are minimal fixtures; the actual built UI is
verified separately in the browser. The PGlite adapter serializes all queries and explicit connection
leases so parallel writes cannot interleave another account's transaction.

Actual browser QA at the Wi-Fi origin signed in A2 and received Tuesday14:00-16:00/free; added a
fictional A2 note; signed out; signed in B2 and received Friday09:00-11:00/KSh50. B2 showed its own
seeded note, with no A2 seed or new note. Its fresh chat view did not show A2's conversation. Each
answer read **Approved card: no AI generation**. Source text, not a model, provided the answer.
The UI's generic generate selector remains present, but the test banner states all model calls are
disabled and the backend enforces that policy. No unapproved style candidate is substituted.

QA shutdown exported2 sessions,4 messages,5 notes,2 assistant `reviewed-card` sources,4 retrieval
queries, **0 model calls and0 denied egress attempts**. Export includes counts/source metadata only,
no passwords, note/chat text or token headers. Browser command artifacts redact the generated
passwords; test data in snapshots is fictional. Browser/session closed and QA listener confirmed
unreachable before a fresh phone node was created. The fresh node has new credentials and no QA data.

## Plain-HTTP startup correction

The existing app used direct Crypto.randomUUID at chat/history/installation-ID call sites. On this
LAN HTTP browser it was unavailable and crashed the app. A shared `randomId` helper now uses the
native method when present or cryptographic getRandomValues UUIDv4 bytes otherwise. It never uses
Math.random and refuses missing/failing cryptographic randomness. Version/variant bits and receiver
binding are covered by5 tests. This follows the [Web Crypto API](https://w3c.github.io/webcrypto/#Crypto-method-randomUUID)
interface distinction; it does not add transport encryption, trusted HTTPS or PWA capability.

No hook/data-fetch flow changed. The React checklist was applied to the two touched TSX components;
only imports and ID generation were changed. The installed Playwright CLI/browser were reused in
CLI mode; no Playwright test file, package install, browser security override or public tunnel.
Screenshots/snapshots and console evidence remain in
[the completed browser artifact directory](../../../output/playwright/f26f03f6-0856-4581-bce5-af5a920d23ea).

## Verification, source and resource state

Final `pnpm test`, `pnpm typecheck`, `pnpm build` exited0. API node9/9, language preflight13/13,
review tool6/6, existing community9/integrated28/showcase19/rental17/worker13/store15/telemetry12/
HTTPS7/gate14 and standing API checks pass. Web now82/82, including5 new random-ID checks.
An initial full root run also passed before the browser fix; the final full run covers the fix.

[Frozen handoff](../../../output/member-lan-handoff/83ef688b-63c2-4945-a235-a9ecc09fa6f0/summary.json)
lists all45 related records, including both root suites, their expected negative CLI children,
failed browser/API checks and superseded attention observations. No record was removed. Final
logs and failed typecheck log are copied with hashes. Readiness/current-phone records are subsequent
entries linked above. The handoff's own initial failed count-check record remains preserved too.

Uncommitted base `965d4c3f13747679391ecd2e1bd362acb4940f2d`, API/config/shared source hash
`025d37a412ab03a0ea39cbea5f85796882e14586351505e7912f0feedb51fad1`.
This fingerprint excludes web files; separate hashes cover the5 changed web source/test files and
actual build manifest. Build offline-shell version `d28a0b9c93d0`; no service-worker acceptance claim.
All earlier paid-run source fingerprints remain historical, not qualifications for this source.

Current phone node is bound to192.168.100.192:4189, expires23:38:35 Nairobi28 October, and keeps its
lifecycle journal active until stop/expiry. Its private account file is linked only in the operator
guide, never served over HTTP. No firewall/router/default-route/Tailscale changes or admin account.
Ephemeral data disappears at shutdown; real learner/patient/student information is outside this test.
Plain LAN HTTP is not suitable for claiming confidentiality from a network observer or host admin.

Asked Edmund to perform A1 sign-in and the schedule question on iPhone; awaiting that observation.
Physical uplink-loss/reconnection, actual local LLM, rented heavy generation, approved language
improvement, hardware economics,4-of-7 governance and TEE remain separate. Internet remains enabled.
No new rental/model download/training/paid call. Existing reported bills/reservations unchanged:
$9.995020 held/allocated in original$10 including untouched$2 held aside, $.004980 unallocated.
