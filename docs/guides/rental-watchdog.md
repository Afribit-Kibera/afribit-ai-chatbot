# Documented rental cleanup before a paid showcase

**Latest, 27 October:** a separate [operator lifecycle canary](../evaluation/trials/2026-10-27-runpod-lifecycle-canary.md)
created one disposable Pod, recovered a timed-out creation response, verified ownership/storage,
terminated it and confirmed absence. This did not run/qualify this guide's standing watchdog or its
independent supervision. No model ran; billing remains pending under a retained $0.25 allowance.
Upstream removed the ineffective `--stop-after`/`--terminate-after` flags in CLI v2.12.0; do not use
them as a provider deadline. Normal certificate verification remains enabled; connectivity is intermittent.

**26 October 2026: built/tested with localhost fixtures only. No real account/resource call or spend.**
**27 October:** [read-only lifecycle readiness](../evaluation/trials/2026-10-27-runpod-readiness.md)
attempted real REST/GraphQL reads and hit connection timeouts before HTTP responses. No mutation,
rental or live cleanup conformance test occurred. Earlier successful catalog queries do not establish
current control-plane access. The remaining rental scope and shared-budget accounting are in that report.
The [follow-up diagnostics](../evaluation/trials/2026-10-27-rental-preparation.md) confirm both tested
RunPod IPv4 paths and the documented legacy host time out. No rental was launched. F-024's
[telemetry helper](rented-gpu-telemetry.md) is separately ready for future GPU sampling; it does not
replace this watchdog or invoice reconciliation.

**Access follow-up:** [GraphQL now validated the key/account](../evaluation/trials/2026-10-27-runpod-access-followup.md)
and one verified native HTTPS read reached REST. Access remains intermittent; later reads timed out.
F-025 adds optional `--transport https-tls12` with normal certificate verification and bounded responses.
There is no automatic retry/fallback or proven network fix. Fetch remains the default. Preview it with:

```powershell
pnpm --filter @afribit/api showcase:rental --transport https-tls12
```

For a reviewed real lease, the same explicit option can accompany the execution command below. It does
not waive identity/storage/budget/supervision gates or establish live deletion conformance. The example
is still expired/unfunded and no pod is created by a preview. Seven compatibility fixtures pass via
`pnpm --filter @afribit/api test:runpod-https`, also included in `pnpm test`.
Read the [trial register](../evaluation/trials/README.md): every preview, execution, refusal and test
invocation creates a record under `output/trials`. A dry run costs zero; an unreconciled external bill
stays null. Started/unfinalized records require investigation. These are operator files, not public
reports to publish without review.

## Preview

```powershell
pnpm --filter @afribit/api showcase:rental
```

The default validates [the example lease](../examples/showcase-rental-lease.json) and budget plan without
reading or altering an account. Its ID, name, dates and USD 1/hour arithmetic example are placeholders,
not a price quote. It deliberately reports that this historical example is expired and the default
evaluation plan has no rental allowance. Do not treat a successful preview as permission/readiness to rent.

