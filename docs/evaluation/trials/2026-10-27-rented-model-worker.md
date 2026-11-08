# Authenticated rental worker — 27 October 2026

**28 October follow-up:** [context admission and new billing observations](2026-10-28-context-headroom.md)
now reject the old recipe offline, fail length finishes, and provide a newly derived review pack
without changing these frozen paid-session artifacts. Provider-reported charges have populated:
all four model sessions $0.12418400717433542, successful fourth $0.040801142691634595. Final invoice
remains unconfirmed; original allowances remain held. Pending-billing statements below describe
the 27 October observations.

**Status: rented inference demonstrated; 16 transport completions, four context-limited outputs. All four model-session Pods terminated and confirmed absent. P4 remains incomplete.**
Parent trial [76f889ef](../../../output/trials/76f889ef-2071-4e9b-9198-ad327614f768.json) created a
secure RTX 4090 Pod in EU-RO-1 at $0.89/hour, pulled the model and refused a legacy manifest mismatch
before warmup or inference. Its separate watchdog terminated it and confirmed absence, without
attention. Follow-up [4443ee26](../../../output/trials/4443ee26-90fb-4639-b80e-7f7c5c29a5d7.json)
verified the frozen files, warmed the model and refused anonymous access, but its comparison plan
was rejected before any comparison call. Third trial failed while arming through the proxy; both are
terminated with absence confirmed. Fourth trial uses the corrected plan and bounded arm reconciliation.
The fourth completed both comparisons and supervised cleanup. No model weights were downloaded onto
the laptop. This is a technical transport/model-file proof, with the output limits below still held.

## Preparation and every trial

