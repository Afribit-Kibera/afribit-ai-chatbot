# Freeze model files before measuring a rented GPU

**Latest rented-model update:** [the authenticated worker](rented-model-worker.md) now verifies the
exact 6,583,656,505 E4B bytes on a real rental. Its fourth session completed 16 transport requests;
four outputs were context-limited, so quality remains held. All four model-session Pods are confirmed
absent, model bills pending, with $9.755016 held/allocated in the original $10. The earlier canary's
$0.25 allowance is retained; its later reported charge is $0.006488841492682695, not a final invoice.
The preparation/planning sections below retain their original context; use the latest worker report
for actual runtime, spending and model-file verification evidence.

The existing Ollama path remains the target. First use **Gemma 4 E4B Q4_K_M** for a bounded smoke test;
it is an existing project candidate, not a newly approved model. Consider 26B-A4B only after that path
works and the remaining budget permits. Native community reviewers still decide Sheng suitability.

The [27 October snapshot](../evaluation/rental-artifacts-2026-10-27.json) contains:

| Candidate | Manifest SHA-256 prefix | Listed total download bytes |
|---|---|---:|
| `gemma4:e4b-it-q4_K_M` | `dc35e8d9c6061baa` | 6,583,656,505 |
| `gemma4:26b-a4b-it-q4_K_M` | `5571076f3d700504` | 17,987,581,215 |

Totals include config and all manifest layers. E4B includes a projector and draft model; its main
model layer alone is 5,493,439,296 bytes. Download bytes are neither loaded VRAM nor unpacked storage.
Do not infer that either complete configuration fits a GPU at four simultaneous contexts from this table.

The snapshot also records publisher-reported platform digests for `ollama/ollama` and
`node:22-bookworm-slim`. These pin prospective upstream images, not a built RunPod worker. Their image
layers have not been downloaded, and CUDA/driver compatibility and gate integration remain unqualified.
Use the digests rather than mutable tags when preparing an actual worker; verify the resulting image
and runtime on the rented host. No new image was built/published or container installed in this pass.

## Preview on the development computer

From the repository root, with Python 3.10+ (tested here with 3.12.10):

```powershell
python tools/showcase/verify_ollama_store.py --snapshot docs/evaluation/rental-artifacts-2026-10-27.json --model gemma4:e4b-it-q4_K_M --out output/ollama-store-preview
```

This reads only the small snapshot and writes a unique report. It does not inspect an installed store,
download weights, start Ollama or contact RunPod. Keep its report alongside the session trial records.

## Verify on a future rental

Copy the reviewed snapshot and helper to the rental through the approved authenticated operator path.
Confirm the helper SHA-256 against the operator's retained copy. After an explicitly authorized pull
onto the rental, run this there, substituting its actual model-store path:

```bash
python3 verify_ollama_store.py --snapshot rental-artifacts-2026-10-27.json --model gemma4:e4b-it-q4_K_M --store /root/.ollama/models --out /tmp/afribit-model-verification --seconds 300 --execute
```

Use a local regular-file store and place reports outside it. The helper reads every referenced blob,
so allow for disk scan time within the rental deadline. It does not install or import a model. A pull
by name still resolves a mutable tag: if it changed since the snapshot, verification must fail before
benchmarking. Do not silently replace the frozen pin to make a run pass. Preserve a new trial instead.

A success verifies the bytes against an operator-supplied pin. It does not authenticate the publisher,
protect against a malicious host, prove that Ollama used those files, or prove GPU residency. Collect
Ollama's running-model digest/placement and [NVIDIA telemetry](rented-gpu-telemetry.md) during generation.
Preserve partial/failure reports; external compute cost stays null until reconciled separately.

## Planned first inference session

Use one GPU, one disposable test pod, synthetic/public-approved inputs, no attached network/global
volume, no fine-tuning and no runtime fallback. Target an all-in **$1.50 maximum allocation** for the
first session and at most **30 minutes including startup/download/verification/shutdown**; these are
planning ceilings, not a current quote or a new reservation. Check actual compute, storage, fees and
shutdown grace before selecting a machine. Retain the existing $1.505 request allowances, $0.25 canary allowance and $2 reserve
inside the original $10 experiment. No budget has been reset by this plan.

First collect an authenticated generation and confirm placement, then use the existing frozen synthetic
comparison and community harness. Compare one versus four requests only with identical model bytes,
context and settings. If another GPU is tested, hold those constant; changing model size is a separate
comparison. Reconcile costs before allocating more work against the same experiment envelope.

Live stable control access, actual owned-pod delete/absence behavior, independent shutdown, deployable
region/quote and authenticated TLS/gate integration remain launch requirements. A model-file verifier
does not satisfy them. Ordinary GPU rental does not prove confidential/TEE processing.

`pnpm --filter @afribit/api test:ollama-store` now runs 15 offline fixtures and records a UUID parent trial.
Fixtures use tiny synthetic files only; they do not inspect the development computer's model cache.

## Ollama 0.40.11 storage follow-up

The [first real worker trial](../evaluation/trials/2026-10-27-rented-model-worker.md) refused a legacy
manifest mismatch before inference. This runtime writes a compatibility anchor in the old directory;
the actual named manifest lives under `manifests-v2/ollama.com`. The verifier now checks that path first.
A regular manifest must match the frozen raw SHA-256. Its final named symlink is permitted only when
it targets the exact pinned, regular manifest blob inside this store. Parent links, external targets,
linked weight blobs and a bad v2 manifest shadowing a valid legacy file are refused. Legacy regular
manifests remain supported. The same frozen manifest and every layer size/hash still apply.

After pulling, the worker verifies the already-downloaded frozen manifest blob, then uses local
`/api/copy` to bind the test tag to that exact digest reference. It does not replace the frozen snapshot
or silently accept a multi-runner index. Installed-file verification, running digest and placement are
separate checks; the follow-up trial determines whether they work together on the actual rental.

Primary implementation references for the observed runtime:
[manifest storage](https://raw.githubusercontent.com/ollama/ollama/v0.40.11/manifest/manifest.go),
[canonical paths](https://raw.githubusercontent.com/ollama/ollama/v0.40.11/manifest/paths.go),
[digest copy implementation](https://raw.githubusercontent.com/ollama/ollama/v0.40.11/server/images.go),
[copy API](https://docs.ollama.com/api/copy).

Primary references: [Ollama model page](https://ollama.com/library/gemma4:e4b-it-q4_K_M),
[official container instructions](https://docs.ollama.com/docker),
[running-model metadata](https://docs.ollama.com/api/ps).
