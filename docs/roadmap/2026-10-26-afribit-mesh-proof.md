# Afribit Mesh: roadmap to prove community-controlled AI

**6 November update:** the first green learner-entry/onboarding and personal text-notebook slice
is built locally using Open Notebook behind Afribit's account/community controls. The real source
lifecycle passes ten synthetic-account checks; inference is a fixture, not a model-quality result.
Private source chat stays local-only and retains the selected community language guidance. See
[F-034](../features/F-034-education-entry-and-private-notebooks.md) and
[all trials](../evaluation/trials/2026-11-06-green-education-notebooks.md). Next: qualify real-model
source-grounding/teaching and adult learner testing, then durable online hosting. Passkey-protected
vaults, full-book retrieval, staff AI Studio and community-site equipment remain pending. This adds
no HRF score, attestation, production or new offline claim.

**Created:** 26 October 2026. **Status:** P0/P1/P2/P3 in progress; authorization, membership, memory and first processing-policy slices built and tested locally, not deployed.
**Planning owner:** Edmund. Engineering work follows this repository's feature-spec and review process;
community reviewers and custodians still need to be appointed. Dates below are intentionally replaced by
dependencies and exit tests, because hardware, reviewer availability and provider access are unconfirmed.

## Outcome

Demonstrate that a community can keep its knowledge and members' personal context on a community-controlled
computer, answer useful questions locally, and use Afribit to access larger models on shared compute.
Start with rented compute and synthetic data. Later, add verified confidential processing and demonstrate
that the compute provider can change without migrating the community's knowledge or accounts.

The first use case remains Bitcoin education in Sheng, Kiswahili and English. Schools and hospitals are
possible future deployments of the same patterns, not claims of current institutional or clinical readiness.

This roadmap translates the [compute research](../research/2026-10-25-private-community-compute.md),
[models and memory research](../research/2026-10-25-models-memory-training-and-precedents.md), and subsequent
discussion into an execution sequence. It adds a proof track to the [product roadmap](../../ROADMAP.md),
building on existing work rather than replacing its recorded history.

## What has changed in priority

| Earlier emphasis | Execution priority for this proof track |
|---|---|
| Obtain a Kenyan GPU before a managed pilot | Demonstrate the workflow first with rented GPUs and synthetic profiles; retain the existing location restriction for real learner traffic |
| Personal memory is a later feature | Establish account authorization first, then demonstrate private, opt-in memory |
| Fine-tuning is a major research destination | Select a baseline and evaluate prompting plus RAG first; train only against a measured gap |
| Confidential compute is a later research item | Design the provider interface and privacy labels now; require separate verification before claiming confidentiality from the host |
| Members never pay per question | Afribit sells community capacity; communities may choose their own member-access and pricing arrangements |

The last row records the direction agreed in discussion. Existing deployed billing behavior is unchanged.
Contracts, public pricing and related policy documents must be reconciled before any paid launch. Likewise,
the original blanket wording that data never leaves the box must distinguish local storage from passages
and questions sent for remote processing.

## Evidence already available

These are repository records, not new measurements or proof that this complete system already works.

| Building block | Recorded evidence | Remaining work |
|---|---|---|
| Local node, local embeddings and remote model interface | [ADR 0016](../adr/0016-afribit-local-community-box.md), [F-006](../features/F-006-afribit-gpu-server.md) | Reproduce on the current code and intended community hardware |
| Rented GPU model comparison | [E-001](../features/E-001-gemma4-and-gpu.md), 8 October | Replace the small internal, AI-judged comparison with community-written, blind-reviewed evidence |
| Community gateway, keys and quotas | [GPU deployment kit](../../deploy/gpu-server/README.md) | Exercise authenticated routing and rejection paths in the new showcase; an obscure URL is not access control |
| Reviewed knowledge and language contributions | [Feature register](../features/README.md), F-003/F-004 | Verify scoped publication and prevent personal content from entering shared knowledge automatically |
| Retention and conversation deletion | [F-002](../features/F-002-privacy-settings.md) | Strengthen owner authorization across conversation operations before private memory |

In particular, some current operations use possession of a session ID as permission. Separate database
rows and unpredictable IDs are not the proposed account-private authorization boundary.

## Proof levels and permitted claims

| Proof | Evidence needed | What it does not establish |
|---|---|---|
| Functional showcase | Local retrieval, private account contexts, remote inference, outage behavior and measured costs | Protection from a privileged infrastructure operator |
| Governed administration | Backend-enforced 4-of-7 approval for defined privileged operations, scoped execution and auditable expiry | That four custodians, root access or physical access can never expose data |
| Language adaptation | Held-out human comparison of baseline, RAG and any adapter | General Sheng mastery or training privacy |
| Confidential remote processing | Verified CPU/GPU environment, approved workload and an encrypted connection bound to that verification | Anonymity, perfect security, correct answers or automatic regulatory compliance |
| Sustainable service | Actual workload, recurring costs, support effort and willingness-to-pay evidence | Profitability inferred from a short GPU benchmark |

