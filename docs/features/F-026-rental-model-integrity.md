# F-026 — Verify the rental's installed model against a frozen manifest

**Status:** Built; 15 fixtures and real rented-host E4B verification pass · **Roadmap:** Mesh proof P4 · **Date:** 27 October 2026.

GPU timings are not comparable if a mutable model tag resolves to different files. Freeze the public
Ollama manifests for the existing Gemma 4 E4B and 26B-A4B Q4 candidates, then provide an offline Python
verifier for the rental's installed manifest and every referenced blob. Keep the existing Ollama gate;
do not introduce another serving runtime or pull more weights onto the laptop.

The [frozen metadata](../evaluation/rental-artifacts-2026-10-27.json) records exact manifest hashes,
blob sizes/hashes and publisher-reported linux/amd64 image digests. Manifest metadata bytes were hashed;
weight and container-layer bytes were not fetched. Image registry reads failed; separate Docker Hub
tag metadata reads succeeded. Image digests remain publisher-reported, not locally verified images.

The helper previews without inspecting a model store. Explicit verification checks the installed
manifest digest, agreement with the snapshot's descriptors, each blob's size and streaming SHA-256,
file identity/change checks and the manifest again after scanning. Refuse linked paths, invalid names,
unsafe digests, excessive metadata/blob counts/total bytes and elapsed verification deadlines. The
deadline is cooperative between local filesystem reads, not an independent process/billing watchdog.

Every parsed invocation creates a unique report, including preview/failure/cancellation. Use atomic
replacement and fsync; interrupted records are not passes. No model install/download, network request,
credential, account operation, inference or database change. Reports leave external compute cost null.
The tool cannot attest an untrusted host or clear licenses, language quality, GPU residency or billing.

Acceptance: complete synthetic store; same-size tampering; missing/wrong-sized blobs; changed manifest;
disagreeing descriptors; name/digest/size bounds; preview with no store scan and unique reports; durable
failure; deadline/metadata bounds; linked-component refusal. All 11 fixture checks pass. No real model
blob is read in those checks. See the [guide](../guides/rental-model-integrity.md) and
[dated trial report](../evaluation/trials/2026-10-27-rental-model-integrity.md).

**Later 27 October follow-up:** 15 fixtures now cover Ollama 0.40.11's canonical v2 named manifest,
including a narrowly permitted final symlink to the exact pinned regular manifest blob. Parent links,
external targets and an invalid v2 manifest shadowing legacy remain refused. No frozen model digest or
layer pin changed. The first actual rental failed safely at the legacy manifest check before inference;
the [worker report](../evaluation/trials/2026-10-27-rented-model-worker.md) retains that failure and retry.
