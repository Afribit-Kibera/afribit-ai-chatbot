# F-029 - Integrated community-to-rental rehearsal

**Status:** Built and rehearsed offline; bounded live follow-up demonstrated in F-030. **Date:** 28 October 2026. **Roadmap:** Mesh proof P3-P4, prepares P5.

F-031 adds an actual loopback HTTP/socket recovery check: current rehearsal28/28, with future
measurement export. Historical F-029/F-030 runs had27. See the
[follow-up report](../evaluation/trials/2026-10-28-review-and-network-acceptance.md); physical Mesh and
native-speaker acceptance remain pending.

The account/retrieval API proof and rented model proof ran separately. Prepare the same normal API
flow for the authenticated rental worker, using synthetic communities/accounts and a simulated model
behind the actual worker/gate. No paid inference, rental or private data in this preparation step.

Reuse F-023's isolated PGlite database, migrations, account JWTs, memberships, memory/history and SQL
retrieval. Add a distinct rehearsal entry point that first runs its standing nine checks, then drives
compact prompts through the native Ollama adapter and the existing rental-worker authentication/gate.
Logical remote HTTPS identities map only to owned loopback fixtures; privacy code must still treat
them as remote. Never classify a loopback stand-in as genuinely local community compute.

Apply F-028 headroom to the fully assembled normal-API request using an explicit async-scoped native
context contract. Refuse mismatches/overflow before compute reservation/transport; flag length finishes
as failures that cause the normal reviewed fallback. Keep normal deployments outside that operator
scope unchanged. Record synthetic boundary traces without bearer/account keys, context arithmetic,
retrieval IDs, normal API results, request counts and cleanup. Fixtures are not real model answers.

Check four concurrent members, history, known foreign IDs, remote-memory permission and deletion,
local-only/reviewed-only zero egress, provider outage, revoked credentials, attempt allowance, context
overflow, truncated generation, approved-record update without training, and endpoint switch without
moving the local database. Updates to an already-approved fixture record are not a full governance
publication demonstration; F-016 retains that separate proof. Real private-document/vector ACLs,
Mesh performance, native language review, hardware fit and TEE protection remain out of scope.

Prepare a frozen live handoff manifest with model/source pins, context8192/output300, synthetic
scenarios and explicit missing gates. Support the rental worker's explicit context8192 configuration
and require matching running context before readiness. Do not change default worker context4096,
publish an image, start a Pod, reset held reservations or execute the live subset in this pass.

Acceptance: offline integrated rehearsal passes with actual API/DB/worker/gate/native adapter;
failure paths have no forbidden egress or implicit provider/privacy fallback; all owned fixtures close;
the live handoff identifies exact code/settings and the independent supervisor/budget checks still
needed. Every preview, failed assertion and final suite has its own durable trial record.

**Actual result:**27/27 checks, including the four-request live-controller hook exercised against
the simulated backend. Full tests, typecheck and build pass; worker suite13/13; context8192 installer
preview statically parses. Zero real inference/GPU/account calls/new spend. All owned resources closed.
One streaming assertion failure is retained: after a prefix, the API reports interruption rather than
swapping answers. Remote native-model response labels now use endpoint location, not adapter name.
The reusable live hook checks fresh lease/worker declarations, byte/helper/snapshot/digest/context,
telemetry, immutable deadline/fingerprint and cancellation before dispatch. These are operator checks,
not attestation. [Runbook](../guides/community-rental-live-run.md) and
[all trials/limits](../evaluation/trials/2026-10-28-community-rental-preparation.md).
