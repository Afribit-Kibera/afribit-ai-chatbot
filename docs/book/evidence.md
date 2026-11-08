# Evidence: what we have built and measured

A summary of every result we can cite, for proposals, partners and reviewers. Each line gives the number,
how it was measured, its caveat, and the [test and evaluation log](test-and-evaluation-log.md) entry that holds
the details. **Last updated 28 October 2026** for rented-model context checks and reported billing; older live-service and
model measurements below retain their original dates.

**Read it this way:**
- **Live** means in service on the public site today.
- **Built and tested** means working and tested, but not in service for any community.
- **Measured** means a result from an evaluation or benchmark, with the caveat that comes with it.
- Most language-quality results so far are **AI-judged on our own test cases**. People have not yet reviewed
  them blind. That review, and a benchmark written by the community, come next. Say so whenever you quote
  them.

## 1. At a glance

**Isolated member network, 6 November:** Edmund reports the phone loads the local app on Huawei
SSID `mesh`, an external page fails and mobile data is off. [Trial and scope](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md).
Six host readiness checks passed; node bound to Ethernet with planned expiry15:49 Nairobi. Edmund also
confirms A1 sign-in and Tuesday2-4pm/free with the approved-card label under requested unchanged
network conditions. He then confirms A1 note survival after refresh and A2 own note/history only
in the same community, then a clear no-matching-card reply. He clarified editing the existing
note, consistent with4 final notes; no new-note creation inferred. Node closed14:03 Nairobi,
listener absent,0 model/egress attempts,1 reviewed-card/1 unavailable reply. Restart persistence is not tested.
Computer retains separate household Wi-Fi, so this is not proof
of complete box WAN loss or remote-compute recovery. No router change, model call or new spend.

**Outage deferred/session closed, 29 October:** Edmund keeps household internet available and
postpones physical backhaul loss. [Checkpoint and cleanup](../evaluation/trials/2026-10-29-outage-deferred-session-close.md)
preserve phone results; temporary node gracefully closed, URL unreachable,0 model/egress. Remaining
assistant rows5 reviewed-card/1 unavailable, not six model completions or universal success. No
new appointment/reminder, router/network change or spending. Book `2026-10-29-f`; old live links
are archived. Physical outage/recovery and complete P5 acceptance remain open.

**Physical same-community display separation, 29 October:** Edmund confirms A2's own note and no
A1 conversation within CommunityA, following the cross-community check. [Evidence and partial
checkpoint](../evaluation/trials/2026-10-29-member-lan-retry.md), Book `2026-10-29-d`. Together with
phone login/local card, this advances3 physical-user-observed checks; it is not a phone known-ID
authorization attack, host-blind privacy or full P5 acceptance. Physical backhaul loss still pending.

**Physical cross-community separation, 29 October:** Edmund reports B1 facts/notes only and no A1
history after switching communities/accounts on iPhone. [Observation and limits](../evaluation/trials/2026-10-29-member-lan-retry.md),
Book `2026-10-29-c`. Same-community A1/A2 separation and uplink-loss still pending. Saved-card mode,
no model call or broader privacy/TEE claim.

**Physical iPhone local journey, 29 October:** Edmund explicitly confirms A1 sign-in and the requested
Tuesday2-4pm/free answer on the shared-Wi-Fi synthetic node. [User report and prior failure/retry](../evaluation/trials/2026-10-29-member-lan-retry.md),
Book `2026-10-29-b`. This is authenticated local approved-card retrieval with models disabled, not
generated AI or agent-observed device interaction. Phone account-isolation and uplink-loss pending.

**Running local member-node proof, 28 October:** [F-033](../evaluation/trials/2026-10-28-running-member-lan-node.md)
passes9 API checks and an actual built-app browser journey on the Wi-Fi origin: A2/B2 password
sign-in, distinct approved community answers, A2 note storage, sign-out and B2 note/history isolation.
QA exported2 sessions/4 messages/5 notes,2 reviewed-card replies,0 model calls/egress and then closed
cleanly. Plain-HTTP UUID crash reproduced/fixed with secure RNG fallback,5 new tests; full checks
pass, web82. Fresh ephemeral node left active for the iPhone, phone chat/uplink-loss awaiting actual
observation. No LLM/TEE/production-privacy claim or new paid compute. Book `2026-10-28-i`.