| Trial | Result |
|---|---|
| [dfe462e5](../../../output/trials/dfe462e5-9bcc-4dac-9920-2ffd5e5a1a3e.json) | Canary reconciliation: provider $0.006488841492682695, balance delta agrees; zero pods/$0 hourly spend at that observation; not a final invoice |
| [c2963bad](../../../output/trials/c2963bad-2df8-4ba2-a02a-689361dd0f3b.json) | Public Node 22 runtime metadata/checksum/HEAD size only, no binary download: v22.23.4 Linux x64 archive 31,029,996 bytes |
| [6db5625e](../../../output/trials/6db5625e-bba6-4eab-a031-a9491ec3b3e7.json) | Initial worker authentication suite, 10 synthetic checks pass |
| [222f64a8](../../../output/trials/222f64a8-18eb-4a8e-958e-af3d01959c44.json) | Initial worker-session preview, 129,177-byte command, zero account/model calls; no execution |
| [f63c7ff7](../../../output/trials/f63c7ff7-ecae-4751-a9e8-5f393afa0790.json) | First full suite failed in showcase fixtures: Windows EPERM replacing a journal. Trial and temporary file retained; zero provider calls |
| [2ee50b58](../../../output/trials/2ee50b58-086d-4132-972f-1c2cbdf48948.json) | Four bounded journal-replacement fixtures pass; same temporary/destination, no deletion or external request retry |
| [e331089a](../../../output/trials/e331089a-c9bc-4fde-99bb-07e370efff5d.json) | Bootstrap Python parses with AST only; setup not executed |
| [34a3a596](../../../output/trials/34a3a596-1a6a-4a42-a67b-337adb1848ca.json) | Expanded worker suite 11/11, including authenticated one-time arm before model startup |
| [d73f240d](../../../output/trials/d73f240d-5aa7-40cb-8846-a10c2424cea1.json) | Full-suite worker run 11/11; zero account/GPU calls |
| [41f0595b](../../../output/trials/41f0595b-0bff-46eb-b735-85dd4534c6f2.json) | Compressed bootstrap passes static Python parsing; no setup/download executed |
| [da846ccc](../../../output/trials/da846ccc-997f-4ba3-bfd3-51f77edc2480.json) | Compressed session preview: 50,673-byte command, zero account/model calls |
| [366d84b3](../../../output/trials/366d84b3-137c-4a02-bdb5-f75dd399f178.json) | Final full-suite worker run 11/11, zero account/GPU calls |
| [35bfadbc](../../../output/trials/35bfadbc-9291-45ce-8cec-409648b3659a.json) | First execution failed before reservation/POST; no pod/spend. Error classification was initially too coarse and was improved, without rewriting the failed record |
| [7e442736](../../../output/trials/7e442736-b04f-43a8-bc0b-87766ed0dbea.json) | Read-only shared control module returned HTTP 200, zero pods |
| [fe5b092e](../../../output/trials/fe5b092e-664a-43a2-ac4a-95aa636dbb20.json) | Second execution failed at baseline transport, before reservation/POST; zero pod/spend |
| [76f889ef](../../../output/trials/76f889ef-2071-4e9b-9198-ad327614f768.json) | Paid first model session failed at installed-manifest mismatch before warmup; separate supervisor confirmed termination/absence |
| [db369244](../../../output/trials/db369244-af04-47e0-994a-00aeaf6510fb.json) | First session's standing watchdog: work-complete cleanup, accepted delete, confirmed absence, exit 0, no attention |
| [9dedda37](../../../output/trials/9dedda37-9ab0-40da-acc0-51f27e4560e1.json) | Read-only billing follow-up: HTTP 200 with zero rows (bill pending), owned Pod 404 and account zero pods |
| [2059bdda](../../../output/trials/2059bdda-9697-4abe-84a1-5e93958c4917.json) | Expanded verifier 15/15, including v2 exact pinned leaf link and rejection cases; synthetic files only |
| [41629090](../../../output/trials/41629090-e877-4d80-a58b-84134515073a.json) | Updated authenticated worker suite 11/11 after exact-manifest alias correction |
| [dde48942](../../../output/trials/dde48942-b80b-42e2-ac80-c442f975445f.json) | Updated compressed bootstrap parses as Python; zero setup execution/download/account requests |
| [65564ab0](../../../output/trials/65564ab0-caea-45b7-b8bd-14167b6ff364.json) | Final pre-follow-up worker checks 11/11; zero GPU/account calls |
| [05e91420](../../../output/trials/05e91420-e52e-4f34-93af-34a4296206f2.json) | Follow-up preview: 52,701-byte bootstrap, zero account calls, cumulative planned allocation $6.755 |
| [4443ee26](../../../output/trials/4443ee26-90fb-4639-b80e-7f7c5c29a5d7.json) | Second rental: exact 6,583,656,505 bytes verified, warmup 1, anonymous model-list 401; plan rejected before comparison; cleanup/absence confirmed |
| [a2af0016](../../../output/trials/a2af0016-3c89-4c2b-a7dc-dca456c7d199.json) | Second rental watchdog: completion deletion/absence confirmed, exit 0, no attention |
| [ea4a7d37](../../../output/trials/ea4a7d37-d5ea-4a75-90cb-c05bc5b2dc26.json) | Second rental billing read: zero rows pending, Pod 404, account zero pods |
| [cb34a416](../../../output/trials/cb34a416-4783-44c8-891a-84d9da5a93b5.json) | Initial offline plan fixture failed writing an array into a scalar-only journal event; no network/model/GPU calls |
| [bcc98a32](../../../output/trials/bcc98a32-cd45-4dca-9257-7377fcc4376b.json) | All 12 worker tests passed, but suite wrapper still expected 11 and correctly recorded failed; wrapper count fixed |
| [aa7a60c1](../../../output/trials/aa7a60c1-31b3-4128-868d-e0fde3454abb.json) | Updated telemetry-export bootstrap syntax valid; setup not executed |
| [d7c58e73](../../../output/trials/d7c58e73-c9f3-4768-88a5-7cddc8cd557d.json) | Incomplete preview journal after the same nested-event error; no account calls/reservation. Preserve as incomplete, not a pass; preview failure finalization fixed |
| [f33a9ec3](../../../output/trials/f33a9ec3-f0c6-44d8-a6bc-0e46812e88e3.json) | Three offline checks: reproduce rejected route, prepare both plans, traverse runner/admission/native streaming/ledger with 16 simulated requests; zero network |
| [5a8e5c48](../../../output/trials/5a8e5c48-a960-4699-9df9-b00a9ddddaa7.json) | Worker suite 12/12, including bounded live telemetry aggregation/redaction |
| [3d8cf664](../../../output/trials/3d8cf664-73ed-40a0-95ba-f872d99f0d25.json) | Third-session preview, both eight-task plans validate; zero account calls |
| [7b7b7832](../../../output/trials/7b7b7832-ee36-4c22-badd-331bc03a5a36.json) | Third rental failed with proxy HTTP 404 at arm before model pull/warmup; supervisor confirmed absence, no attention |
| [92357455](../../../output/trials/92357455-02a0-4630-80c0-8af4fc3b15bb.json) | Third rental billing read: zero rows pending, owned Pod 404, account zero pods |
| [e6ffeed4](../../../output/trials/e6ffeed4-a74d-4c1d-ae72-6ae13f7ac824.json) | Six offline arm-reconciliation checks pass, including bounded 404 retry, already-armed/no-repeat, auth refusal and supervisor loss |
| [221f1bdf](../../../output/trials/221f1bdf-a643-41e4-83a7-2a978ad738e9.json) | Final pre-fourth worker suite 12/12, includes authenticated armed-state reconciliation |
| [e09b8cb3](../../../output/trials/e09b8cb3-a28e-4760-b195-7cd4f0bc3903.json) | Repeated exact-plan streaming fixture: 3 checks/16 simulated requests, zero network |
| [dbe27a96](../../../output/trials/dbe27a96-d1a8-496e-8fd4-4bacb8155831.json) | Fourth-session preview: 54,125-byte bundle, both plans prepared, zero account calls; cumulative allocation $9.755 |
| [81b9d646](../../../output/trials/81b9d646-5f93-49bb-8c9d-65774101b128.json) | Third rental's watchdog: deletion/absence confirmed, exit 0, no attention |
| [8b4888f5](../../../output/trials/8b4888f5-2a70-4334-8e6d-0516cfa5db4a.json) | Fourth rental: one warmup + 16 comparison calls, 8/8 technical completions at each concurrency; four length-limited answers; cleanup/absence confirmed |
| [c435327a](../../../output/trials/c435327a-9c5b-4e98-84b6-2ce2ea46c9a5.json) | Fourth watchdog: completion deletion/absence confirmed, no attention, exit 0 |
| [886c1e47](../../../output/trials/886c1e47-974f-470b-901e-f098f3f651b5.json) | Final read-only billing observation: zero rows pending, owned Pod 404, account zero pods |
| [1a9c85fe](../../../output/trials/1a9c85fe-e751-4332-9274-bc557b66bc5a.json) | Read-only derivation of timings/length finishes/telemetry and original-budget totals; input hashes retained; zero network/model calls |
| [26e26cff](../../../output/trials/26e26cff-d02a-4522-ac0a-f479ad5e1868.json) | Final full-suite worker invocation 12/12 |
| [6c4f960f](../../../output/trials/6c4f960f-7750-49ec-8850-f36859303e1c.json) | Final full-suite installed-store invocation 15/15 |
| [8c95dd0d](../../../output/trials/8c95dd0d-b3d7-4c83-ba43-1545609f1637.json) | Final full-suite rental controls 17/17 |

