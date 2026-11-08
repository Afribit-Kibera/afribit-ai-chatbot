# F-027 — Authenticated rented Ollama worker and bounded session supervision

**Status:** Built and exercised on rented GPU; output qualification held · **Roadmap:** Mesh proof P4 · **Date:** 27 October 2026.

The live lifecycle canary recovered and deleted a real Pod but ran no model. The next slice runs the
existing Gemma 4 E4B Q4 candidate on a rental through the existing GPU gate, without public raw Ollama,
private community data, training, a published custom image or more laptop model downloads.

Use the pinned upstream Ollama image. Bootstrap Python from its signed Ubuntu package repositories
and a checksum/size-pinned portable Node 22 archive inside the rental only. Record actual versions;
OS package versions are resolved at setup, not a fully reproducible built worker image. Bundle only
explicit source/helper/metadata files. Send only a fresh test-key hash; retain the bearer in controller
memory. Neither the account RunPod key nor OpenRouter credentials enter the Pod payload or artifacts.

Bind Ollama to loopback, allow one model through the gate, and require the test key for diagnostics,
completion and all generation/model-list routes. Before readiness: verify installed model bytes,
warm the model, require the matching running digest and full GPU placement, and collect GPU telemetry.
Unready or failed workers refuse generation. Only sanitized versions, metrics, hashes and stage/error
codes are exported; no environment/config dump or arbitrary file endpoint.

Use an absolute session deadline including image/bootstrap/download/verification, not a renewed timer
on restart. A separate local supervisor owns cleanup; the worker additionally stops its own Pod at its
deadline using the vendor's pod-scoped CLI key. This inner stop is unverified until exercised, leaves
disk billing, and cannot replace scoped external termination/absence or final billing reconciliation.
No provider timer flags, indefinite rental, automatic create retry or runtime/model fallback.

First rental allocation at most $1.50, preserving $1.505 prior request allowances, $0.25 canary allowance
and $2 held aside in the original $10. Model/infrastructure measurements and language acceptance remain
separate. Record every preview, fixture, metadata request, failed setup, model call and cleanup.

The first live model session failed before inference on an Ollama 0.40.11 legacy-manifest mismatch;
its separate watchdog confirmed termination/absence. The storage fix retains the frozen manifest and
all layer pins, supports canonical v2 layout with the exact pinned final leaf link only, and binds the
test tag to the already-downloaded frozen digest. A distinct second $1.50 reservation retains the
first allocation. Later controller/proxy failures are also retained: four distinct $1.50 model-session
allocations bring the total held/allocated to $9.755, with $0.245 unallocated before tiny additional
dispatch reservations. Do not reset failed reservations or consume the $2 held aside automatically.
Both complete comparison plans now validate before account access; arming has bounded authenticated
same-worker reconciliation, with no repeated create or deadline extension. Twelve worker fixtures,
three exact-plan/stream fixtures (16 simulated requests) and six arm fixtures cover these changes.
See the [operator guide](../guides/rented-model-worker.md) and
[all actual trials](../evaluation/trials/2026-10-27-rented-model-worker.md).

Acceptance: unauthenticated/incorrect credentials refused; diagnostics export allowlisted data only;
unready/failed generation refused; wrong model/mutation routes refused; bounded requests; correct
traffic reaches the existing gate; absolute lease validation; supervisor cleanup on work completion,
timeout and uncertain creation without another POST. Real GPU evidence is separate from fixtures.

**Actual outcome:** fourth live model session completed 16/16 transport requests, one/four concurrent,
with all model bytes verified and authenticated gate usage recorded. Four answers were cut short at
the 4096-token context limit. Native review/model approval remains held. Separate watchdog termination
and absence were confirmed for all four sessions; current model-session invoices remain unknown.
Real telemetry exported 76 samples, sampled maximum 5568 MiB, before collector finalization.
Full tests, typecheck and existing runtime build pass. P4 is still in progress; no Mesh/TEE or pilot claim.

**28 October live preparation:** F-029 adds explicit context8192 support without changing default4096.
Readiness checks actual loaded context alongside digest/GPU allocation. Thirteen worker fixtures pass;
the integrated API/worker rehearsal has27 checks and an exported bounded live hook. Neither runs a
real8192 model/GPU in preparation. See [the runbook](../guides/community-rental-live-run.md).
