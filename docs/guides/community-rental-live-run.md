# Prepare the community-to-rental live run

**Acceptance preparation, 28 October:** [F-031](../evaluation/trials/2026-10-28-review-and-network-acceptance.md)
extends the offline rehearsal to28 checks with actual loopback member HTTP/socket loss/recovery and
future metadata export. Review copies and a deferred physical LAN kit are ready; zero human/phone
results. The real run's later reported bill is $.043415188789367676, invoice unconfirmed. No new rental.

**Live follow-up completed, 28 October:** [the actual run](../evaluation/trials/2026-10-28-community-live-rental.md)
now has4/4 complete real normal-API answers at context8192, verified model files, scoped egress checks
and confirmed termination/absence. A smaller$.24/ten-minute session fit the existing$.244984 unallocated
allowance; no$1.50 session or refund was needed. Aggregate held/allocated is now$9.995020, $.004980
unallocated. New billing pending; human review and per-request latency export remain separate work.
The preparation/budget statements below retain their earlier context. Do not rerun closed reservations.

**28 October 2026:** the integrated rehearsal passes **27 checks**. It uses normal chat HTTP routes,
real authentication/membership/SQL retrieval/account memory/history, the native Ollama adapter and
the actual rental-worker gate. The model behind that gate is simulated. No GPU or external model
was used. [Every trial and failure](../evaluation/trials/2026-10-28-community-rental-preparation.md).

The proposition being tested is: community knowledge and accounts stay in the local application;
only authorized, remote-permitted context goes to replaceable shared compute; local cards remain
available on failure. A local LLM, physical Mesh, hardware affordability and protection from the GPU
host are separate qualification steps.

## Reproduce preparation

From the repository root:

```powershell
pnpm --filter @afribit/api showcase:community-rental
```

This runs F-023's nine checks, then 18 integration checks. It is also `test:community-rental` in the
root test suite. `--live`/`--execute` are not CLI options; adding them fails validation. Existing
`showcase:community --hosted` retains its exhausted historical OpenRouter ledger and must not be
used to bypass the current experiment allocation.

Each invocation owns a new PGlite database, applies current migrations with vector types substituted,
and seeds two fictional communities/four accounts. It never connects the configured application
database. Embeddings, query rewriting, gap classifiers and other auxiliary model calls are disabled.
All temporary HTTP listeners bind loopback. Logical `.invalid` HTTPS endpoint identities map to
loopback fixtures only inside the rehearsal, preserving the application's remote privacy classification.
This mapping is not a real TLS test. Fixtures, app/database, scoped profiles, fetch/pool adapters and
environment changes are cleaned up/restored at exit.

The [latest passing rehearsal](../../output/community-harness/8080da16-b72e-47a7-8434-f780960801b7/summary.json)
records 15 synthetic logical boundary requests and 18 model-backend fixture calls, including four
additional calls through the controller hook. A bad key reaches the gate but not its backend, so the
two counts have different meanings. Four requests overlapped in the fixture; this is scheduling
evidence, not GPU capacity or latency evidence. All inference was simulated and paid spend was $0.

## What must pass

| Path | Required observation |
|---|---|
| Four concurrent members | Only own enabled memory/history and own community's approved knowledge reach the gate |
| Reviewed-only/local-only | Actual local SQL retrieval and approved text; zero remote dispatch |
| Foreign account/community IDs | Backend refusal before inference; no reliance on hiding controls |
| Remote-note revocation/deletion | Subsequent fresh request omits that note; no personal notes appear in shared knowledge |
| Approved-record update | Next actual retrieval/prompt contains changed facts with the same model; no training operation |
| Endpoint switch | Same local data/accounts remain, only approved remote endpoint/key changes |
| Outage/bad credentials/quota | Reviewed local fallback; no alternate provider/privacy route |
| Assembled context overflow | Refusal before transport/reservation, including memory and history in the estimate |
| Incomplete answer | Non-streaming: reviewed fallback. Streaming after a prefix: explicit interruption, persisted `stream_interrupted` |
| Processing label | Native adapter on a remote endpoint says `answeredBy: outside`; reviewed cards remain local |
| Lease/worker changes | No live dispatch with stale/unverified state, wrong context/digest, attention flag or lost supervisor |

The approved-record change is a controlled update to an already-approved synthetic database row.
It does not demonstrate the complete publication-governance UI. F-016's explicit sharing/review and
withdrawal tests remain separate. During fixture setup, remote notes deliberately revoked/deleted
by negative tests are restored only in this self-created synthetic database for the frozen live
subset; no real user's consent or data is changed.

## The prepared live subset

The bounded live executor is `runCommunityLiveSubset` in
`apps/api/src/showcase/communityLiveSubset.ts`, invoked after rehearsal via the exported
`runCommunityHarness(trial, false, true, connector)`. Importing the harness does not run its CLI.
Use one harness per process: its temporary database/fetch/environment adapters are operator tooling.