**Next language candidate prepared, 28 October:** [F-032](../evaluation/trials/2026-10-28-language-iteration-preparation.md)
passes13/13 offline checks on real full/compact/serve builders, including community/mode/async
isolation, unchanged safety/facts/history, assessor-field exclusion and overflow refusal. Eight
engineering development probes produce15 compact prompt previews with minimum2651 conservative
estimated room after300 output tokens in8192. No model call, community approval or measured language
improvement; learner packs unchanged. Draft recipe/review protocol and logs/hashes frozen, full
tests/typecheck/build pass. Book `2026-10-28-h`; paid allocations unchanged, no new inference.

**Three-reviewer deliverable, 28 October:** [all planned returns validated](../evaluation/trials/2026-10-28-three-reviewer-findings.md),
distinct packs/files/pseudonyms, exact case/hash alignment.12 ratings of4 outputs (3 unique texts),
naturalness3.67/5,1 fully correct/11 mostly correct,5/12 accepted as written,0 risky flags. Shared
language preferences and two requests for12-hour time formatting support a scoped guidance iteration;
they do not establish universal Sheng rules. Collection complete; baseline language/usefulness held
for refinement, with no preset release threshold or verified reviewer-independence/audience-fit claim.
No app/prompt/model/training/paid-compute change. Book `2026-10-28-g` supersedes earlier pending-return
counts; original snapshots retained. Physical AI-chat/uplink-loss remains pending.

**First human-review return, 28 October:** [one validated form](../evaluation/trials/2026-10-28-first-human-review.md)
rates4 synthetic live answers: naturalness3.5/5, all4 mostly correct,2/4 acceptable as written,
0 risky flags. Two other planned reviews pending; audience fit/independence unverified. No overall
language or safety acceptance. Source file preserved; no training or model change. Book entry
`2026-10-28-f` supersedes earlier zero-return status only. Phone page loading was separately
confirmed by Edmund; AI-chat/uplink-loss remains pending.

**Human/network acceptance preparation, 28 October:** [F-031](../features/F-031-review-and-network-acceptance.md)
passes **28/28 integrated checks**, including real loopback member HTTP during owned compute-socket
loss/restart, zero backend calls during loss and one after restoration, with no duplicate turns.
Models are fixtures; no physical Mesh result. Future metadata exports retain39 helper request timings,
45 assistant rows,30 populated model latency/token rows and one model row with null measurements.
Three anonymous offline review copies preserve exact live answers plus fictional reference facts;
all scores blank. Browser form/export verified offline after load, automated ratings excluded.
Human reviewers unassigned; phone/LAN test deferred at Edmund's request. Full tests/typecheck/build
pass; no new paid inference. Later F-030 reported charge $.043415188789367676, invoice unconfirmed;
latest observed account0 Pods, reservations unchanged. [All successes/failures and limits](../evaluation/trials/2026-10-28-review-and-network-acceptance.md),
Book entry `2026-10-28-d`.

**Actual integrated rental proof, 28 October:** [F-030](../features/F-030-community-live-rental.md)
completed **4/4 real synthetic-member answers** through normal API authentication/membership, actual
local SQL retrieval, permitted personal context and the remote native model. Each answer was complete,
remote-labeled, with no fallback/safety withholding. CommunityA used the updated Wednesday schedule;
communityB used its different Friday/KSh50 facts. All four actual egress traces passed scoped canary
checks. This is bounded functional evidence, not broad privacy/quality or heavy-reasoning qualification.

