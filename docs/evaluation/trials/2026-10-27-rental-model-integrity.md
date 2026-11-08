# Rental preparation: frozen model manifests — 27 October 2026

**Result:** exact Gemma 4 E4B/26B Q4 manifest metadata captured, with an offline installed-store verifier
passing 11 fixture tests. No model weights/image layers downloaded, GPU rented, training performed,
production setting changed or new paid request made. RunPod control access remains intermittent.

## Every trial

| Trial | Result |
|---|---|
| [0ef80597](../../../output/trials/0ef80597-5fae-41b7-8c77-9a9e07aed2ad.json) | Four bounded REST reads using agents configured for connection reuse: three timeouts; fourth HTTP 200, zero pods, verified TLS 1.2. Successful response used a new socket, so reuse was not demonstrated |
| [5e82b07b](../../../output/trials/5e82b07b-592b-4b8a-92e3-ef2295eac847.json) | Two public Ollama manifests retrieved and their metadata bytes hashed; anonymous Docker registry image metadata reads failed. No weight/image layer downloads. Status needs attention, not an all-success snapshot |
| [9e2eb6c4](../../../output/trials/9e2eb6c4-a550-456d-901a-ac8cb59db5ee.json) | Separate public Docker Hub tag reads succeeded for linux/amd64 Ollama and Node images. Digests are publisher-reported; registry manifests/layers remain unverified |
| [f454b4f4](../../../output/trials/f454b4f4-1f50-49a8-9217-c19c5979cf97.json) | Initial installed-store verifier: 11 synthetic fixture checks pass, zero actual model/GPU/network calls |
| [803e5980 preview](../../../output/ollama-store-preview/803e5980-96a8-4d85-8c6c-cce56b55dce0/report.json) | Default helper preview against retained snapshot succeeds without reading a model store. Later report wording leaves external rental cost null; this earlier local-only preview's zero cost is valid for its actual execution |
| [b26b8eaf](../../../output/trials/b26b8eaf-9753-4f2c-8a30-dba810d90aea.json) | Full-suite verifier: final 11/11 pass, after adding the helper hash and leaving external rental cost null. All files remain synthetic |
| [753502ff preview](../../../output/ollama-store-preview/753502ff-4baa-425d-a28b-81a94857f0f0/report.json) | Final helper preview using the portable repository snapshot; no installed-store scan, network, model or GPU call; external rental cost null |

The latest REST probe reached TCP connections in all four requests, but only the fourth completed
verified TLS within its deadline. This distinguishes connection/handshake stalls from model or key
failures; it does not identify a root cause. No TLS verification, firewall, DNS, proxy or account setting
was changed. An optional request to try another network was sent while independent work continued.

## Artifact and helper evidence

The [portable snapshot](../rental-artifacts-2026-10-27.json) preserves both exact model manifest hashes
and every descriptor. E4B totals 6,583,656,505 listed bytes, including projector/draft/config; 26B-A4B
totals 17,987,581,215. They remain candidates, not new measurements of language quality or GPU fit.
Public OCI tag metadata identifies prospective pinned upstream images. Neither image was installed,
tested or published as an integrated worker. The registry failures remain retained.

[F-026](../../features/F-026-rental-model-integrity.md) adds no package or network dependency: Python
standard library only. Its preview reads the snapshot; explicit execution scans a separately selected
Ollama store. It rejects changed model manifests/descriptors, missing or size/hash-mismatching blobs,
linked paths, malformed/excessive inputs and elapsed cooperative deadlines. Reports include their
helper and snapshot hashes. It cannot attest the host or prove which bytes a runtime actually executes.

All 11 tests use synthetic tiny files. They establish verifier behavior, not correctness of the real
weights. Full `pnpm test`, workspace `pnpm typecheck` and `pnpm build` pass. Source remains an
uncommitted working tree on `965d4c3`; earlier trials/allowances have not been reset or removed.
API/shared source hash: `616e281e2aa7a013ceeab2f77cd4175845587ef0e84ed42a69b24a1d1382ae83`.
Separate Python helper/test hash: `e6ebed947b645340bae8b842f573ab680a02a83e8d9b56f7981f50ee015a1ab1`.
Raw helper file SHA-256: `8ed5cbb8f1897303602f169e9cdd62dc1c8ce2fe040863a7cdaf33280df360a2`.
Portable snapshot SHA-256: `a14955840edb0ac77fa79fa3daf555c7e7162f049e4d4b3fe81eab4d3cb1d1ed`.
The full suite also retains its normal per-invocation UUIDs, including intentional refused CLI cases;
they are not live provider failures or spend. No UI changes/deployment, so no browser journey was run.

## Spend and next step

New spend **$0**. Known session hosted charges remain **$0.00423240**. Conservative prior request
allowances **$1.505** plus the same **$2 reserve** remain within the original **$10**; no rental allocation
was consumed/reserved here. The guide proposes a $1.50 all-in first rental ceiling, pending a live quote.

Next live gate remains stable provider control access and safe owned-resource lifecycle verification.
Then prepare the authenticated worker, verify downloaded bytes on that rental, confirm GPU placement,
run synthetic comparisons/normal API flow, terminate and reconcile the actual bill. No full P4, TEE,
production migration, language acceptance or trained community model is claimed from this preparation.
