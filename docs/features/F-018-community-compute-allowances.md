# F-018 — Community compute routes, allowances and bounded requests

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P3 · **Date:** 26 October 2026.

The API enables compute admission before serving requests. A community with no enabled policy can use
approved-card answers but cannot dispatch model/embedding work. Each attempt matches an exact provider,
effective model, normalized endpoint, request kind, context/output bounds and a permitted regional route.
Policies are changed by current administrators, with version checks and audit metadata; quorum approval
is future P6 work. The policy cannot override F-017's local-only restrictions.

Migration 024 adds versioned policies, UTC daily usage buckets and per-attempt reservations. Admission
atomically reserves a configured maximum allowance and an attempt slot, including for direct provider
calls, auxiliary stages and fallbacks. Concurrent workers share the PostgreSQL cap. Failed/timed-out,
cancelled and successful work all keep the full reservation. Re-enabling/editing policy does not reset
daily consumption. Stale or unavailable policy storage fails closed before dispatch. A reported cost above
the reservation disables future dispatch and records an overrun. Missing costs never release allowance.

This is a conservative application dispatch allowance, not a vendor invoice guarantee. Regional routing,
tokenization, price/fee contracts and upstream enforcement remain provider/operator dependencies. The
operator must confirm a billing bound, maintain an upstream account limit, and separately cap/stop hourly
rentals. The proposed USD 10 first showcase is not automatically configured or spent by this feature.

OpenRouter chat policies pin upstreams, disable implicit upstream failover, require parameters/ZDR and
send prompt/completion price ceilings. EU/US policy requires the corresponding documented regional base
URL; this checks the requested route, not physical residency or attestation. Remote local-provider routes
have no verified geography and can only be marked unrestricted. HTTPS is required for remote endpoints;
credentials/query strings are forbidden in configured URLs. Hosted embeddings remain disabled under
enforcement until a separately verified pinning/pricing adapter exists; local embeddings are supported.

Hard bounds: 8,000 UTF-8 bytes per question, 128 KiB per provider context envelope, 64 chat messages and
4,096 output tokens. Routes may be stricter. Oversized context is refused, not silently truncated. A
generation denial follows existing approved-card fallback. Deadlines now cancel provider transports and
bound streaming duration; a stream cannot start a fallback after already yielding output.

API: current-admin `GET/PUT /api/v1/admin/community/compute`, selected-pack scope, no-store. PUT requires
`expectedVersion`, explicit `enabled` and a valid complete policy. There is no learner budget-reset or
refund endpoint. Reservations contain route/bounds/status/cost metadata, never prompts or credentials.

Acceptance exercises real PostgreSQL policies/reservations plus localhost provider transports: default
denial, admin/pack/version boundaries, malformed routes, direct/stream/embedding checks, quote fields,
concurrency, UTC reset, failed/denied fallbacks, cancellation, timeouts, partial streams, overruns and
private-text exclusion. No rental, production change or real model call is part of this slice. Trusted
CLI evaluation tools do not automatically install API admission and remain a P4 integration gate.
