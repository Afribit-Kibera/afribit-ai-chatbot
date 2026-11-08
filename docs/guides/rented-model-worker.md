# Run a bounded authenticated rental-model trial

**Latest live preparation:** the [integrated runbook](community-rental-live-run.md) prepares the
normal community API path and bounded live hook. The worker now accepts explicit context8192 and
requires matching loaded context before readiness; omitted context remains4096. Worker fixtures
now13/13, integrated checks27/27, all offline. This does not reopen any of the closed rentals below.

**28 October follow-up:** the [context guide](showcase-context-headroom.md) documents the next
offline recipe and changed incomplete-answer semantics. The historic controller below retains
its context4096/full-prompt recipe and closed reservations; do not rerun it to test the new recipe.
RunPod reports $0.124184007 total for the four model sessions, including $0.040801143 for the successful
one. These are reported bucketed charges, not a final invoice or refunded allowance. See
[the new observations](../evaluation/trials/2026-10-28-context-headroom.md).

The operator controller in `output/rented-model-session.mts` connects the existing GPU gate, frozen
model-byte verifier, NVIDIA sampler, synthetic comparison runner and standing rental watchdog.
It is a reviewed showcase tool, not a deployed community service. See
[every trial and actual results](../evaluation/trials/2026-10-27-rented-model-worker.md).

**Observed result, 27 October:** 16/16 transport requests on a rented RTX 4090, exact model-file
verification, authenticated gate and confirmed termination/absence. Four outputs filled the
4096-token context and ended early; this recipe is held from learner use. Median full response
1.244 seconds at concurrency one, 3.671 seconds at four, with fixed run order/cache limitations.
All four attempts are documented. Actual rental bills remain pending; no further rental was started.

## Configuration and cost

This session uses the existing `gemma4:e4b-it-q4_K_M` candidate and pinned Ollama image from
[the frozen artifact snapshot](../evaluation/rental-artifacts-2026-10-27.json). It admits one secure
RTX 4090 in EU-RO-1 only after a fresh empty-account check and an available quote at most $1/hour.
It allows 25 minutes from admission, including startup, download, verification and inference, with
120 seconds of shutdown grace. Each model session reserves $1.50, including a fixed $0.50
non-compute allowance. These are conservative local allocations, not a provider-enforced invoice cap.

The original $10 experiment retains $1.505 prior request allowances, $0.25 canary allowance,
$1.50 first-model allowance and $2 held aside. Four distinct model-session allocations now total $6:
**$9.755 held/allocated, $0.245 unallocated**, before 16 additional microdollars of dispatch reservations.
Failed runs do not refund reservations. Billing that
has not appeared is unknown, not zero. Do not reuse/delete reservation files to admit another rental.

## Preview and execute

Credentials stay in the existing local `.env`. Never paste them into a command or report. From the
repository root, an offline preview builds and hashes the explicit worker bundle without account,
model or GPU calls:

```powershell
pnpm --filter @afribit/api exec tsx ../../output/rented-model-session.mts --followup-4
```

The admitted fourth-session command was:

```powershell
pnpm --filter @afribit/api exec tsx ../../output/rented-model-session.mts --execute --followup-4
```

This is a record of that bounded execution, not an instruction to repeat it. The controller refuses
an existing reservation. No further $1.50 rental fits the remaining allocation; do not consume the $2
held aside or silently reset allowances. A new spending decision would be needed for another paid run.
It never retries a create POST;
uncertain creation is reconciled by exact UUID name, creation time and disposable-storage identity.

## What runs where

The controller sends the pinned image a small explicit source bundle, public artifact metadata and a
fresh test-key hash. Only the rental downloads model weights and the size/checksum-pinned Node archive.
Python/libstdc++ packages come from the image's signed Ubuntu repositories; observed versions are
recorded, but this is not a reproducible custom image. No custom image is published or model trained.

Both plans and all prepared contexts validate offline before any account request. Remote route policy
is `unrestricted`; the provider's actual EU-RO-1 placement is separate metadata. Each attempt adds a
one-microdollar dispatch reservation; the actual hourly rental allocation remains in external charges.

The raw test bearer stays in controller memory. Account RunPod/OpenRouter credentials never enter the
Pod payload. Ollama binds to loopback; only the authenticated gate port is exposed through the HTTPS
proxy. Model allowlisting, request bounds and diagnostic field selection apply. Every endpoint,
including diagnostics and completion, requires authentication. Only synthetic/public-approved material
is used. This ordinary rental trusts its host; it provides no TEE attestation or host-blind processing.

After an independent local supervisor verifies Pod identity, the controller arms the worker once.
The worker pulls, binds the local test tag to the exact frozen manifest, verifies every referenced
file, warms up, checks matching running digest/full GPU placement and requires real telemetry before
becoming ready. Any failed check blocks generation. See [model integrity](rental-model-integrity.md).

Arm recovery is bounded to the same worker. Selected proxy responses trigger an authenticated status
read; its explicit armed flag prevents repeating a successful arm. Only confirmed awaiting-arm state
permits another attempt, at most three total. Auth failures, failed workers and supervisor loss refuse
retries. No arm retry creates a Pod or extends the absolute lease.

The comparison is four synthetic questions, bare and supplied-context, at concurrency one then four:
eight calls in each run plus one separate warmup. The same model bytes, context 4096, temperature zero
and maximum 300 output tokens apply. This measures the synthetic comparison transport, not actual
database retrieval/account-memory integration or E-002's community-written blind language evaluation.
The existing [combined API proof](community-harness-proof.md) measures that different integration path.

## Shutdown and records

The separate hidden local watchdog must be armed before model work. Completion/failure exports
sanitized worker diagnostics and requests inner stop, then signals the external supervisor to
terminate and confirm absence. A controller backup reconciles the exact owned Pod if necessary.
The worker's own absolute-deadline stop uses its vendor-provided Pod credential; this inner stop has
not been qualified and leaves storage billing. It cannot replace external termination.

Both controller and watchdog run on the same computer. Separate processes protect against an
inference-process failure, not total computer or network loss. Never call a trial complete from a
stopped state or accepted DELETE alone. Check confirmed absence and any attention state, then retain
provider billing separately. The [watchdog guide](rental-watchdog.md) explains deletion boundaries.

Each invocation writes its UUID journal under `output/trials` and artifacts under
`output/rented-model/<UUID>`. Model attempts, failures, timings, exact pins, helper hashes, lease and
cleanup are retained. These are local operator artifacts and need review before publication.
The billing observer accepts that parent UUID and never rents or generates:

```powershell
pnpm --filter @afribit/api exec tsx ../../output/rental-session-billing.mts PARENT-TRIAL-UUID
```

Targeted checks: `test:trial-persistence` (4), `test:rental` (17), `test:rental-worker` (13),
`test:ollama-store` (15) in `@afribit/api`. The first three are included in the root suite alongside
the store verifier. Fixture passes are separate from real rented-host observations.