The pinned E4B model/context8192 verified6,583,656,505 bytes; gate4 requests/3810 input/415 output tokens,
sampled maximum5832MiB over101 live samples (not finalized/guaranteed peak). Full lifecycle176.687sec;
no per-request latency export, so no median/percentile is available. Separate watchdog and controller
confirmed termination/absence, account0 Pods. New bill pending;$.04368095 rate-duration arithmetic is
compute-only, not an invoice. A$.24 allocation fit the prior$.244984 remaining without refund/reset;
aggregate held/allocated now **$9.995020**, **$.004980 unallocated**, untouched$2 included. Reported
prior charges remain$0.1349052486670181 before this pending bill. Repetitive/planning omissions await
human review. [Every trial/result and new review pack](../evaluation/trials/2026-10-28-community-live-rental.md),
log `2026-10-28-c`. Earlier preparation statuses below are superseded only for this actual bounded run.

**Integrated live preparation, 28 October:** [F-029](../features/F-029-community-rental-rehearsal.md)
passes **27 offline checks** through normal API authentication/membership/lexical SQL retrieval,
private memory/history, native Ollama transport and the actual rental-worker gate. Four fictional
members overlap; disallowed context, IDs, local-only escalation, credentials, quotas and overflow
are checked. Endpoint switching retains local data; updated approved fixture facts reach the next
prompt without training. The model, GPU readiness and remote HTTPS transport remain simulated.

A tested live-controller hook permits at most four normal API generations after fresh lease/worker
qualification and retains cancellation, ledger/fingerprint/deadline rules. Explicit worker context8192
has13 fixture checks, no real8192 GPU result. Remote native-adapter answers are now labeled outside
based on endpoint; reviewed answers stay local. Streaming interruption after a prefix is checked
separately from non-streaming fallback. Full tests/typecheck/build pass; no account call, deployment,
new paid inference or weights. [Every trial/failed assertion and prepared handoff](../evaluation/trials/2026-10-28-community-rental-preparation.md),
log `2026-10-28-b`. Live allocation/worker qualification, human language review, Mesh and TEE remain open.

**Context/evaluation correction, 28 October:** [F-028](../features/F-028-showcase-context-headroom.md)
refuses the old full/4096 recipe before dispatch and marks length-limited answers incomplete/failed.
The existing compact prompt at8192 passes a conservative UTF-8/framing/output admission estimate;
this is not exact tokenization, GPU fit or language-quality evidence. Nineteen localhost showcase
checks cover the guard, output preservation and native-adapter settings. A new anonymous pack
retains all 16 original rental answers, flags four incomplete and adds no human scores.
No real inference, rental, weight download or training was performed in this follow-up.

RunPod's four model-session reports now total **$0.12418400717433542**, including **$0.040801142691634595**
for the successful session. With earlier canary/hosted amounts, known reported charges are
**$0.1349052486670181**. These are bucketed reports, final invoice unconfirmed; conservative allocations
remain $9.755016 with $2 held aside, $.244984 unallocated. No automatic refund or new funding.
Every owned Pod read404 and all account observations reported zero Pods. This supersedes earlier
missing-billing statements; [all new trials](../evaluation/trials/2026-10-28-context-headroom.md),
log `2026-10-28-a`.

**Current rented-model proof, 27 October:** [F-027](../features/F-027-authenticated-rental-worker.md)
completed **16/16 transport requests** with pinned Gemma 4 E4B Q4 on one rented secure RTX 4090,
eight each at concurrency one/four. All 6,583,656,505 referenced model bytes verified. Anonymous
access failed (401); the separate supervisor terminated the Pod and confirmed absence. Median full
response **1.244 s / 3.671 s**, fixed one-then-four order, only eight observations per row, no cache
reset. **Four outputs were incomplete at the 4096-token context limit**; human Sheng review/model
approval remains held. Supplied passages are not actual retrieval/account-memory integration.
Live telemetry exported 76 samples, sampled max **5568 MiB**, before collector finalization.

Three earlier model-session failures and every offline/preview trial are retained. All four model
Pods are confirmed absent; the last account observation has zero Pods. Actual model-rental bills
are pending, not zero. Conservative held/allocated total **$9.755016 of the original $10**, including
untouched $2 held aside; **$0.244984 unallocated**. The canary later reported $0.006488841492682695;
that is not a final invoice or a refunded allowance. Full tests, workspace typecheck and prior runtime
build pass. No training, more laptop weights, learner deployment, Mesh, second GPU type or TEE proof.
[Every result and limitation](../evaluation/trials/2026-10-27-rented-model-worker.md), log `2026-10-27-i`.
Earlier entries below retain the evidence available at their own stage; this update supersedes their
pending-rental/verification/telemetry statements.

