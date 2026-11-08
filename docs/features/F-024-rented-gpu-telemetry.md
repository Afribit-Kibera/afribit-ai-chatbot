# F-024 — Bounded GPU telemetry for a rented serving trial

**Status:** Built; 12 fixtures and real rental sampling exercised · **Roadmap:** Mesh proof P4 · **Date:** 27 October 2026.
Continues the authorized rented-compute proof while RunPod control-plane connectivity is unavailable.

**Later live result:** [F-027's fourth rental](../evaluation/trials/2026-10-27-rented-model-worker.md)
exported 76 real samples over 77.35 seconds, sampled maximum 5568 MiB/91%/227.91 W, no observed
query failures. The worker derives bounded live aggregates from the existing helper's samples;
the exported snapshot is pre-termination and not finalized. No guaranteed peak or complete trace
is claimed. The first prepared telemetry attempt exported a count without maxima; that limitation
and the correction are retained. The original preparation context below is historical.

The current evaluator reports latency/tokens but leaves peak GPU memory unknown. Add a portable
Python-standard-library helper to run on the rented host alongside the evaluator. It invokes
`nvidia-smi` without a shell and records per-device total/used VRAM, utilization, power and driver.
Bound wall duration with a monotonic clock, subprocess timeout, sample count and optional completion
marker. Persist samples as they arrive, retaining failures and a final status. Never infer zero memory
from missing telemetry, or declare a model fully GPU-resident from device activity alone.

The helper's default preview checks arguments and prints configuration without invoking NVIDIA tools.
Explicit `--execute` samples only the local machine; it neither downloads models nor opens a network
port, manages rentals or reads API keys. A second process/evaluator produces a unique completion marker
after exporting its inference artifacts. A present marker stops sampling, not provider billing.

Acceptance tests use synthetic `nvidia-smi` output and injected clocks/processes: multiple devices,
unsupported/N/A measurements, malformed output, invalid bounds, startup/subsequent failure, persisted
partial evidence, monotonic deadline, completion marker and create-only output ownership. No GPU is
used on the laptop. Every preview, fixture suite and future real run has a durable trial/evidence record.

This does not create a pod, solve control-plane connectivity, supervise billing/termination, certify
TEE protection or measure a real GPU before the helper is run on one. Report sampled maxima rather
than a guaranteed hardware peak. Keep the same model/runtime/context when later comparing GPUs.

**Evidence:** [actual preparation/fixture report](../evaluation/trials/2026-10-27-rental-preparation.md),
[operator guide](../guides/rented-gpu-telemetry.md). Final suite passes 12 checks; broader tests,
typecheck and build pass. Zero GPU/account/model calls in telemetry fixtures. RunPod control-plane
timeouts remain unresolved; no rental or real hardware result.