Standing full suites also retain all normal per-invocation UUIDs, including deliberate CLI refusals.
Final application tests, workspace typecheck and build pass. Rental suite expanded from 14 to **17**
cases: after a previously verified lease has a monitoring read failure, attempt cleanup only after a
new successful scope/permission read; refuse changed identity/unreadable state and retain attention.
Four journal fixtures cover Windows EPERM/EACCES/EBUSY bounded retries, exhaustion and immediate
propagation of unrelated errors. No provider/model operation is retried by that filesystem change.
Context-matching patch refusals changed no files; corrected patches were applied.

The earlier final rental invocation [8d547cbd](../../../output/trials/8d547cbd-8bfd-48be-a7e3-b60d86bf15ed.json)
passed 17/17. After the v2/worker expansion, the complete `pnpm test` ran again and passed, including
15 store, 12 worker, 17 rental, 4 persistence, 12 telemetry, 7 HTTPS, 9 combined-harness and 77 web checks.
Workspace typecheck passed; the earlier successful build still covers the unchanged application runtime.
The final application/test source hash is
`d7c9abbc74c25f83783bd90207c117eb2a963c540cbfa0ede66d36e5d92df68a`, on uncommitted base
`965d4c3f13747679391ecd2e1bd362acb4940f2d`. Worker/Python/helper hashes are separately retained in
each session's `worker-inputs.json`; they are outside that application source hash.

## First paid failure and correction

The first model session ran from 19:13:00.715Z to 19:14:20.678Z (22:13 Nairobi). It reached Ollama
0.40.11, pulled the candidate and stopped at `installed-manifest-mismatch`: zero warmups, no model
comparison. Its parent diagnostic `failedStage: catalog` was stale; the worker's exported failure
locates the actual phase. Preserve that original diagnostic rather than rewriting it as a pass.

