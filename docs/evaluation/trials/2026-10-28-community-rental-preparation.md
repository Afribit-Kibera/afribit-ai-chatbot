# Integrated community-rental preparation - 28 October 2026

**Outcome:** **27/27 integrated offline checks**, actual normal API/DB/worker gate/native transport;
model and readiness/GPU declarations simulated. Bounded live controller hook and context8192 worker
bundle prepared, full tests/typecheck/build pass. **Zero real model/GPU/account calls or new spend.**
No Pod, deployment, training, tokenizer/model download or production migration.

This joins F-023's API retrieval/account proof to F-027's authenticated rental serving interface and
F-028's context guard. It prepares the live proposition test; it does not turn fixture responses into
model-quality or confidentiality evidence. [Operator guide](../../guides/community-rental-live-run.md),
[F-029 specification](../../features/F-029-community-rental-rehearsal.md).

## Every trial

| Trial | Actual result |
|---|---|
| [b8f8c622](../../../output/trials/b8f8c622-6b02-4944-8c2b-0d40c11534be.json) | First integrated API/worker/gate rehearsal23/23, all fixtures closed |
| [f48d60cb](../../../output/trials/f48d60cb-3880-4c60-af94-cf4c789b52ef.json) | Expanded25/25, adds four-request controller hook and lost-supervisor refusal |
| [421e3d58](../../../output/trials/421e3d58-cd73-4b8a-97e6-12025c8aebff.json) | Failed new streaming assertion: test incorrectly expected a reviewed fallback after emitted text; original API correctly reports interruption. Failed record/checks retained, all fixtures closed |
| [4b20d3d1](../../../output/trials/4b20d3d1-e333-4585-9543-3de6cbe0fcf9.json) | Corrected26/26: stream interruption/persisted flag checked; async context-scope isolation added |
| [848d32ff](../../../output/trials/848d32ff-7b9e-4706-8e62-9dc023e6fac7.json) | First root-run original community suite9/9 |
| [54a09c0e](../../../output/trials/54a09c0e-e780-4f5e-ad44-83513704809b.json) | First root-run integrated suite26/26, including corrected remote processing labels |
| [d17ffdb2](../../../output/trials/d17ffdb2-21f9-4294-9fe6-c2971fc8ea81.json) | First root-run worker13/13, explicit8192/matching placement checks |
| [1a881e48](../../../output/trials/1a881e48-2623-4760-9786-c821aee87d54.json) | Expanded27/27: stale/mismatched/unverified worker/lease negative evidence checks |
| [b0e09e12](../../../output/trials/b0e09e12-358d-4666-b313-64577a653bae.json) | Final root-run original community suite9/9 |
| [791bb8aa](../../../output/trials/791bb8aa-e3ed-479f-964d-8f7c7dcd8982.json) | Final integrated suite27/27, no unexpected client egress; all owned resources closed |
| [c69e8f5d](../../../output/trials/c69e8f5d-bdf4-49f9-89c6-02b073cd1339.json) | Final worker13/13, same application source hash |
| [971f23b0](../../../output/trials/971f23b0-9da5-4043-a3d4-bbce56f47e5d.json) | Static live-handoff preparation from the final passing rehearsal, source agreement, context8192 bootstrap AST valid; setup not executed, zero network |
| [8080da16](../../../output/trials/8080da16-b72e-47a7-8434-f780960801b7.json) | Final targeted27/27 after rejecting malformed telemetry counts/status and non-boolean supervisor declarations; prior fixture source unchanged otherwise |
| [3198fb16](../../../output/trials/3198fb16-fa84-4d20-8a36-53d1d60b77d6.json) | Final preparation pack rebuilt from8080da16 with final source agreement, context8192 bundle syntax valid; no setup/network/model calls |

Commands: `pnpm --filter @afribit/api test:community-rental`, both full `pnpm test` runs, workspace
`pnpm typecheck`, `pnpm build`, and the handoff-preparation command in the guide. Final full suite
includes27 integrated +9 original community,19 showcase,17 rental,13 worker,15 store,12 telemetry,
7 HTTPS,14 gate and77 web checks alongside standing API/database/privacy tests. No browser layout
change was made. All normal suite UUIDs/negative CLI invocations remain under `output/trials`.

The full suite passed at source `1127006ac0a12b05c8439474d4effcf7a00b799d8c7c52abce864e04ca15cd1a`.
Final readiness-declaration type tightening was then revalidated by27 targeted checks, workspace
typecheck and build. Final source hash **`248261beb303c6fbecc21dc6fd8164e9c1f60cd9d26a23b8d7e64fa5a0d77ca3`**,
uncommitted base `965d4c3f13747679391ecd2e1bd362acb4940f2d`. Worker source SHA-256
`b08e414794af19c618cf7e82086b3adbe992308719eb0b2d72516f556a7ffd86` is separate from that API hash.
The [preparation pack](../../../output/live-preparation/3198fb16-fa84-4d20-8a36-53d1d60b77d6/live-handoff.json)
and `worker-preview.json` retain source/helper/runtime pins and compiled-installer identity. Original
paid-session artifacts, model pins, closed reservations and earlier failures are unchanged.