Ordinary RunPod is suitable for the synthetic functional showcase. TLS, WireGuard, Tailscale, no prompt
logging, a provider's security label, or owning an ordinary GPU do not independently establish a TEE.
The showcase must identify which proof level each endpoint actually meets.

## Now / Next / Later

**Source-grounded learning and online-first pilot,6 November:** Edmund reports a community need
for simpler Bitcoin teaching in small steps, familiar examples and self-paced learning. The
[education milestone](../program/bitcoin-education-pilot-2026-11.md) now starts with Bitcoin101,
Edmund as operator/language editor and the home Proxmox server as an unverified candidate host.
Community-site offline equipment is a funding need. A product/role/screen brief was prepared
locally under `internal/frontend/`; supplied references and a learner/AI Studio concept now follow it.
Trainers curate the AI's sources, language and answer tests; learners use educational chat with
optional guided study. Education is active in the proposed focus selector; Work/Development deferred.
[Harness research](../research/2026-11-06-education-harness-options.md) recommends evaluating source
components without replacing Afribit's account/privacy boundary. A decorative intro clip was generated
for $0.12 under a separately approved $1 cap; original showcase reservations unchanged. No production UI changed.
Course sequencing, saved progress, coherent staff workspaces and source-document UX are proposed
work beyond the current chat/card/voice/review tools. The internal scorecard's delivery scope
was revised before scoring; historical test results are unchanged. No online launch or education outcome claimed.

**Education case study and internal90% target, 6 November:** Edmund selected existing Afribit
adult Bitcoin learners/merchants as the first audience and wants at least90% readiness before
applying. [Next milestone](../program/bitcoin-education-pilot-2026-11.md) starts with task/threat
validation, then reviewed content, a qualified persistent local service and a supervised pilot.
[Proposed20-criterion scorecard](../evaluation/hrf-application-readiness-scorecard.md) requires
at least90/100 plus hard gates; no current score or HRF acceptance probability is claimed.
Reuse learner chat; member messaging is a separate E2EE/device-fit workstream, without automatic
AI access. No pilot run, public release, new model spend or messenger deployment in this planning pass.

**HRF application readiness review, 6 November:** before further implementation,
[published criteria and evidence-gap assessment](../research/2026-11-06-hrf-grant-readiness.md)
identify the AI for Individual Rights Fund as the strongest apparent route, conditional on a
concrete human-rights pilot. First prepare mission/beneficiary evidence, a sanitized reproducible
release, itemized annual/request budget, two willing references and prospective success measures.
HRF publishes no technical certification or required TEE/4-of-7/PWA score. Our production privacy,
restore, language and capacity gates remain engineering responsibilities; unfinished work may be
proposed as funded milestones. No application/contact, product change or paid run occurred in this review.

**Isolated network test reopened, 6 November:** a separate Huawei test router avoids a household
outage. [Fresh Ethernet session and phone observation](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md)
record six readiness checks and Edmund's phone loading the app while the external page fails,
mobile data off, followed by A1 sign-in and the expected approved local answer under requested
unchanged conditions. A1 note refresh and A2 own note/history only are now also user-confirmed.
A clear no-card response is also confirmed. Note operation clarified as editing an existing note,
consistent with4 final rows. Node closed14:03 Nairobi, listener absent,0 model/egress attempts.
Restart persistence and known-ID phone attacks are untested. Computer retained separate Wi-Fi;
full box uplink loss, remote recovery, local naming and PWA installation remain distinct unproved
steps. Next: local naming/trusted HTTPS and PWA verification. No new compute spend/router changes.

**Household outage test deferred, 29 October:** Edmund needs uninterrupted internet. Model reported
HuaweiHG8145V6; no router/WAN change. [Phone checkpoint and graceful node closure](../evaluation/trials/2026-10-29-outage-deferred-session-close.md)
saved, active test service stopped. No new date/reminder or paid compute. Resume physical outage
later in an agreed window/separate network with a fresh session; P5 remains partial. Language/model
and other authorized development can progress independently of this deferred network subtest.

**Phone separation checkpoint, 29 October:** Edmund confirms B1's own community facts/notes with
no A1 history, then A2's own note with no A1 conversation inside CommunityA. [Partial phone
evidence](../evaluation/trials/2026-10-29-member-lan-retry.md) records3 user-observed checks including
login/local answer. Physical internet-uplink loss remains pending; models disabled and no new spend.
P5 remains in progress, without a host-blind privacy or complete security claim.

**Physical phone local-answer confirmation, 29 October:** Edmund confirms iPhone A1 sign-in and
Tuesday2-4pm/free approved card after the expired-node retry. [Evidence](../evaluation/trials/2026-10-29-member-lan-retry.md).
This advances P5's actual phone/local API journey; phone account isolation and physical uplink-loss
remain open. Models disabled, no new inference or spending; P5 is not complete.

