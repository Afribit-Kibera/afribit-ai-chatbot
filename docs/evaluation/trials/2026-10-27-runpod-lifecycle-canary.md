# First current-proof RunPod lifecycle canary — 27 October 2026

**Result:** one real disposable RTX 4090 Pod was provisioned in EU-RO-1 and then terminated, with
HTTP 204 deletion acceptance followed by HTTP 404 absence. Creation's response timed out, so the
trial remains **failed**, with successful uncertainty recovery/cleanup recorded separately. No model
or GPU workload ran; this is lifecycle evidence, not inference, capacity or independent-supervisor proof.

Edmund chose to keep the current connection. No network, proxy, DNS, firewall, payment or account key
setting was changed. Read-only checks found direct WinHTTP access and no system proxy for the API URL.

## Every trial

| Trial | Purpose and result |
|---|---|
| [9f29ad1c](../../../output/trials/9f29ad1c-369b-4aa1-be3a-8fea95c00d2b.json) | Existing native HTTPS conformance check timed out on its first read, before mutations |
| [5febbe72](../../../output/trials/5febbe72-f36d-41c5-a49f-5893bbc60dbb.json) | Built a 19,662-byte public-assets archive with 10 entries; reopened it and checked every member byte, type, name and uniqueness against its allowlist; zero network/model calls |
| [142a22a3](../../../output/trials/142a22a3-5070-47af-824f-0b2845f6345d.json) | Downloaded official portable runpodctl v2.14.0, verified 14,472,704 bytes/SHA-256, confirmed version; two `pod list --all` reads succeeded (5.295 s/0.985 s), both zero pods |
| [84aac003](../../../output/trials/84aac003-54d5-4e9a-80a6-95816a0fe7c1.json) | Retained CLI lifecycle/catalog help; absent-pod read returned a network error, GPU catalog exceeded the 20 s process limit. Earlier CLI success was not a reliable fix |
| [c8c947a9](../../../output/trials/c8c947a9-e84a-4767-86ee-c4ed899a4b10.json) | Verified shared HTTP/2 connection: pod reads HTTP 200 (1.863 s/0.417 s), absent-ID HTTP 404 (0.333 s); normal TLS certificate verification |
| [0cea2d0b](../../../output/trials/0cea2d0b-0511-428b-af81-9dc1c981017d.json) | A separate HTTP/2 session read zero pods, secure GPU availability/prices, and OpenAPI, all HTTP 200. Snapshot lists RTX 4090 secure $0.89/h; community $0.34/h is a different tier. OpenAPI allOf fields were not flattened, so empty field summaries are not complete schema extraction |
| [18c53c21](../../../output/trials/18c53c21-1921-4ea7-b541-8f71bf0a8481.json) | One create dispatched after fresh empty-account/quote checks and a persistent $0.25 allowance. Response timed out; uniquely named Pod was recovered without another create. Identity/storage re-read, deletion HTTP 204, absence HTTP 404. Overall failed, cleanup confirmed |
| [dee9eb3e](../../../output/trials/dee9eb3e-b634-404f-8ded-a64b5678c582.json) | Initial post-canary billing/absence read failed on its first request; billing/account queries were not reached. No mutation or new rental |
| [98cf9f0f](../../../output/trials/98cf9f0f-0b8b-4c95-a1a6-6caf296f230e.json) | Explicit billing-first follow-up also timed out without a billing response; account query not reached. The canary cost stays unknown, not zero |
| [dfe462e5](../../../output/trials/dfe462e5-9bcc-4dac-9920-2ffd5e5a1a3e.json) | Later reconciliation succeeded: provider pod billing $0.006488841492682695 (GPU, no reported disk/CPU charge), account balance $12.8121183232, zero pods/$0 hourly spend at that observation. Matches the prior balance change within $0.000001; invoice not final |

One tool-orchestration call had a JavaScript quoting error before any nested call executed; it was
corrected. It created no model/provider trial or external effect. All actual trials above are retained.

## What the paid canary did

