# RunPod lifecycle readiness — 27 October 2026

**Result:** control-plane connectivity could not be established from this execution environment.
No pod was created, modified or terminated; no model invocation/download or rental charge occurred.
Account balance, existing resources, current deployable stock and v2 response conformance remain unknown.
This is a connection failure, not an authentication rejection or evidence that the account is empty.

The earlier [GPU catalog snapshot](../../../output/hosted-preflight/d2504d4c-dcf0-45a2-9df5-1f969e88926f/summary.json)
was successful earlier on this date. Its prices/stock are historical observations, not a current deployment
quote. It does not establish that the current control API is reachable.

| Trial | Requests and outcome |
|---|---|
| [6afaf7be](../../../output/trials/6afaf7be-52d1-444a-b53f-c58209952a6f.json) | Read-only `GET /v2/organization`, `GET /v2/pods`, then a GraphQL account/GPU query. No HTTP response was recorded; failed, cost $0 |
| [165ac1c7](../../../output/trials/165ac1c7-66b0-403a-8bb6-98301d2a78eb.json) | Diagnostic rerun records `UND_ERR_CONNECT_TIMEOUT` for both REST reads and GraphQL. Partial REST evidence retained; no mutation/model call, cost $0 |

A subsequent unauthenticated IPv4 `curl.exe` HEAD to the documented v2 Pods URL timed out after its
five-second connection limit. DNS resolved public Cloudflare IPv4 addresses. This confirms the symptom
outside Node's fetch client; it does not identify its network/provider cause. No credentials were used
in this probe. Source inspection also encountered one nonexistent optional `.codex` directory; no
account/model action resulted.

[Official API overview](https://docs.runpod.io/api-reference-v2/overview),
[organization read](https://docs.runpod.io/api-reference-v2/organization/get-your-current-organization),
[Pods list](https://docs.runpod.io/api-reference-v2/pods/list-pods),
[GraphQL schema](https://graphql-spec.runpod.io/) and
[Pod management](https://docs.runpod.io/sdks/graphql/manage-pods) were reviewed. These establish documented
interfaces, not live conformance. The existing watchdog remains tested only against local fixtures.
No raw account identity, pod IDs, environment, SSH details or credential values were printed or saved.

## Next rental scope, once the control plane is reachable

1. Read current resources/balance, verify the cleanup adapter's live schema, quote the exact GPU/region
   and storage configuration, and freeze a disposable lease. Do not touch unrelated resources.
2. Qualify one open-weight model artifact, its license, digest and compatible pinned runtime. Use the
   same artifact, quantization and context for hardware comparisons. The hosted Gemma FP8 alias is not
   an exact downloadable checkpoint/digest. A Q4 rental variant would be a separate model configuration.
3. First rent one 24 GB GPU for a short, authenticated serving test only if the selected model plus KV
   cache/runtime fits. A 27B FP8 configuration must not be assumed to fit 24 GB. Compare a 48 GB GPU
   only after the first run/cleanup is measured and enough of the same envelope remains.
4. Verify independent supervision and exact-identity termination, including startup/download/idle time.
   Export artifacts before termination; verify pod absence, independent storage and the final bill.
   An in-process timer or a server process exiting alone does not establish that billing stopped.
5. Run synthetic actual-retrieval requests, one/four-client scheduling, and provider-loss fallback. Record
   GPU residency/VRAM, startup, first token/full time, throughput, failures and all-in cost. Keep model
   answer quality and hardware performance separate. No real private data or training.

Budget remains the original **$10**, including **$1.505** retained earlier request allowances and **$2**
held aside. That leaves **$6.495 unallocated** under this conservative reservation accounting; it is
not a rental authorization to spend the whole remainder or a final invoice calculation. Prefer a
small rental allocation and retain the rest until startup/cleanup costs are known. Known model charges
so far total **$0.00423240**; pending/error per-request invoices are not declared zero.

Do not launch while lifecycle control cannot be read reliably. The next action is a fresh read-only
connectivity/conformance check, not a blind create request. No further network retries occurred here.