**First current-proof rental lifecycle, 27 October:** one real secure RTX 4090 Pod was created in
EU-RO-1 at $0.89/hour, recovered after a lost create response without another POST, terminated and
confirmed absent (HTTP 204 then 404). Overall trial failed; cleanup succeeded. No model/GPU workload,
independent supervisor or performance test ran. $0.25 remains reserved; billed cost is unknown after
two failed reconciliation reads. [All trials](../evaluation/trials/2026-10-27-runpod-lifecycle-canary.md),
log `2026-10-27-h`. This supersedes earlier no-current-rental status only.

**Frozen rental model files, 27 October:** F-026 captures exact E4B/26B Q4 model manifests and adds an
offline installed-store verifier with **11 passing synthetic checks**. Full tests, workspace typecheck
and build pass. No real weights were scanned/downloaded, no image layers installed and no rental
started. A fresh RunPod probe returned zero pods once and timed out three times; access remains
intermittent. See [all trials](../evaluation/trials/2026-10-27-rental-model-integrity.md), log `2026-10-27-g`.

**RunPod access follow-up, 27 October:** live GraphQL validated the key and reported a funded account,
zero pods and no ongoing hourly spend. One native HTTPS REST read succeeded with verified certificate;
later reads still timed out. Access is **intermittent**, not fixed. F-025's optional transport passes
7 fixture checks; no pod was created/deleted and no new spend occurred. See
[actual report](../evaluation/trials/2026-10-27-runpod-access-followup.md), log `2026-10-27-f`.

**GPU measurement preparation, 27 October:** F-024 adds a portable telemetry helper with
**12 passing fixture tests**, sampled VRAM/utilization/power records and explicit partial-failure
handling. Zero actual GPU calls; hardware performance remains unmeasured in this slice. Fresh network
controls show OpenRouter/GitHub reachable and the tested RunPod paths timing out. No rental or new
spend. See [actual report](../evaluation/trials/2026-10-27-rental-preparation.md), log `2026-10-27-e`.

**Combined community API proof, 27 October:** F-023 passes **9/9 local integration checks** across two
fictional member-only communities/four accounts: actual lexical retrieval, scoped notes/history,
authorization, deletion and no-remote local-only fallback. Local inference is a fixture. A real hosted
probe produced **three model answers and one reviewed fallback after HTTP 429**; generated Kiswahili
clock/daypart wording was incorrect/conflicting, so model quality remains held. New known costs
**$0.00175896**, matching the later account increment; total known hosted costs **$0.00423240**.
Full tests, typecheck and build pass. No rental, training, private-document ACL, Mesh or TEE proof.
See [actual report](../evaluation/trials/2026-10-27-community-harness.md), log `2026-10-27-c`.

**Real hosted generation, 27 October:** Gemma 3 27B FP8/DeepInfra through OpenRouter completed an
eight-request follow-up: first content **0.78–2.02 s**, full completion **3.04–8.24 s**, no truncation.
The preceding two-model run was incomplete; Claude's pinned endpoint failed the ZDR filter and was
not quality-tested. All 26 HTTP requests, failures and diagnostics are documented. Known reported
charges **$0.00247344** matched the later account-usage increment; no invoice or GPU rental. Supplied
context fixed fictional desk facts, while fabrication and instruction gaps remain. **Quality hold;
human review pending.** This is not a retrieval/account/Mesh/TEE proof or a controlled CPU comparison.
See test log `2026-10-27-b` and the [hosted report](../evaluation/trials/2026-10-27-hosted-comparison.md).

