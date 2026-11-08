# F-023 — Combined community context and routing proof

**Status:** Built; local acceptance 9/9, hosted acceptance partial · **Roadmap:** Mesh proof P1–P4 · **Date:** 27 October 2026.
Continues Edmund's authorized implementation and $10 showcase envelope. Every invocation is recorded.

The first hosted comparison supplied passages directly. It did not prove that the ordinary application
selects the right community knowledge or keeps account memories separate. Add a repeatable synthetic
CLI that exercises the real HTTP routes, membership/ownership checks, SQL retrieval, prompt construction,
provider gateway, output processing and message persistence together.

Use a fresh in-memory PGlite database with current migrations, never the configured application database.
Seed two fictional member-only communities, two members each, approved and unapproved knowledge,
distinct reviewed language hints and private account canaries. Local inference is a loopback HTTP
fixture; it is not a running language model. Verify actual retrieved entry IDs and captured synthetic
request bodies, including concurrent requests, unauthorized IDs and local-only failure handling.

The default command performs no external requests. An explicit hosted mode may run a small fixed
synthetic subset through a quoted, explicitly pinned Gemma route (currently Parasail). Keep embeddings local/off,
disable auxiliary model calls, enforce the existing compute ledger and fixed price/output ceilings,
carry forward prior allowances, and reject unexpected hosts or private canaries before egress.
Hosted results must distinguish technical completion, answer inspection and native-speaker review.

Acceptance: pack membership is enforced; SQL retrieval excludes another community and unapproved
entries; each local prompt includes only its owner's enabled memory; same-account memory in another
pack does not leak; parallel scopes/history stay separate; known foreign session IDs are refused;
reviewed-only uses zero inference; local-only failure never calls a remote provider; configured remote
requests exclude local-only notes and other owners' notes; a deleted note disappears from later prompts.
Retain trial UUID, revision/configuration identity, checks, timings and cost evidence. Bound all requests
and restore environment, fetch/pool adapters and registry; close owned database/app/HTTP resources.

No production migration, deployment, model switch, download, fine-tuning, private-document ACL, real
Mesh/pgvector performance, clinical workflow, GPU rental or TEE claim is included. PGlite uses lexical
retrieval and substitutes vector column types; record that limitation. Community language guidance
can be measured later with held-out speakers; fixture assertions cannot establish language quality.

**Evidence:** [actual report](../evaluation/trials/2026-10-27-community-harness.md),
[operator guide](../guides/community-harness-proof.md). Final local source passes all nine checks;
the four-member hosted probe produced three model answers and one reviewed fallback after HTTP 429.
Generated clock/daypart wording remains incorrect/conflicting. Human language review and stable hosted
capacity remain open. Full tests, workspace typecheck and build pass; no deployment.