The operator script [runpod-lifecycle-canary.mts](../../../output/runpod-lifecycle-canary.mts) admits
one uniquely named Pod and refuses another invocation once its reservation file exists. Before POST,
it requires an empty account, fresh secure RTX 4090 catalog price at most $1/hour and EU-RO-1 stock.
The actual accepted resource reported **$0.89/hour**, a 5 GB container disk, no exposed ports, no SSH/
Jupyter, no network/global mounts, and the previously recorded amd64 Node image digest. It ran no model.

Creation was dispatched at **15:11:52 Nairobi time**. Provider creation time was **15:11:53**; cleanup
was confirmed at **15:12:29**. The complete operator invocation took **53.159 seconds**. These times
do not identify the precise billed duration, image-pull completion or whether the Node process ran.

After the 15-second create-response deadline, the script did **not** repeat POST. It looked up the
unique UUID name, matched creation time and ID, refused external mounts/locks/clusters, and re-read
immediately before DELETE. It retained the Pod ID privately in local operator state, not in this report.
Cleanup acceptance and GET absence are distinct recorded observations. No other resource was deleted.

This operator canary does not run the standing F-020 watchdog or validate its independent supervision,
restart behavior or live adapter. HTTP/2 is a useful diagnostic path; timeouts remain and it has not
been adopted as a production transport. The existing default fetch adapter remains unchanged.

## Portable assets and CLI provenance

[The archive](../../../output/rental-bundle/5febbe72-f36d-41c5-a49f-5893bbc60dbb/afribit-rental-assets.tar.gz)
contains the existing gate/key-management source, telemetry/verifier helpers, frozen model metadata,
synthetic cases, two guides and a README/manifest. Its SHA-256 is
`7f36b15476b725c6ae1ffb94d1c7f213e119b181eb3fbf600e0667788ea09cc3`.
It is not a worker image, installer, full app/database, or automatic deployment. No credentials,
model weights, account state, learner data or recursive workspace archive were included. It was
verified locally, not transferred or installed on the canary.

The CLI binary SHA-256 is
`026be0b38d0cc7e68bd2ff21042ebce71b726d0086b160772933d6cea38691f8`, from
[official v2.14.0](https://github.com/runpod/runpodctl/releases/tag/v2.14.0). It stays under local output,
with no PATH/global executable installation. Only required system variables and the RunPod key were
passed to the child; credentials were not put in arguments/logs. The CLI initialized a 53-byte user
config containing `apikey`/`apiurl` fields; a value-free audit confirmed the credential field is empty.
No legacy config existed or was migrated. No doctor/authentication/SSH-key setup was invoked.

## Deadline finding

An earlier cached CLI reference still mentioned timer flags. Current
[release v2.12.0](https://github.com/runpod/runpodctl/releases/tag/v2.12.0) and
[merged removal PR 330](https://github.com/runpod/runpodctl/pull/330) establish why they cannot be used:
the API accepted the fields without executing the deadline, and the CLI removed them. The live v2.14
help agrees. This finding is from upstream source/release evidence, not our own timer experiment.
Do not use `--stop-after` or `--terminate-after` as a cost cap. A process exiting or a sampling marker
is also not proof that Pod billing stopped. Retain independent cleanup before a long inference rental.

## Budget and remaining work

The $0.25 allowance remains reserved, including failed/uncertain dispatch. It shares the original $10
with $1.505 previous request allowances and $2 held aside: **$3.755 reserved/held**, **$6.245 unallocated**.
These are application allowances, not provider-enforced limits or an invoice. Prior hosted-model
charges remain $0.00423240; the canary's incremental billed amount is pending reconciliation. Its
trial `paidComputeUsd` remains null as its historical observation; the later reconciliation above reports
**$0.006488841492682695**, without claiming a finalized invoice. No allowance was refunded or account
credit treated as a new budget. A subsequent model session has a separate reservation/report.

Next: reconcile provider billing, then qualify the authenticated worker and independently supervised
model session. The first rented-model generation, real telemetry, community-language review, Mesh,
TEE/confidential processing and full P4 acceptance remain open. Earlier full tests/typecheck/build
remain the latest passing application validation; this slice changed only operator scripts/artifacts
and documentation, so those suites were not needlessly repeated.