**Running member node, 28 October:** [F-033 phone guide](../guides/running-member-lan-node.md)
provides real app/API on existing Wi-Fi, two fictional communities/four accounts and local approved
answers with models disabled.9 API checks and desktop browser sign-in/cards/scoped-note journey pass;
plain-HTTP UUID startup bug fixed and tested, final full checks pass. QA node closed cleanly, fresh
bounded node left for the iPhone. Physical phone sign-in/chat and uplink-loss awaiting user observation;
no new paid compute or language candidate activation. P5 is in progress, not complete.

**Scoped language iteration prepared, 28 October:** [F-032](../guides/community-language-iteration.md)
adds an isolated draft candidate using existing pack fields,8 engineering development probes and
13/13 offline checks.15 compact prompt previews fit8192 with300 reserved output tokens; full/
compact/serve scope and unchanged safety/facts verified. Draft recipe/protocol and source/log hashes
frozen; full tests/typecheck/build pass. No community sign-off, held-out evaluation, generated answers
or new paid compute. Next is community approval of the concrete guide/protocol, fresh held-out
questions and a reconciled funded comparison. Physical AI-chat/uplink-loss remains separate.

**Human-review collection complete, 28 October:** [three validated returns](../evaluation/trials/2026-10-28-three-reviewer-findings.md)
provide12 judgments of4 live outputs/3 unique texts: naturalness3.67/5,5/12 accepted as written,
1 fully correct/11 mostly correct,0 risky flags. Keep baseline language/usefulness held for refinement;
no formal release threshold was pre-registered. Next: community approval of scoped wording/time
guidance, task-completeness fixes, fresh held-out evaluation and the separate physical AI-chat/
uplink-loss test. Phone review-page access confirmed; no app/prompt/model change or new paid work.
This supersedes earlier unassigned/pending reviewer counts; earlier measurements remain historical.

**Acceptance preparation, 28 October:** [F-031](../evaluation/trials/2026-10-28-review-and-network-acceptance.md)
passes28 integrated checks, including real loopback member HTTP during compute socket loss/recovery,
and exports future request/message measurements. Three independent human-review copies with approved
fictional references and blank scores are ready. [Phone/LAN procedure](../guides/member-lan-acceptance.md)
and unfilled evidence are ready; Edmund deferred the physical test. No human review/phone acceptance
or new paid inference. Full tests/typecheck/build pass. P4 remains in progress; P5 has software
preparation only, with an isolated running synthetic node and physical observations still required.
F-030's later reported charge is $.043415188789367676, invoice unconfirmed; latest observation0 Pods.
Held/allocated$9.995020 and $.004980 unallocated remain unchanged. Next: assign independent native
reviewers, collect their original reviews, then run the physical kit when devices/operators are ready.
The paragraphs below retain their historical run/preparation context.

**Actual combined flow, 28 October:** [F-030](../evaluation/trials/2026-10-28-community-live-rental.md)
completed4 real sequential normal-API answers for two fictional communities/four accounts with
actual local lexical retrieval, permitted memory and a pinned8192-context rental. All requests passed
synthetic egress scoping and complete-answer checks; termination/absence confirmed. This joins the
previously separate functional pieces. Human review/usefulness, per-request latency export, real
member-device/Mesh/local-hardware qualification and TEE remain open. A$.24 ten-minute allocation fit
the existing unallocated balance; no earlier allowance refunded. Held/allocated$9.995020, $.004980
unallocated; new bill pending. No additional rental fits without a reconciled spending decision.
P4 stays in progress; next focus is human evaluation and the real LAN/uplink-loss demonstration.

**Integrated preparation, 28 October:** [F-029](../guides/community-rental-live-run.md) now passes27
offline checks joining the normal API/SQL retrieval/private accounts/memory to the worker gate/native
adapter. Explicit scoped context8192 admission and interrupted-generation behavior are exercised;
remote native answers carry accurate location labels. A bounded four-request live hook and compiled
worker bundle are ready for a funded controller, with fresh lease/worker qualification, source/lease
fingerprints and cancellation. No real8192 GPU/model, Mesh or TEE proof. Next: admit a reviewed rental
allocation, qualify a fresh worker, run the four-account live subset and have people review outputs.
The earlier $9.755016 allocation remains held; no new paid run was launched. P4 stays in progress.

**28 October P4 follow-up:** [F-028](../guides/showcase-context-headroom.md) adds context headroom
before dispatch, explicit compact/full showcase recipes and failed/incomplete classification for
length finishes. Compact8192 passes offline preparation only; native human review, exact-tokenizer/
template qualification and a funded model rerun remain open. Four model-session reported charges
now total $0.124184007 (final invoice unconfirmed), with no reservation refund or new paid work.
See [all trials](../evaluation/trials/2026-10-28-context-headroom.md). P4 remains in progress.