**Real local generation, 27 October:** a pinned Qwen3.5-0.8B Q8_0 model completed eight internal synthetic
requests through Afribit's gateway on the laptop CPU. First content 0.45–28.06 s; full requests
2.01–36.09 s; peak process working set about 1.48 GiB; paid API/rental spend USD 0. **Model held from
learner use** after repetition, fabrication and missing safety advice. Completion is not correctness;
human blind review, actual retrieval, GPU/Mesh/TEE and minimum-device evidence remain open. See test log
`2026-10-27-a` and the [actual report](../evaluation/trials/2026-10-27-local-cpu.md).

**QVAC/discovery update, 26 October:** F-021's **6 localhost checks** pass, and a documented public Hub
metadata trial retrieved **5/5** entries with repository revisions and advertised artifact digests.
No weights/runtime/inference were tested; spend USD 0. Translation/research/adapter roles and dataset
terms remain distinct from general-chat suitability and weight license labels. See test log
`2026-10-26-h`, the [QVAC assessment](../research/2026-10-26-qvac-and-afribit-fit.md) and
[discovery guide](../guides/model-discovery.md).

**Trial/cleanup-tool update, 26 October:** F-020 adds durable per-invocation/attempt documentation and
a scoped RunPod cleanup watchdog, with **14 passing localhost/documentation checks**. Real account calls
and spend are zero; an actual quote, independent supervision, provider cleanup and reconciled invoice
remain unproven. This adds tooling, not a model-quality or guaranteed-billing result. See test log
`2026-10-26-g`, the [trial register](../evaluation/trials/README.md) and [rental guide](../guides/rental-watchdog.md).

**Local evaluation-tool update, 26 October:** F-019 adds a dry-run-first synthetic comparison runner,
persistent experiment reservations and anonymous review sheets, with **14 passing localhost/filesystem
checks**. No paid model comparison or human review has run; compute spend USD 0. This proves the runner
controls, not language quality, retrieval performance or a real rental invoice cap. See test log
`2026-10-26-f` and the [evaluation guide](../guides/showcase-evaluation.md).

**Local implementation update, 26 October:** the uncommitted community-compute work now has 94 passing
embedded PostgreSQL checks, 77 web unit tests and 14 GPU-gate checks, alongside the other API suites.
F-018 adds policy admission and per-community dispatch allowances; tests use synthetic localhost
providers and spend USD 0. This is built and tested locally, not deployed, and does not prove real model
quality, vendor invoice limits, regional residency or TEE privacy. Details: test log `2026-10-26-e` and
the [compute policy guide](../guides/community-compute-policy.md).

| Area | Result | Status | Log |
|---|---|---|---|
| Answers in Sheng, Kiswahili and English | Gemma 4 26B-A4B at 4-bit: **14/15** on the language rubric and **accurate on 15/15**. The same open models **without our engine: 1–2/15** | Measured (AI judge, our 15 cases) | 2026-10-08-b, -d |
| Finding the right knowledge | The right card in the top 3 for **97.5%** of 40 test questions (was 25%) | Live since 2 Oct 2026 | 2026-10-02 |
| Secrets kept out of chat | Seed phrases, keys, PINs and passwords refused before any model sees them; 34 standing checks | Live | §1 of the log |
| Members see where questions go | The app names where the AI runs and how long chats are kept; members delete chats any time | Live since 8 Oct 2026 | 2026-10-08-c, -e |
| The community decides what it learns | Members suggest wording; reviewers approve; safety topics need two reviewers | Live since 8 Oct 2026 | 2026-10-08-c, -e |
| Accounts only for invited trainers | Sign-up without an invitation is refused on the live service | Live since 8 Oct 2026 | 2026-10-08-g, -h |
| A community box using a remote GPU (Afribit Local) | The whole path works. Answers in **2.4–4.0 s**; four people at once in **7.8 s**; nothing stored and no text in the server's logs | Built and tested, with a rented GPU in Europe and test questions only | 2026-10-08-i, -k, -l |
| What people ask that no card answers (gap list) | Real model: **19/19** uncovered test questions counted, **0/8** covered ones; grouped under general topics with no personal detail; no question text kept | Built and tested, not yet released | 2026-10-08-m |
| Engineering discipline | **585** automated checks, run before every release; every release logged with its smoke test | Live practice | §1, 2026-10-08-e, -f, -h |