The live subset makes **at most four generation attempts**, sequentially, one fictional member at
a time. Each asks for a small learning-visit plan using that community's approved schedule/prices
and the member's explicitly permitted synthetic preference. This proves integrated context handling,
not heavy-reasoning quality or production workload capacity.

Freeze **Gemma `gemma4:e4b-it-q4_K_M`**, manifest
`sha256:dc35e8d9c6061baa6f0fa870975ab6932e2542b579b13ea0f199fa4bb7300c9c`, existing compact pack,
context **8192**, max output **300**, temperature **0**, thinking disabled. Native-context validation
runs after the API assembles knowledge, history and memory. The UTF-8/framing estimate remains
conservative rather than exact tokenization; collect actual token counts and any incomplete answers
in the live result. A model answer withheld by safety checks is not a live success.

The live connector carries the exact proxy endpoint, bearer **in memory only**, model/digest,
source hash, unique persistent four-attempt ledger, cumulative external allowances including the
already-admitted rental, frozen lease fingerprint, controller cancellation signal and a
`readLeaseAndWorker()` callback. The hook neither provisions nor deletes a Pod and has no account key.

The callback belongs to the existing independently supervised rental controller. It must read the
owned lease's current watchdog state and fresh authenticated `/trial-status` using a captured bounded
control transport, not the inference-intercepted global fetch. Return:

```typescript
{
  supervisorAlive: watchdogExit === null,
  identityVerified: state.identityVerified,
  needsAttention: state.needsAttention,
  leaseFingerprint: state.fingerprint,
  observedAt: new Date(state.maximumObservedAt).toISOString(),
  deadlineAt: lease.deadlineAt,
  worker: freshAuthenticatedWorkerStatus
}
```

Do not stamp a stale heartbeat as freshly observed or renew `deadlineAt`. The executor compares the
fingerprint with the frozen connector, rejects a changed deadline, and requires observations within
15 seconds. At least **165 seconds** must remain: one bounded 45-second generation plus 120-second
shutdown grace. It rechecks before dispatch and combines the request signal with the controller's
cancellation signal. Every attempted request reserves its allowance; a failed attempt is not refunded.

Worker evidence must show armed/ready, the exact model/digest, verified 6,583,656,505 bytes, the
expected current verifier/snapshot hashes, verified Node archive, actual running context8192,
runtime full-GPU allocation ratio and nonempty telemetry with no observed failure. Readiness data is
a declaration from the ordinary trusted host, not TEE attestation or proof against that host.

The worker now accepts an explicit `contextWindowTokens: 8192`; omission still selects4096.
It sets both warmup/runtime context and refuses readiness if running context differs. Thirteen worker
fixtures cover this, but no real8192 GPU placement has been measured yet. Preserve the pinned image
and all model pins; do not silently enlarge context or change models to make the live test pass.

## Launch handoff and budget

The [frozen preparation pack](../../output/live-preparation/3198fb16-fa84-4d20-8a36-53d1d60b77d6/live-handoff.json)
links the passing rehearsal/source hash, exact settings, source/helper hashes, four questions and
open live gates. Its worker preview compiles as Python without executing setup. The placeholder
key hash and preview lease/timestamps are not usable launch credentials or a live admission. Generate
fresh values only in the funded controller.

Preparation is repeatable after a new passing rehearsal:

```powershell
pnpm --filter @afribit/api exec tsx ../../output/community-live-preparation.mts REHEARSAL-UUID
```

The preparer refuses a failed/older-source rehearsal, builds the context8192 bundle, checks installer
syntax and writes a new UUID pack. It makes zero account/model/network calls and never rents.

Before launch, record a reviewed cumulative rental allocation and fresh quote, then create one
disposable pinned worker under the standing absolute lease/supervisor. Arm only after identity is
verified; connect the hook only after fresh worker readiness passes. Always export evidence, signal
completion and require accepted termination plus absence. The inference hook cannot replace that
controller lifecycle or survive loss of the entire supervising computer. Use the
[rental runbook](rented-model-worker.md) for those established boundaries, without reusing its closed
session reservations or historical full/4096 comparison recipe.

Current conservative allocations are **$9.755016 of the original $10**, including the untouched $2
held aside; **$0.244984 unallocated**. The four prior model rentals have reported charges of about
$0.124184, but the invoice is not final. A new $1.50 allocation does not fit those retained allowances.
No automatic refund/reset occurs: the next live session needs an explicit reconciled allocation
decision. No Pod or paid model was started during this preparation.

After the four live answers, retain raw synthetic traces/results, actual token/latency/memory/cost
evidence and cleanup. Then obtain native human review before model qualification. A browser/member
device on real LAN with its own mobile data disabled, uplink removal/recovery, a running local model
on affordable hardware, private-document ACLs and TEE protection are still separate tests.