The adapter follows [RunPod REST v2](https://docs.runpod.io/api-reference-v2/overview), whose current base
is `https://api.runpod.io/v2`; authentication uses a Bearer API key. RunPod's
[migration guide](https://docs.runpod.io/api-reference-v2/migrate-from-v1) says v1 retires on 15 November
2026. These docs were checked on 26 October; no live conformance request was made here.

## Define a disposable lease

Before paid inference, obtain an actual quote and create/review a lease with:

- A unique v4 UUID and exact name `afribit-showcase-<leaseId>`, one explicitly approved Pod ID and the
  provider's exact creation timestamp. Never reuse an unrelated or production Pod.
  Lease timestamps use canonical UTC ISO format with milliseconds, such as `2026-10-26T00:00:00.000Z`.
- An absolute deadline at most one hour after creation; the clock includes startup and model downloads.
  Re-running the watchdog does not grant a new duration. Keep the same immutable state file.
- A conservative hourly ceiling and fixed non-compute allowance, including disk/storage, fees and any
  charges absent from the reported compute rate. `maxRentalMicrousd` must fit the evaluation plan's
  `externalChargesMicrousd`; held-aside and compute reservations still share the original USD 10 envelope.
- Sufficient shutdown grace for bounded requests/retries, and `disposableDataOnly: true`. This authorizes
  deletion of that temporary Pod's local disks. Export needed artifacts before the completion marker.

The adapter uses the documented [GET Pod fields](https://docs.runpod.io/api-reference-v2/pods/get-a-pod)
to compare identity, creation time, lifecycle, current hourly rate, mounts, locks and cluster membership.
It persists only minimal state; environment variables, SSH details and raw response bodies are omitted.
Unknown shapes are refused. Account credentials stay in `RUNPOD_API_KEY`, not leases, commands or records.
Use a suitably scoped key; the tool cannot prove account policy or input provenance from a text reference.

## Execute only after those gates are met

This syntax is available for a reviewed future lease; it has not been run against RunPod in this slice:

```powershell
pnpm --filter @afribit/api showcase:rental --lease D:/path/to/reviewed-lease.json --plan D:/path/to/reviewed-evaluation-plan.json --state D:/path/to/lease-state.json --completed-file D:/path/to/evaluation-complete.marker --execute
```

The CLI requires the explicit state and completion-marker paths and a funded plan with an upstream-limit
reference. It never creates Pods, starts/resumes machines, lists the account or deletes independent
storage. Run it separately from inference on a reliably supervised host. Check its `watchdog-armed`
record and repeated checks before starting inference. This slice does not automatically launch/connect
the evaluator or provision an independent supervisor. The marker must be unique to this lease and absent
initially; a stale marker triggers immediate cleanup. Write it after artifacts are exported, even when
evaluation fails. SIGINT/SIGTERM request cleanup rather than simply exiting; SIGKILL/power loss cannot.

Cleanup starts on completion, cancellation, a stopped/error Pod, a price increase, recording failure,
deadline or projected allowance. The earlier of time and quoted-budget limits is reduced by shutdown
grace. A monotonic clock and persisted maximum observation guard against backward-clock/restart extension.
Transient cleanup errors receive bounded retries; auth/read failures require attention, not a false pass.
Already uncertain lease state stays locked for investigation, with no automatic stale-lock deletion.

Identity and storage are re-read before any mutation. Wrong name/ID/creation time, lock, cluster,
network/global mounts or unknown storage prevent deletion. The watchdog never trades away that boundary
to satisfy its budget. If the resource changed or control plane is unreachable, intervene in the provider
console and reconcile charges. A trusted host administrator can bypass these application controls.

The operation is [DELETE Pod](https://docs.runpod.io/api-reference-v2/pods/terminate-a-pod), not stop:
stopping can leave billable storage. RunPod's [storage documentation](https://docs.runpod.io/pods/storage/types)
distinguishes disposable local disks from network/global volumes that persist independently. This first
workflow rejects independent attachments rather than guessing they were removed or deleting shared data.
A returned 204 is recorded as accepted, followed by a GET. Only absence after verified identity and an
accepted deletion is recorded as confirmed. A first 404, 401/403, stopped state or accepted-but-still-present
resource is not successful cleanup. Resuming a completed lease re-checks absence instead of trusting cache.

## Close the trial honestly

`podAbsenceConfirmed` and `billReconciled` are separate. The latter remains false in this implementation.
Check provider resources/storage and obtain the final incremental bill, including applicable fees.
RunPod exposes [bucketed Pod billing](https://docs.runpod.io/api-reference-v2/billing/get-pod-billing-history);
its time-window rounding means an aggregate is not automatically this experiment's receipt. No billing
API/reconciliation adapter is implemented here. Record the reconciled amount/evidence in the trial
summary without replacing earlier records or interpreting pending charges as zero.

This watchdog depends on its host, network and provider API. An upstream account ceiling and independent
crash recovery/supervision remain required for paid work. The USD 10 envelope is not a provider-guaranteed
invoice cap. It is also not a proof of privacy from RunPod, TEE attestation, real model quality, CPU/GPU
capacity or physical Mesh access.

Local checks: `pnpm --filter @afribit/api test:rental`. The latest aggregate is
[p4-rental-watchdog-proof.json](../../output/proof/p4-rental-watchdog-proof.json); UUID trial files preserve
each earlier suite and negative case. No new database migration or runtime package is required.

## 27 October supervised worker follow-up

The [authenticated worker controller](rented-model-worker.md) launches the standing watchdog in a
separate hidden local process and waits for its verified identity state before arming model startup.
The first model session failed before inference, but its watchdog accepted deletion and confirmed
absence without attention. This establishes that completion path on one real disposable Pod; deadline,
local-host loss and all provider failures are not thereby qualified. Both local processes still depend
on this computer and network. The experimental shared HTTP/2 adapter uses the same strict Pod parser;
production fetch remains the default.

The rental suite now has 17 cases. If monitoring fails after identity was previously verified, cleanup
is attempted only after a fresh successful identity/storage/permission read. Changed identity or an
unreadable resource prevents deletion. The attention state and lock remain after a monitoring failure,
even when recovery cleanup succeeds. An initially unverified resource is never deleted speculatively.

Journal and lease-state replacement also tolerate bounded Windows EPERM/EACCES/EBUSY contention:
five attempts on the same temporary/destination, at most 300 ms total backoff, no destination deletion.
Other errors and exhaustion propagate. Four deterministic fixtures verify this; no external operation
is retried by the filesystem change. Billing observations remain separate from shutdown evidence.
