# Measure a rented GPU during inference

F-024 supplies a Python-standard-library helper for the next GPU trial. It runs **on the rented host**
and samples `nvidia-smi`; it does not create/stop a pod, download a model, perform inference, read API
keys or open a network port. The rental watchdog and billing reconciliation remain separate.

Original preparation evidence was **12 passing fixture tests, zero actual GPU calls**.
The [later authenticated rental](../evaluation/trials/2026-10-27-rented-model-worker.md) now exports
76 real samples and bounded live aggregates: maximum 5568 MiB/91%/227.91 W. The retained snapshot
was exported before termination (`finalized: false`), so it is not a finalized full trace or guaranteed
peak. No laptop GPU was used. The original [preparation report](../evaluation/trials/2026-10-27-rental-preparation.md)
remains unchanged as historical evidence.

## Preview without touching a GPU

From the repository root, using a new output directory:

```powershell
python tools/showcase/gpu_telemetry.py --out output/gpu-preview-UNIQUE-RUN
```

This creates `preview.json` with a UUID, timestamp and configuration; NVIDIA tools are not invoked.
Existing output directories are refused. Python 3.10+ is the documented operational target; fixtures
were run with Python 3.12.10. No pip dependency is needed.

## During a future rented trial

Copy the reviewed helper to the rental, retain its source hash, and link its telemetry UUID/output to
the inference trial and exact lease. The GPU driver must provide `nvidia-smi`. Example for a Linux host:

```bash
python3 tools/showcase/gpu_telemetry.py \
  --out /workspace/results/telemetry-UNIQUE-RUN \
  --duration-seconds 300 \
  --interval-seconds 1 \
  --timeout-seconds 2 \
  --completed-file /workspace/results/evaluation-UNIQUE-RUN.done \
  --execute
```

Start it alongside the inference evaluator. The marker must initially be absent and outside the new
telemetry directory. Write the marker only after the evaluator's outputs are exported; a marker stops
sampling, **not rental billing**. Export the telemetry file before terminating the pod. Do not reuse
an earlier marker/output directory. This command is documented for the future rental; it was not run
on an actual GPU in this pass.

Bounds: duration 0.1–900 seconds, interval 0.1–30 seconds, subprocess timeout 0.05–5 seconds, at most
900 scheduled samples. A query's timeout is reduced to the remaining monotonic deadline. Filesystem
operations and OS scheduling are outside hard real-time guarantees. Cancellation/interruption records
`needs-attention`; a killed host/process can leave a `started` record, which is not a pass.

## Read the evidence

`telemetry.json` is flushed and atomically replaced after each sample and at finalization. It contains:

- UUID, configuration, start/end timestamps, elapsed time and completion/failure reason.
- Device index/UUID/name/driver, total and used VRAM in MiB, utilization and power when supported.
- Per-device **sampled maxima**; a sub-second peak between samples may be missed. Memory includes
  other processes on that device, so report baseline/device sharing separately.
- Explicit missing optional measurements; unavailable/invalid memory is a failure, never zero.
- Failures and partial samples; earlier successful samples cannot turn a later query failure into a pass.

`paidComputeUsd` stays unknown because telemetry is not a provider receipt. A device's used memory or
nonzero utilization does not prove that every model layer is GPU-resident. Pair this file with the
serving runtime's residency evidence, fixed model/runtime/quantization/context, one/four-client results,
startup/download time and the actual rental bill. This tool does not measure model language quality,
Mesh performance, TEE privacy or a provider-guaranteed spending cap.

## Standing tests

```powershell
pnpm --filter @afribit/api test:gpu-telemetry
```

Also included in `pnpm test`. The Node launcher records a durable trial and source hash; Python tests
use synthetic NVIDIA rows, injected clocks/samplers and temporary output directories. No driver/GPU is
required for tests. Exact results are under `output/gpu-telemetry/<trial UUID>`.