The runtime's primary source shows a canonical v2 named manifest and a differing legacy downgrade
anchor. The old verifier assumed the latter was the raw pinned manifest. The corrected helper gives
v2 precedence and permits only its final named link to the exact pinned regular manifest blob, with
all parent/blob link checks and every raw size/SHA still enforced. An invalid v2 file cannot fall back
to a valid legacy file. After pulling, the worker checks the frozen manifest blob and locally copies
that digest reference to the test tag before verification. No model/snapshot pin was changed.
See [the storage follow-up and primary references](../../guides/rental-model-integrity.md#ollama-04011-storage-follow-up).

Billing observation returned zero rows immediately after termination, which is pending data, not
evidence of a free rental. Keep the whole first $1.50 reservation. The earlier canary's later reported
charge is $0.006488841492682695, consistent with the observed balance delta, but not a final invoice.

## Subsequent controller failures and corrections

The second trial reached readiness at 19:31:57Z, ran one warmup, reported the exact running digest,
context 4096 and `size_vram == size == 718,578,645` bytes, and returned HTTP 401 without a key. Its
comparison route incorrectly used `region: RO` and zero remote dispatch reservation. Existing policy
rejects both. No comparison requests were sent. The controller now uses `unrestricted` route policy
(physical EU-RO-1 metadata is recorded separately), a one-microdollar dispatch reservation, and checks
both complete plans/prepared contexts before any account call. Hourly rental remains accounted in the
external allocation; the tiny request reservations are additional, not a free-rental claim.

The third trial received HTTP 404 at authenticated arm while diagnostics still reported awaiting-arm.
It did not pull or warm a model. New bounded arm reconciliation checks the same authenticated worker's
explicit armed flag: already armed means no repeat; confirmed awaiting-arm permits at most three
attempts for selected proxy responses. Authentication/failed-worker/supervisor failures refuse retry.
No Pod-create POST is retried, no new Pod is created by arm recovery, and the lease never extends.

The second trial exported a telemetry sample count but no maxima because the collector computes those
only at finalization, after the prior export. Those missing metrics remain unknown. The worker now
derives bounded live maxima/baseline from existing samples before deletion and redacts raw sample/device
identity. The collector/helper is unchanged. These are sampled device metrics, not guaranteed peaks or
independent proof of every layer's placement. Runtime `size` is not the total downloaded weight size.

## Completed fourth rental and observed limits

Command: `pnpm --filter @afribit/api exec tsx ../../output/rented-model-session.mts --execute --followup-4`.
The Pod was observed from **19:37:11.099Z to 19:39:55.753Z** (22:37-22:39 Nairobi), 164.654 seconds
including startup/download/verification/warmup/comparisons/shutdown. A fresh verified supervisor armed
before model work; this run did not need an arm retry. Anonymous `/v1/models` returned 401. The final
watchdog accepted scoped deletion, confirmed absence and exited 0; controller reconciliation also
confirmed absence, and the subsequent account read found zero Pods. No production service changed.

One RTX 4090, secure EU-RO-1, reported CUDA 13.2, driver **595.91.07**, 24,564 MiB device VRAM and
20 GB disposable disk. The provider API's `gpu.memory: 61` is allocated host RAM, not 61 GB GPU VRAM.
Same E4B Q4 manifest, Ollama 0.40.11, context **4096**, temperature **0**, maximum **300** output tokens,
thinking disabled, repetitions one. The byte verifier read **6,583,656,505** referenced bytes and
passed the unchanged `dc35e8d9...` manifest through `v2-pinned-blob-link` storage.

| One GPU / request concurrency | Technical completions | First-content median (range) | Full-response median (range) | Length finishes |
|---|---:|---|---|---:|
| 1 | 8/8 | 0.816 s (0.466-12.071) | 1.244 s (0.734-13.035) | 2 |
| 4 | 8/8 | 0.939 s (0.685-2.236) | 3.671 s (0.741-7.333) | 2 |

Each row is four questions with bare/supplied-context variants, not eight independent community tasks.
Order was always one then four, with no prefix-cache reset. Eight observations per row are insufficient
for a capacity guarantee or a causal concurrency-speed comparison; the first request was particularly
slow. This trial compares concurrency on one GPU, not different GPU types. Operator artifacts:
[concurrency 1](../../../output/rented-model/8b4888f5-2a70-4334-8e6d-0516cfa5db4a/comparison-c1/269ced2b-ecea-4a36-844f-a9c87b10022c/operator.json),
[concurrency 4](../../../output/rented-model/8b4888f5-2a70-4334-8e6d-0516cfa5db4a/comparison-c4/a8c0ba2f-a339-48ba-b371-914197577345/operator.json).
Each directory also contains a separate anonymous `blind-review.json`; no human scores are filled in.

The gate counted **16 requests, 25,404 input tokens, 1,384 output tokens**, no gate refusals. Two supplied
variants in each row ended with `finishReason: length`: the Sheng introduction and missing-trainer
case. The retained response shows **4,089 prompt + 7 completion = 4,096 total tokens**, filling the
configured context. Those four answers are incomplete despite successful transport. This is direct
evidence that this prompt/context configuration is inadequate; it is not a Sheng-quality pass. The next
comparison needs token-aware prompt/output headroom, a shorter prompt or a larger validated context.
Keep the failed recipe rather than silently changing settings and calling this run a quality pass.

The fictional English desk case refused to invent details without a passage and answered Tuesday
14:00-16:00/free with the supplied passage. That demonstrates supplied-context use in this case,
not retrieval selection, memory authorization, training or reliability across communities. Sheng
naturalness and safety still require native review. No default model was changed.

Final exported telemetry contains **76 samples over 77.35 seconds**, zero observed sampling failures,
baseline **1 MiB**, sampled maxima **5,568 MiB (5.44 GiB)** / **91% utilization** / **227.91 W**. It is a
live pre-termination snapshot (`finalized: false`), not a finalized complete trace or guaranteed peak.
Ollama reported matching running digest and `size_vram == size == 718,578,645` bytes; that runtime
allocation counter is distinct from total weight bytes and NVIDIA device memory. Do not infer that
6.58 GB of downloaded files equals VRAM use or claim independent layer-by-layer residency attestation.

The final rental's rate-times-observed-duration arithmetic is **$0.04070613 compute only**. It is not
an invoice, all-in cost, minimum billing rule or total for all four trials. Billing returned HTTP 200
with zero records at the final observation, so **actual model-rental bills remain unknown**. The local
provider's per-response `estimatedCostUsd: 0` represents no token tariff; it does not mean free compute.

## Actual worker boundaries

[F-027](../../features/F-027-authenticated-rental-worker.md) uses the existing gate and pinned upstream
Ollama image, with Ubuntu Python packages and a checksum-pinned Node binary installed inside the Pod.
Actual observed versions so far: Node **v22.23.4**, Python **3.12.3**, Ollama **0.40.11**. OS package
versions are recorded, not pre-pinned as a reproducible custom image. No image was published.

Ollama listens on loopback only; the Pod exposes the authenticated gate at one HTTPS proxy port.
The startup payload contains only a fresh test-key hash. The bearer stays in controller memory; the
account RunPod/OpenRouter keys are not sent in the payload. Diagnostics select explicit fields; there
is no arbitrary file/env/log endpoint. No private learner/community data is used, and this ordinary
rental is not a TEE or protection from its host operator.

Model startup requires a one-time authenticated arm after the separate local watchdog's identity
check. The worker must verify frozen model bytes, warm up, match the running digest/full GPU placement
and collect telemetry before allowing generation. It also has an absolute self-stop deadline using
the vendor pod-scoped key, but that inner stop is not yet qualified and does not remove disk billing.
The external supervisor plus controller reconciliation own scoped termination/absence. A local
supervisor process is separate from inference; loss of the entire local host is still a limitation.

## Budget

Retain **$1.505 prior request allowances + $0.25 canary + four $1.50 model rentals + $2 held aside = $9.755**
within the original $10; **$0.245 unallocated** before the additional 16 microdollar dispatch reservations.
No allowance is refunded/reset on failure. Model
rental billing is unknown/null. Earlier known hosted-model charges are $0.00423240 and canary reported
charge $0.006488841492682695; these are not additional allocations on top of their reserved envelopes.

The intended comparison is the same verified model/settings on one GPU, one versus four concurrent
requests, using the existing four-question synthetic bare/supplied-passage runner. It is not the
community-written E-002 benchmark or proof of actual retrieval/account memory in that run. Human
language review, a second GPU comparison, Mesh and confidential processing remain separate work.

After the 16 extra dispatch reservations, total held/allocated is **$9.755016**, leaving **$0.244984**
unallocated. The $2 held aside remains untouched. No further $1.50 rental fits this envelope without
a new spending decision; do not reset files or reclassify missing bills as refunds. All four model
sessions are now absent; there is no ongoing rental from this pass.