## 2. Language quality and accuracy

All results in this section are from **our own 15 test cases**, one run, **scored by an AI judge** that has a
separate check for factual accuracy. People have not yet scored these blind.

| Model and setup | Language rubric (of 15) | Accurate (of 15) | Date |
|---|---|---|---|
| Gemma 4 26B-A4B, compact prompt, hosted | 15 | 15 | 8 Oct |
| Gemma 4 26B-A4B, 4-bit on a 24 GB GPU | 14 | 15 | 8 Oct |
| Gemma 4 E4B (6.6 GB), 4-bit | 14–15 | 13–14 | 8 Oct |
| Gemma 3 12B (today's node default), compact prompt | 13 | 13 | 8 Oct |
| The same models with **no engine** (no reviewed cards, no language rules) | 1–2 | 3–6 | 8 Oct |
| Gemma 3 12B, long prompt | 15 | **6** | 2 Oct |

- **What this shows:**
  - The engine (reviewed cards plus language rules) is what makes the answers good.
  - The best open-licensed model we tested (Apache-2.0) does as well as today's model, or better.
- **The accuracy check matters.** On 2 October one setup scored 15/15 for language but only 6/15 for accuracy:
  fluent and wrong. That is why every evaluation has a separate accuracy judge.
- **Caveats:**
  - The 15 cases were also used to tune the prompts.
  - Results vary between runs: the same setup scored 15/15 on 2 October and 10/15 on 8 October.
  - Phone-sized models (1–3B) failed (0–3/15, 1 October). This is why the model runs on a shared machine, not on
    phones.

## 3. Finding the right knowledge (retrieval)

Measured on 40 raw Sheng, Kiswahili and English questions that we wrote. The score is how often the right
knowledge card was in the top 3.

| Step | Right card in the top 3 |
|---|---|
| Before the fixes | 25% |
| After rank fusion (ADR 0011) | 82.5% |
| **With bge-m3 embeddings, live since 2 Oct 2026** (ADR 0013) | **97.5%** |
| With the question rewritten to plain English first (built, off) | 100% |

Caveat: our own benchmark.

## 4. Safety and privacy features

| Feature | What it does | Evidence |
|---|---|---|
| Secret detection | Refuses messages that contain a seed phrase, private key, PIN or password, and never stores them or sends them to a model | 34 standing checks; every release's smoke test sends a public test seed phrase |
| Output check | Withholds answers that ask for a secret or promise returns | Standing tests; smoke test scam questions |
| Off-topic | Declines most questions outside its knowledge | 4 of 5 off-topic questions declined (2 Oct) |
| Where the AI runs | A label in the app, generated from the server's real settings, so it cannot overstate | Live; checked in a browser on the public site (8 Oct) |
| How long chats are kept | Public service: 30 days. Pilot node: none (only in the member's own browser). Delete one chat, all chats or an account at any time | Live; 23 privacy checks; tested against real PostgreSQL. On a test box set to keep nothing, **84 messages, 0 with text** |
| Accounts | Only by single-use invitation; codes stored as hashes; one generic refusal | 13 + 5 checks; refused sign-up verified on the live service |
| Learning only through review | Suggestions are used only after reviewer approval; never your own approval; two reviewers on safety topics | 12 checks, plus the database checks |

## 5. Hardware, speed and cost

All rented GPUs ran test questions only. The 8 October rentals were on RunPod, timed from Nairobi; the log does not record the provider for the 2 October runs.

| Machine | Model | One answer | Four people at once | Date |
|---|---|---|---|---|
| 2014 community desktop, 4 GB GPU | Gemma 3 12B, 4-bit | 32–85 s before the first word: **not usable for chat** | — | 2 Oct |
| RTX A4000, 16 GB (rented) | Gemma 3 12B, 4-bit | 10–19 s | 14.4 s | 2 Oct |
| RTX 3090, 24 GB (rented, $0.22/h) | Gemma 4 26B-A4B, 4-bit | 3.5 s | 8.4 s | 8 Oct |
| NVIDIA L4, 24 GB (rented, $0.49/h) | Gemma 4 26B-A4B, 4-bit | 8.1 s | 24.2 s | 8 Oct |
| **Afribit Local path:** community box → gate → rented GPU in Romania | Gemma 4 26B-A4B, 4-bit | **2.4–4.0 s** full answer (first words in 1.1–1.8 s) | **7.8 s** | 8 Oct |

- **Recommendation from these results:** Afribit's own server should have a 24 GB GPU (RTX 3090/4090 class).
  A community node with its own 16 GB GPU can serve a small group with today's model.
- **Caveats:**
  - Synthetic bursts of test questions, not real use.
  - A Kenyan server would be closer to communities than the European rentals.
  - One rented machine silently ran the model on its processor instead of its GPU, giving 50–125 s answers.
    The GPU server's health check now catches this.
  - Prices are rental prices. No purchase quotes have been collected yet.
- **Rental spent on the 8 October tests:** under US$1 (about $0.50, $0.22 and $0.09). The 2 October rentals
  were not costed in the log.

## 6. Afribit Local (a community box with Afribit's GPU)

**Built and tested, not in service. Afribit has no GPU in Kenya yet, and there is no price.** Rented GPUs stand
in for development and tests only, never for a learner's question.

| What was tested (8 Oct 2026) | Result |
|---|---|
| A box built with the community node kit, pointed at a remote model | Its smoke test passed **35/35**. It told members questions are answered on Afribit's server and kept nothing |
| Search stays on the box | All search embeddings were made on the box (32 calls); none went to the GPU |
| The gate in front of the GPU | 14 standing checks: per-community keys stored as hashes, only chat requests pass, limits, token counts, health |
| The encrypted tunnel (WireGuard), rehearsed on test machines | **18/18**: a box reaches only the GPU server; another community's key fails from the wrong box; an outsider reaches nothing; removing a community cuts it off at once |
| Nothing kept on the GPU side | The gate's log and usage records held no question text, key or address (checked on 19 real answers) |
| The GPU server goes down | The box answered from its reviewed cards in **0.6–1.1 s**, with search still working |

## 7. How the software is kept working

- **585 automated checks** (`pnpm test`) cover:
  - prompts, language and safety rules;
  - retrieval;
  - privacy and deletion;
  - suggestions and reviews;
  - invitations;
  - the gap list;
  - the GPU gate;
  - the web app;
  - a real PostgreSQL database (in WebAssembly, no install needed).

  They run before every release, in the release script.
- **Every release is logged** with its test result, the database migrations it ran (after a backup) and an
  outside smoke test. The latest API release passed **38/38**.
- **Browser journeys:** 35, with accessibility (axe) checks, on desktop and phone sizes.
- **Caveat:** GitHub Actions is not running for the repository at present, so these checks run in the release
  script rather than on every push.

## 8. What is not proven yet

Say these plainly in any proposal:

- **No pilot with real learners yet.** So there are no user numbers or learning outcomes.
- **No human blind review of language quality yet.** Three community reviewers are named and the review pack
  is ready.
- **The community-written benchmark (E-002) has not run.** Educators write 50 questions; a bare model and
  Afribit are scored blind; then a go/no-go.
- **Afribit Local is not running for any community,** and there is no GPU in Kenya yet.
- **The default model has not switched to Gemma 4.** That waits for the reviewers.
- **No second community has used the pack format.** Until one does, it is a design, not a result.
- **Not tested:** serving a node over the community's Wi-Fi mesh, and working with no internet with real users.
- **Legal review** against Kenya's Data Protection Act, 2019, is pending.

## 9. Using these numbers

- Quote a number together with its caveat, and its date if it may change.
- Results marked "AI judge" must say so.
- For what may be claimed in grant materials, the maintainers keep a claims register. When it and this page
  disagree, the newer dated entry in the [test log](test-and-evaluation-log.md) wins. Fix the other.
- Each new evaluation or release adds a log entry. Update this page in the same change.
