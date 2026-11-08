# Discover models without downloading or activating them

**26 October 2026 — F-021.** Model discovery records public metadata and human-reviewed task hypotheses.
It does not test inference, verify weight bytes, approve licenses, enable a community route or buy compute.
See the [QVAC assessment](../research/2026-10-26-qvac-and-afribit-fit.md) for why task and privacy boundaries matter.

Preview the [catalog](../evaluation/model-candidates.json), with no network:

```powershell
pnpm --filter @afribit/api showcase:discover
```

Explicitly fetch public metadata:

```powershell
pnpm --filter @afribit/api showcase:discover --fetch-metadata
```

Both invocations create a [trial record](../evaluation/trials/README.md) before validation. The second
mode sends at most eight sequential requests to `https://huggingface.co/api/models/<namespace>/<repo>?blobs=true`.
It uses no provider/Hugging Face token, cookies or account credentials. Requests have a 10-second deadline,
a 2 MiB body ceiling and no redirect following. It never fetches `/resolve` weights. The response contract
follows [Hugging Face Hub model metadata](https://huggingface.co/docs/huggingface_hub/package_reference/hf_api#huggingface_hub.HfApi.model_info);
this small adapter is not an official generated SDK or a guarantee of stable future response shape.

Output goes to a unique `output/discovery/<trial-id>` directory. Per-model reports and `summary.json`
retain the public repository revision, exact selected filenames, file size, advertised SHA-256 when
provided, metadata hash, fetch time, source and license/task review status. The journal retains failures
without raw error bodies; incomplete metadata exits nonzero rather than appearing fully successful.
Unknown sizes/digests/licenses remain null or issues. Weight size is not GPU/CPU RAM or peak memory.

The `pinnedUrl` identifies a prospective exact artifact but is never downloaded. `integrityVerified`,
`inferenceTested` and `activated` stay false. A publisher-reported hash becomes verified only after a
separate trusted download compares actual bytes. A model tag is not evidence of chat training or Sheng
quality, and a model license label does not clear its training dataset, base model or adapter terms.

`generalChatReviewCandidate` means only that the manually declared instruction/chat-baseline entry has
complete matching metadata; it grants no execution permission. Research bases, adapters and translation
specialists remain outside that shortlist even if the Hub labels them text generation. Translation
candidates can still receive their own appropriate benchmark later. All remain pending human, runtime
and license review, with no automatic conversion to F-018 policy or F-019 experiment plan.

Change the catalog with `--catalog D:/path/to/reviewed-catalog.json`. Sources must be canonical public
Hugging Face model URLs; repository names, paths, fields and bounds are validated. Publication metadata
is untrusted input; arbitrary fetch hosts and weight path traversal are rejected. Keep generated reports
separate from mutable catalog edits. No new package, database migration or network listener is added.

## First actual public metadata trial

Trial [b236ab4f](../../output/trials/b236ab4f-cb46-43a0-a562-1f9dc43ee008.json),
[summary](../../output/discovery/b236ab4f-cb46-43a0-a562-1f9dc43ee008/summary.json): five requests succeeded;
zero model calls/weight downloads, USD 0 paid compute. For the selected files, the Hub reported:

| Artifact | Bytes | Repository revision |
|---|---:|---|
| AfriSLM-0.8B Q4_K_M | 672,329,792 | `14d6fd1e24c9f94a5e40c2e91c066241aede0dce` |
| AfriSLM-2B Q4_K_M | 1,560,461,376 | `9bcceadebbcc5d36bba9f7f02141300a95ae8d04` |

The artifact files retain full advertised SHA-256 values. These are observations of public metadata,
not executed-model tests. The Genesis and biomedical entries were excluded from chat review; the
upstream baseline remains a hypothesis. No claim about actual QVAC integration or memory fit follows.

Next: choose at most two suitable models for a task-specific benchmark, verify runtime/weights and
local endpoint authentication, then compare language/usefulness and measure hardware. Keep RAG for facts,
training consent separate, and the existing rental/upstream-budget gates in place before paid work.

Checks: `pnpm --filter @afribit/api test:discovery` uses localhost metadata fixtures only and records its
own UUID trial; latest aggregate [proof](../../output/proof/p4-model-discovery-proof.json).