## What the integrated rehearsal actually did

PGlite applied current migrations with pgvector substituted, seeded two fictional member-only packs,
four authenticated accounts, approved/draft knowledge, local-only/remote-permitted notes and scoped
history. The normal Fastify chat/memory routes and real lexical retrieval were used. Two logical
remote HTTPS identities mapped to owned loopback HTTP instances of the actual rental-worker gate;
their native Ollama backend was a small simulated server. This deliberately preserves remote
classification while not claiming real TLS, a model runtime or GPU telemetry.

On final source: **15 logical remote request traces**, **18 backend fixture calls**, including four
additional requests through the reusable live hook, **four overlapping fixture requests**, zero
unexpected client egress. A bad bearer reaches the gate but not the backend. The gate did not
forward its bearer. These counts include deliberate failures and are not completed real-model calls
or a speed/capacity benchmark. [Final summary](../../../output/community-harness/8080da16-b72e-47a7-8434-f780960801b7/summary.json).

The new checks show own-community retrieval IDs and own permitted notes at the boundary, rejection
of known foreign session IDs, approved cards with zero inference, local-only zero remote egress,
note revocation/deletion, controlled approved-record updates, endpoint replacement with unchanged
local database, outages/invalid keys/attempt exhaustion, context overflow before reservation, native
streaming and context-contract isolation. Synthetic private notes never entered shared knowledge.
This does not replace F-016's publication-governance workflow or validate arbitrary private documents.

The existing provider named `local` can serve a remote native endpoint. Per-answer classification
previously used only that provider name and said local. Chat responses/stream completions now pass
the configured endpoint to location classification: a remote/private-IP endpoint is outside; actual
loopback/community-container inference stays local. Reviewed answers remain local. Standing privacy
tests and normal API integration assert this. No historical location is inferred retrospectively.

## Context and incomplete-generation correction

The conservative UTF-8/framing estimator was moved into the shared prompt layer, with a compatibility
re-export for the existing showcase. An explicit AsyncLocalStorage native-context contract now
protects fully assembled normal API prompts, including memory/history, before transport/reservation.
Mismatched transport/context and oversize input refuse; request/profile output is300. The operator
scope requires complete native responses. Other deployments outside that scope keep existing behavior.
This is not exact model tokenization, a production rollout or an automatic prompt/context change.

Non-streaming length finishes fall back to reviewed text. After a stream has emitted text, the
existing API reports an error/interrupted turn and persists `stream_interrupted`; it does not append
a different answer silently. The failed test expected that different behavior, was corrected, and
retained as a failure. The final synthetic stream evidence is kept separately. Incomplete text is
not considered a complete live model answer.

## Prepared live contract

`runCommunityHarness(trial,false,true,connector)` runs the offline proof first, then optionally the
bounded native live subset. Importing the module does not start a CLI. The default CLI never supplies
a live connector. The reusable hook was exercised with the simulated backend, exactly four generation
requests, fresh supervisor/readiness checks before dispatch, separate persistent ledger and source hash.

The connector requires the frozen source/lease fingerprint, endpoint, memory-only bearer, exact model
digest, cumulative admitted costs, cancellation signal and controller callback. Qualification refuses
stale worker/heartbeat state, attention/supervisor loss, changed deadline/fingerprint, unverified model
bytes/helper/snapshot, context4096 in place of8192, CPU fallback allocation or missing/failing telemetry.
At least165 seconds remain per dispatch (45 request +120 shutdown); a callback does not renew the lease.
Its job is to read the real owned supervisor/worker, not return the simulated fixture declarations.

The worker accepts explicit8192, still defaults4096, and checks the running context alongside digest
and allocation before ready. This is13 fixture checks, **not a real8192 model/GPU run**. The normal
proof still has no local LLM. The four live questions are fixed in the handoff; factual/language review,
hardware memory/latency and heavy reasoning remain unqualified until actually measured.

## Cost, cleanup and remaining live gates

Every trial in this preparation had **$0 paid spend**; no RunPod/OpenRouter account was contacted.
Model/worker-readiness declarations were simulated. All owned loopback workers/backend, app/database
and adapters closed/restored; no production data was read or changed. No new runtime dependency,
global install, weights, training, image publication, deployment or migration.

The earlier reported four model-rental costs total $0.12418400717433542; combined known reported
canary/hosted/model charges are $0.1349052486670181, final invoice unconfirmed. This pass did not
reconcile those reports again or refund allocations. **$9.755016 remains held/allocated**, including
untouched$2 held aside, **$.244984 unallocated**. A new$1.50 rental is not admitted by this preparation.

Before a real run: record a reconciled allocation/fresh quote, create an owned disposable worker with
the context8192 bundle, arm the separate supervisor, qualify fresh model/worker evidence, then attach
the tested hook. Export synthetic outputs/measurements and require termination plus confirmed absence.
The current connection, actual provider availability, GPU fit, complete answers and independent
supervision must pass on that session; this offline result cannot substitute for them. Whole-host
failure, Mesh/device access, private-document ACLs, native human language review and TEE protection
remain separate milestones. P4 is in progress; no claim of full private/cheaper community service yet.