**Current P4 update, 27 October:** [F-027's rented worker](../guides/rented-model-worker.md) completed
16 technical requests on one RTX 4090 at concurrency one/four, exact model files verified, authenticated
gate, separate supervision and confirmed termination/absence. Three failed model-session attempts and
all previews/fixtures are retained in the [actual report](../evaluation/trials/2026-10-27-rented-model-worker.md).
Four outputs filled context4096 and ended early, so this recipe is held; native blind review, token
headroom correction, measured invoices and second-GPU evidence remain open. The fixed order/cache
limits prevent a causal concurrency-speed claim. Actual database retrieval/account memory is covered
by F-023 separately; it was not part of this supplied-context comparison. $9.755016 of the original
$10 is held/allocated including untouched $2 held aside; $.244984 is unallocated, model bills pending.
No current paid Pod, model-default approval, fine-tuning, Mesh or TEE proof. **P4 remains in progress.**
The earlier incremental status paragraphs below retain their original preparation context.

P0 and P1 are **In Progress** through [F-014](../features/F-014-private-conversation-access.md) and
[F-015](../features/F-015-community-membership-and-learner-accounts.md). P2 is **In Progress** through
[F-011](../features/F-011-personal-memory.md) and [F-016](../features/F-016-memory-knowledge-promotion.md);
P3 is **In Progress** through [F-017](../features/F-017-processing-policy-and-reviewed-answers.md): early
processing policy, approved-card answers, concurrency/egress and outage checks. P4 is **In Progress**
through F-019's locally tested tooling; no paid model comparison has run. P5–P9 are **Not Started**.
F-018 adds API route allowlists, conservative daily dispatch allowances, bounded contexts and cancellation.
F-019 adds the dry-run-first evaluation runner and persistent experiment allowance. Upstream bill ceilings,
regional/tokenizer conformance, rental shutdown and actual model comparisons remain separate gates.
F-020 adds durable per-trial documentation and a scoped rental watchdog tested on localhost. Actual
RunPod behavior, independent supervision, reconciled invoices and paid comparisons remain unverified.
F-021 adds task-aware model discovery and exact public artifact metadata, including the QVAC review;
no runtime/weights/inference are installed or tested by that metadata trial.
F-022 subsequently ran eight real synthetic requests on the laptop CPU on 27 October. The execution
path worked, but the 0.8B checkpoint/recipe is held for language/safety failures; see the
[actual trial](../evaluation/trials/2026-10-27-local-cpu.md). P4 remains in progress, with no learner release.
Account ownership, guest capabilities, learner UX and community enrollment are built/tested locally, not
deployed. Opt-in notes and reviewed snapshot sharing are implemented; private-document/team ACLs and
backup erasure replay/restore validation remain pending. An earlier recorded component is an input, not a
completed milestone. Effort is relative: S is a focused change, M spans several components, L needs substantial
integration or external participation. These are scope indicators, not delivery-date commitments.

| ID | Window | Milestone and exit test | Depends on | Lead role / effort |
|---|---|---|---|---|
| P0 | Now | Proof contract: fixed demo scope, threat boundaries, data fixtures, evaluation protocol and feature specs | Existing research | Edmund + engineering / S |
| P1 | Now | Account and community authorization: another account's IDs never grant access to private resources | P0 | Engineering / M |
| P2 | Now | Personal memory and approved knowledge: private memory is inspectable/deletable; sharing requires explicit promotion | P1 | Engineering + reviewers / M |
| P3 | Now | Local retrieval and routing: local-only material never reaches remote providers, including on failure | P1, P2 | Engineering / M |
| P4 | Next | Model selection and rented compute: authenticated end-to-end runs, blind evaluation and a measured rental bill | P0, P3; reviewers and rental access | Engineering + reviewers / M |
| P5 | Next | Mesh showcase: member access over a local network, uplink-loss behavior and reproducible evidence | P4; representative local equipment | Engineering + community operator / M |
| P6 | Next | Governed administration: four distinct approvals authorize a defined, expiring operation; three cannot | P1, P2; seven independent custodians for a real deployment | Engineering + custodians / L |
| P7 | Later, conditional | Adapter training: reproducible run and held-out comparison; deploy only if it helps without unacceptable regressions | P4; licensed, consented data and separate evaluation split | Engineering + reviewers / M |
| P8 | Later, independently funded | Confidential provider: verify the workload and reject invalid or stale evidence before releasing content | P3, P4; a supported provider and quote | Engineering + independent security reviewer / L |
| P9 | Later | Community pilot and business evidence: restore, capacity, recurring costs and paid demand evaluated | P5, P6; P8 for host-confidential claims | Edmund + community operator / L |

**Functional showcase v1:** P0–P5. **Governed showcase:** add P6. P7 is optional and does not block a
useful RAG product. P8 has its own privacy acceptance gate and can be investigated before buying hardware;
the ordering above does not make hardware ownership or successful fine-tuning a prerequisite.

## P0 — Agree what the demonstration must prove

- [ ] Record the current revision, environment, existing checks and reproducible baseline. Label any
  historical result that is not reproduced.
- [ ] Prepare two fictional communities and at least two fictional members per community, with deliberately
  distinct personal facts, shared educational documents and restricted test documents. Use no patient,
  child, learner or other real confidential records.
- [ ] Write a context-permission matrix covering read, write, retrieval, continuation, feedback, export,
  deletion, review and administration. Define authenticated members and a separate revocable guest
  capability if guest conversations are retained. Do not use the conversation ID itself as that capability.
- [ ] Record trust in the community host/OS, custodians, Afribit application, network and remote provider.
  Backend account isolation does not protect against an unrestricted administrator of the same host.
- [ ] Define the benchmark's answer-length limit, context size, concurrency, hardware and acceptable response
  time before measurements. Record missing human-review resources explicitly.
- [ ] Write feature specifications before each code change, using the existing feature register and
  acceptance process. First specification: account/community authorization and private-context boundaries.

**Exit:** a runnable-test plan and an agreed implementation scope exist, with no implication that a paper
design has already passed its tests.

## P1–P2 — Keep members private and publish knowledge deliberately

- [ ] Establish identity and community membership on the server. Enforce owner/resource permissions on
  stored conversations, continuation, streaming, attachments, preferences, memory, feedback, exports and
  deletion; ignore client-supplied ownership claims. Define safe handling of existing ownerless sessions.
- [ ] Apply the same scope to vector retrieval, summaries, caches and background jobs. Reject unauthorized
  documents before they enter an LLM context. Verify no-storage mode and submitted history cannot bypass
  the server's authorization or publication rules.
- [ ] Make personal memory opt-in, visible, editable and deletable, with a documented backup-retention and
  restore policy. Deletion must cover derived search entries and summaries, not just the original row.
- [ ] Keep personal, restricted-team, approved-community and optional cross-community knowledge separate.
  A leader or reviewer role must not automatically grant access to private conversations.
- [x] Demonstrate explicit submission, review, publication and withdrawal locally with synthetic snapshots (F-016). Consent to chat, retention,
  RAG use, cross-community sharing and training are separate permissions.
- [ ] Run negative tests with known valid IDs belonging to another account and community, including
  unauthorized read, append, export, feedback mutation and delete. Check concurrent requests and caches
  for context mixing. Inspect logs for accidental content disclosure.

**Exit:** each member retrieves only permitted information; unapproved personal data never becomes shared
knowledge. Tests must exercise backend behavior, not only hidden frontend controls.

## P3 — The local waiter and the remote-processing boundary

**Combined proof, 27 October:** [F-023](../features/F-023-community-harness-proof.md) now exercises nine
local API integration checks across two communities/four members, including actual lexical retrieval,
memory/history scope, unauthorized IDs, deletion, reviewed-only and local-only outage behavior. Real
hosted API acceptance is partial: three model answers, one HTTP 429 reviewed fallback. This does not
complete arbitrary document/team permissions, production deployment, vector search, Mesh or P4 quality
acceptance. [Actual trial](../evaluation/trials/2026-10-27-community-harness.md).

- [x] Reuse local embeddings and approved-card retrieval. Offer reviewed text without generation where
  that answers the task; a local LLM is not mandatory for every request.
- [ ] Compare a small local assistant against deterministic routing. Treat model-produced routing advice
  as input to a backend policy, never as permission to access a document or provider.
- [ ] Attach local-only/remote-allowed and audience permissions to relevant resources. Construct the remote
  request only from authorized, remote-permitted content, with minimal history and bounded output/context.
  If the question itself is local-only, do not send it for remote classification.
- [x] Enforce application provider/model/endpoint/region-route and allowance policy for primary calls and
  fallbacks (F-018, local tests). Verify real provider billing/residency separately before paid use.
  Local-only requests remain local when the GPU is busy, unavailable or replaced. Do not silently choose a
  weaker privacy class to meet a latency target.
- [ ] Show an accurate processing-location/privacy label. Local storage does not imply selected passages
  never leave the box. Transport encryption does not imply the endpoint operator cannot read the request.
- [ ] Test prompt injection in retrieved material, disallowed escalation, provider failure and quota
  exhaustion. Measure the remote-request fraction instead of assuming a cost-saving percentage.

**Exit:** a captured synthetic request trace matches the permission matrix, and forbidden egress is absent
on all tested paths. This is evidence for tested paths, not proof against every possible disclosure.

## P4–P5 — Rented compute, model discovery and the Mesh showcase

**27 October direction and evidence:** prioritize hosted model qualification and rented GPU measurements
over more laptop downloads. [Real OpenRouter trials](../evaluation/trials/2026-10-27-hosted-comparison.md)
now include an 8/8 Gemma 3 27B follow-up; the initial comparison was incomplete and Claude's pinned
route failed ZDR policy. Context helped fictional facts, but model quality remains held for human review.
Known reported charges/account increment $0.00247344; no rental or training. The internal synthetic
fixture is not E-002. Retain the earlier Gemma 4 shortlist for qualification, rather than inferring a
model switch from this first available hosted route. Next isolate language guidance from knowledge,
exercise actual authorized retrieval, then verify a short rental's quote/serving/shutdown configuration.
See the [QVAC/harness clarification](../research/2026-10-27-hosted-compute-and-community-harness.md).

**Lifecycle readiness follow-up:** [two RunPod read-only checks](../evaluation/trials/2026-10-27-runpod-readiness.md)
hit control-plane connection timeouts. No rental was launched. The report scopes the next disposable
GPU serving test and preserves shared-budget allowances; live cleanup conformance, supervision and
actual billing remain open. F-023's normal API probe has three hosted model answers and one reviewed
fallback, with model quality held. The next rental is a capacity/serving experiment, not learner release.

**Measurement tooling follow-up:** [F-024](../features/F-024-rented-gpu-telemetry.md) supplies a portable
sampled VRAM/utilization/power recorder with 12 fixture checks. It has not run on a real GPU or measured
the pending rental. [Network controls](../evaluation/trials/2026-10-27-rental-preparation.md) show the
tested RunPod paths time out while OpenRouter/GitHub respond. Live lifecycle access/cleanup and the
GPU experiment remain open; the tool does not replace rental shutdown or the final bill.

**Account/access follow-up:** [GraphQL validated current credentials/account](../evaluation/trials/2026-10-27-runpod-access-followup.md)
and native HTTPS reached one verified REST response. Access remains intermittent; no rental launched.
F-025 adds optional explicit compatibility transport with 7 fixtures, preserving default fetch and all
cleanup scope gates. This is not live create/delete conformance or a demonstrated reliable network fix.

**Artifact follow-up:** [F-026](../features/F-026-rental-model-integrity.md) freezes both existing Gemma
candidate manifests and supplies an offline installed-store verifier with 11 fixture checks. Runtime
image digests are publisher-reported only; no weight/layer downloads or real GPU verification occurred.
The [rental guide](../guides/rental-model-integrity.md) proposes E4B first, a $1.50 all-in first-session
planning ceiling and a 30-minute lifetime including setup/cleanup within the original $10. Reliable
provider control, quote, authenticated worker and independent cleanup still gate launch. P4 stays open.

**First live lifecycle follow-up:** the [current-proof canary](../evaluation/trials/2026-10-27-runpod-lifecycle-canary.md)
provisioned one secure RTX 4090 at $0.89/hour. A timed-out create was recovered by unique name without
another POST; scoped deletion and absence were confirmed. The trial remains failed, with cleanup
successful and billed cost pending. Retain its $0.25 allowance. No model ran; the standing watchdog,
independent supervision, authenticated worker and GPU measurements remain unqualified. Ineffective
provider timer flags were removed upstream and cannot replace cleanup. Continue on the existing
connection as requested; CLI/HTTP2 success does not establish a permanent network fix.

Start with the recorded Gemma 4 E4B and 26B-A4B candidates. Compare at most two models in the first rental.
Sunbird's Sunflower models and other candidates remain follow-up hypotheses, subject to current license,
runtime and language checks. No model's Swahili coverage alone establishes good Sheng.
The [QVAC assessment](../research/2026-10-26-qvac-and-afribit-fit.md) adds translation/runtime hypotheses;
the [discovery guide](../guides/model-discovery.md) records exact artifacts without replacing the baseline
shortlist or approving research checkpoints for chat. Native RPC privacy needs separate controls.

- [ ] Reuse the existing provider abstraction and GPU gate. Require authentication for reachable inference
  endpoints, keep provider credentials off member devices, and verify per-community quotas and revocation.
  A random public endpoint URL is insufficient protection.
- [ ] Use a small manually approved provider registry: model/version, region, endpoint, price basis,
  privacy class and health. Choose latency/cost only within eligible entries. An open marketplace is outside
  this showcase. Demonstrate an endpoint switch without moving community knowledge.
- [ ] Freeze the community-written [E-002 benchmark](../features/E-002-community-benchmark.md) before using it.
  Compare the same model with a fair task instruction, then prompting plus RAG; hold settings constant.
  Use blind human scoring for correctness, safety, natural language and usefulness. Report ties and
  disagreements. Without reviewers, label results preliminary rather than claiming community validation.
- [ ] Measure local and remote stages, first-token and full-answer times, failures, token use, peak memory
  and total costs. Exercise one user and four concurrent synthetic users, recording raw runs and sample
  counts; do not publish a meaningful p95 from a handful of observations.
- [ ] Test the local assistant on representative affordable CPU hardware if available. Record specifications,
  memory, power where measurable and response time. A small model running on a rented GPU does not prove
  acceptable CPU performance or establish the final community-box specification.
- [ ] Connect a member device to the community LAN/Wi-Fi with its own mobile data disabled. With hub backhaul,
  demonstrate remote generation; remove the hub uplink and demonstrate local retrieval/cards and any local
  generation the hardware actually supports. Reconnect and recover without duplicate jobs or lost scopes.
  LAN access is not proof of a deployed multi-hop Mesh: label a simulated or single-hop setup accurately.
- [ ] Confirm the model port is not publicly reachable outside the intended authenticated gateway. Tailscale
  or WireGuard provides private connectivity, not internet backhaul or sufficient application authorization.

**Exit:** publish a reproducible synthetic showcase, blind-review results when available, actual hardware
requirements, outage behavior and the rental receipt. Mark quality, concurrency or local-model tests that
failed or could not be completed. The ordinary rental remains a trusted-host demonstration.

### First rental budget

**Proposed total maximum: USD 10 for the first experiment, not the whole roadmap.** No rental, download or
training run is authorized by creating this document. Check the actual quote and experiment scope before
starting paid resources. Prefer inference and the complete workflow over adding an inconclusive training run.

Plan up to $8 in expected compute/storage charges, leaving $2 for shutdown delay, billing variance and
applicable charges. If the quote cannot fit, reduce models/run count or defer the rental. Do not assume the
8 October prices still apply. Count model startup/download time, retained volumes and failed attempts.
Use a time/cost watchdog and cleanup on success or failure; verify resource and storage termination and
reconcile the final incremental bill. A watchdog is a safeguard, not a provider-guaranteed spending cap.
Reviewer compensation, connectivity, community equipment, later training and confidential rentals need
separate budgets; they are not silently included in these $10.

The existing restriction in [ADR 0016](../adr/0016-afribit-local-community-box.md) remains: foreign rentals
receive only synthetic/approved public test inputs, never real learner conversations. A different real-data
deployment requires an explicit policy decision and review of its actual processing arrangements.

## P6 — Demonstrate 4-of-7 community administration

- [ ] Define protected actions: maintenance, sensitive export, restore, software update and routing-policy
  changes. Ordinary member questions do not require four votes. Approvals specify action, target, purpose,
  time limit and the exact operation/version being authorized.
- [ ] Evaluate maintained multiparty approval/key-custody building blocks. Do not invent a cryptographic
  scheme or confuse threshold unsealing with authorization of every running application operation.
- [ ] Enforce four distinct custodian approvals on the backend; reject duplicate, expired, revoked and
  replayed approvals. Give the approved session only the required capability, with automatic expiry.
- [ ] Send signed, content-minimized audit records to custodian-controlled destinations. Verify that
  approval, execution, refusal and expiry are observable without publishing members' private conversations.
- [ ] Demonstrate three approvals failing and four succeeding, expiry, revocation and a recovery/restore
  drill. Test with seven separate test identities first; that does not establish seven independent people.
- [ ] Document SSH, root, database, backup, physical-access and update paths. Close bypasses where practical
  and state remaining trusted powers. A frontend voting screen alone is not governed administration, and
  four votes do not automatically authorize access to every member's private data.

**Exit:** a specific privileged operation is demonstrably governed end to end. Stronger claims about a
host administrator require a corresponding isolation design and independent review.

## P7 — Train only if a measured gap warrants it

- [ ] Select a gap from P4: for example code-switching, response length or a repeatable task format. Keep
  changing facts in reviewed RAG knowledge rather than routinely retraining for document updates.
- [ ] Prepare licensed, explicitly training-consented examples and a separate held-out set. Keep private
  conversations and the evaluation set out of shared training. Review any proprietary teacher-output terms
  before using them; independently authored community examples are the starting point.
- [ ] Select a supported small base model, training runtime and adapter method; estimate actual memory/time
  and obtain a separate bounded budget. Inference fit does not establish training fit.
- [ ] Compare baseline prompting, prompting plus RAG, and adapter plus the same RAG. Record recipe, dataset
  provenance, seed, model/version, costs and human results. Test safety and unwanted memorization.
- [ ] Keep adapters scoped to their licensed/consented audience. Explain that deleting a training row does
  not remove its influence from already distributed weights; define withdrawal/retraining limits beforehand.
- [ ] Release an adapter only if reviewers accept its measured benefit; otherwise retain the baseline and
  publish the negative finding. Demonstrating the training pipeline and demonstrating improvement are
  different outcomes.

**Exit:** a reproducible experiment and a justified ship/keep-baseline decision, not an obligation to deploy
fine-tuning or a promise that a small run matches Claude's general capability.

## P8 — Prove confidential remote inference independently

- [ ] Find a supported confidential CPU/GPU deployment and quote. Verify what is available on the exact
  offering; a GPU model name or generic security certification is insufficient. Rental can precede ownership.
- [ ] Define the approved workload, model, configuration, permitted outputs and update policy. Obtain fresh
  hardware evidence and verify the approved workload/configuration through an appropriate attestation chain.
- [ ] Bind the encrypted request channel to that verified workload. If Afribit is a relay, questions must
  not be decrypted by an ordinary coordinator outside the protected boundary. Document who controls guest
  administration, debug access, key release, software updates and inference caches.
- [ ] Reject forged, stale, revoked, mismatched or missing evidence before releasing sensitive content.
  Test provider substitution, failover and outages. Keep no-confidential-provider behavior fail closed for
  requests requiring this privacy class.
- [ ] Inspect logs, crash handling, storage, telemetry and operational metadata. Have an independent reviewer
  assess the actual design and report residual trust and limitations. No prompt logging is only one control.

**Exit:** publish the verified design and negative-test evidence, with explicit limits. Without this,
describe remote inference as using trusted infrastructure; do not advertise host-blind or full privacy.
Owned hardware later joins under the same eligibility checks. Ordinary consumer GPUs do not become
confidential GPUs through software certification alone.

## P9 — A pilot that can support a sustainable service

- [ ] Reconcile privacy notices, location policy, threat model, member pricing and service contracts with
  the measured deployment. Independent security and relevant institutional review precede sensitive use.
- [ ] Pilot with a willing community, trained operators and paid review time. Measure useful task completion,
  language acceptance and support burden without making private-chat surveillance the evaluation method.
- [ ] Calculate cost per useful completed request and per active community. Include idle capacity, bursts,
  power, backhaul, storage, maintenance, review, support, payments and eventual hardware replacement; compare
  against equivalent workloads and privacy arrangements, not unrelated API prices.
- [ ] Offer bounded community capacity with explicit overload behavior and overage terms. Validate willingness
  to pay and renewal rather than infer demand from positive demo feedback. Communities set member terms.
- [ ] Demonstrate encrypted backup/restore and switching between approved rented and owned endpoints without
  transferring the local archive. Do not claim a hardware migration is proved until both environments run.
- [ ] Prepare a reusable community funding pack: governance, technical-skills training, infrastructure and
  reviewer budgets, permitted dataset work and measured outcomes. Grant eligibility is checked per call;
  installing Afribit does not itself confer eligibility or guarantee funding.

**Exit:** an evidence-backed pilot decision, including service affordability and operational limits. Scale
only the arrangements that work; retain grants as a possible complement to earned service income.

## What moves later to keep this achievable

The proof track takes priority over new messaging channels, voice, rewards, general-purpose agents,
federated training and a public compute marketplace. Real clinical decisions, patient records and student
records are outside the synthetic showcase. Reuse useful open source components only after checking
their licenses and security boundaries; no dependency on Tiles, Family Intelligence or DAIR is assumed.

## Evidence and completion rules

For each milestone record revision, configuration/model digests, hardware, dataset version, commands,
expected behavior, actual results, failures, limitations and costs where applicable. Keep raw private test
fixtures out of public artifacts; use synthetic canaries. Update the [feature register](../features/README.md),
[dependency register](../book/dependency-register.md), [test log](../book/test-and-evaluation-log.md) and
privacy/security documents when their corresponding implementation changes.

**Every trial must be documented**, including previews and failed/cancelled attempts. Use the
[trial register](../evaluation/trials/README.md) and retain UUID records; do not replace failed results
with later passes. Unknown invoices remain unknown, and an unfinished/crashed record is never a pass.

Run checks appropriate to each implementation: authorization/database tests for P1/P2, routing/egress and
gateway tests for P3/P4, real-device journeys for P5, approval/replay/recovery tests for P6, held-out model
evaluation for P7, and attestation/channel rejection tests for P8. Required repository checks still apply.
Passing one test category does not substitute for the others. A failure is a result to fix or document;
no milestone is complete merely because its code exists or its budget ran out.

**Implementation update, 26 October:** F-014 implements conversation ownership and guest capabilities.
F-015 adds learner accounts, scoped enrollment, revocable members-only access and account/guest workspace
separation. F-011/F-016 add explicit personal notes, remote-use permission, final-answer-only injection,
local-only conversation routing, two-reviewer sharing and withdrawal, tested locally with synthetic data.
The [memory guide](../guides/personal-memory.md) describes migration 022 and the backup/restore gate.
F-017 adds early conversation-wide processing policy across auxiliary calls, approved cards without
generation, effective-policy/source metadata and synthetic transport, concurrency and outage evidence.
The [processing guide](../guides/processing-policy.md) describes migration 023 and the tested boundaries.
F-018 adds provider/model/endpoint allowlists, regional request routes, daily allowance reservations,
context bounds and transport cancellation. The [compute guide](../guides/community-compute-policy.md)
describes migration 024 and a zero-paid-route example. F-019 adds a reproducible comparison runner,
persistent experiment reservations and anonymous review sheets, tested on localhost; see the
[evaluation guide](../guides/showcase-evaluation.md). F-020 adds automatic trial records and a
[scoped rental watchdog](../guides/rental-watchdog.md), tested only against fixtures. Next: verify upstream limits, actual rental shutdown/supervision,
model availability/pricing and the overall billed budget before paid comparisons. Deployment,
backup erasure replay, document/team permissions and the complete community proof remain pending. No
GPU rental, external model call or fine-tuning was needed for these slices.
