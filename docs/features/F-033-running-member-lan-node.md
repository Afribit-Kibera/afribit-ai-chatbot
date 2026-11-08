# F-033 - Running synthetic member node on the existing LAN

**6 November update:** [isolated member-network phone test](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md)
confirms sign-in/local card, existing-note edit/refresh, A1/A2 display separation and clear no-card
response. Node closed14:03 Nairobi;0 model/egress attempts. Computer retained separate Wi-Fi;
whole-box WAN loss, remote recovery and PWA remain untested. November credentials are archived.

**Status:** Built, browser/API verified; A1 sign-in/local answer confirmed on iPhone29 October;
cross-community and same-community A1/A2 phone display separation also confirmed; physical uplink-loss pending.
29 October closure: outage deferred at Edmund's request to keep household internet running;
[partial checkpoint and cleanup](../evaluation/trials/2026-10-29-outage-deferred-session-close.md)
saved, temporary node closed. No future date/reminder set.
**Date:** 28 October 2026. **Roadmap:** Mesh proof P5.

The iPhone opened a static review page, but no running community chat node has been exposed for it.
Prepare a temporary node on the existing Wi-Fi using the real built learner app and existing API
routes. Use two fictional member-only communities/four learner accounts, actual password sign-in,
scoped notes/history and lexical SQL retrieval in isolated in-memory PGlite. Never connect the
configured application database, load model weights, call an external provider or change networking.

All chat requests are forced through existing reviewed-only processing scope. Return actual approved
local cards, with the existing per-answer source labels and a prominent synthetic/reviewed-only
banner. No generated/fixture LLM output is offered. No inference provider is configured, compute
admission stays enforced and fetch egress is refused. Existing production app and language candidate
remain unchanged. Registration is closed, no admin account, no remote GPU or uploads exposed.

Serve only a preloaded allowlist of built app/static assets; never arbitrary filesystem paths, keys,
operator artifacts or source maps. Bind only the observed Wi-Fi IP and use an absolute two-hour
expiry. Private generated demo credentials stay in a local operator file, never server responses or
logs. Synthetic inputs only, plain LAN HTTP, no actual user privacy/confidentiality/PWA claim.

Serialize the PGlite pool adapter including explicit transaction leases so simultaneous note writes
cannot share transactions. Refuse multiple instances in one process. Export counts/source metadata
without chat/note text on shutdown, close listener/database and restore scoped process state. Journal
the active service separately from completed test observations. A still-running service is not a pass.

Acceptance: real login/invalid login, member/owner checks, distinct card retrieval, zero inference and
egress on normal/streaming requests, parallel account notes, history/refusal/deletion, no private static
paths and owned cleanup. Verify the actual built app in a browser via Playwright CLI, then leave a
fresh bounded service for the user's iPhone. Actual phone sign-in/chat and uplink loss remain pending
until explicitly observed. Document every invocation/failure; full tests/typecheck/build required.

Browser reproduction found a plain-HTTP LAN crash from direct Crypto.randomUUID calls. Add a shared
UI-ID helper that uses native randomUUID or cryptographic getRandomValues UUIDv4; never Math.random.
Cover native receiver, fresh bytes, version/variant masks and missing/failing secure randomness.
Use it at all existing browser ID call sites. This does not add TLS or grant PWA capabilities.

Delivered: [phone guide](../guides/running-member-lan-node.md) and
[all trials/failures/resource states](../evaluation/trials/2026-10-28-running-member-lan-node.md).
API9/9, browser real-app flow complete,5 UUID fallback tests and full tests/typecheck/build pass.
No model call; fresh bounded node left for the requested iPhone observation.
