# Test and evaluation log

### 2026-11-08 - cleaner production learning UI and private pilot qualification

[F-035](../features/F-035-community-learning-release.md) adds versioned community Studio review,
account-scoped progress/notes and the green learner library/study/source/chat workspace. The clean
UI follow-up passed35 browser tests with1 configured skip,7 workflow groups and7 axe screen audits
with zero reported violations. Browser walkthrough transport is synthetic; no model-quality claim.

The actual Proxmox/source/model smoke passed8 groups after correcting compact prompting; one
real local source answer took179.2 seconds, with no paid spend. CPU capacity remains a pilot gate.
Cloudflare DNS qualification passed; account Tunnel/Zero Trust authority was denied and deferred
by the operator. Public DNS remains on Vercel. The private stack is not a participant release.

Umbrella trial `3e936d30-16eb-499b-a6d9-120cc6f93637` retains failed attempts and corrections.
[Full evidence and remaining gates](../evaluation/trials/2026-11-06-community-learning-release.md),
[Cloudflare status](../guides/cloudflare-pilot-access.md).

### 2026-11-06-g - clickable green learning workspace and AI Studio (design only)

A standalone local prototype extends the green direction with Education, notebook library,
source reader, source-aware chat, optional small learning steps and My space. AI Studio has
separate sources/language/review screens; its role switch and answers are clearly illustrative.
No live API, database, permissions, model training or publishing change. Existing green MP4,
SVG, actual mark and local fonts reused; no new generation or provider call, cost$0.

Trial `47ec8783-7dc5-489d-8bb4-66867c6c7baa` records the browser walkthrough, mobile contrast
correction, source-picker/helper follow-ups, responsive/accessibility checks and artifact hashes.
[Evidence and limits](../evaluation/trials/2026-11-06-education-design.md). Zero HRF/learning
outcome points; this is design verification, not real-model or participant evidence.

### 2026-11-06-f - green learner flow and real Open Notebook source engine

[F-034](../features/F-034-education-entry-and-private-notebooks.md) implements the green intro/SVG,
three-step setup, processing choices, focus selector and Education entry. Personal text notebooks
use a password-protected, loopback-only Open Notebook adapter with Afribit account/community
checks; inference remains in Afribit's gateway with private context locked local-only. Selected
community pack/Sheng guidance is retained. Voice consent, clipboard/file actions, UTF-8 limits and
stream cancellation extend the chat. No passkey/encrypted-vault guarantee or staff Studio redesign.

Final real-source trial `a3324411-db9c-4129-a89c-fcda769fc970` passes ten checks: actual imports,
source reads/deletion and authorization, with two synthetic inference fixtures and zero real LLM
or outside requests. API notebook/cancellation12/12, web84/84, TypeScript/build, privacy/local-provider,
member-LAN and community harness checks pass. Accessibility follow-ups corrected contrast/progress
semantics; browser checks cover onboarding, refresh consent, mobile layout, streaming and PWA shell.
All failures, corrections, boundaries and trial IDs are in the
[full report](../evaluation/trials/2026-11-06-green-education-notebooks.md).

Green OpenRouter regeneration cost$0.12; both videos total$0.24 of the approved additional$1 cap.
Original showcase reservations unchanged. Native SVG is code; built-in concept-image cost remains
unreported. No model weights, existing database migration, publishing, Proxmox/router change,
learner study or HRF points. The local source-engine proof is not evidence of real-model learning.

### 2026-11-06-e - learner/AI Studio inspiration and intro video (design experiment)

Edmund clarifies that trainers improve the AI, not teach people. The local product brief now
separates AI Studio (sources, language, test/review) from learner chat and optional guided study;
Education is active, Work/Development deferred. Two original attached references were archived
unchanged with hashes. Built-in imagegen produced a reference-inspired concept board, with its
unreported service cost left unknown. [Education harness research](../research/2026-11-06-education-harness-options.md)
compares primary documentation for Open Notebook, LearnHouse and Kolibri; no integration installed.

User explicitly approved an **additional $1 video cap**. One OpenRouter `google/veo-3.1-lite`
request produced a silent four-second portrait720p intro background; public design context only.
Returned job `usage.cost` is **$0.12**, reconciled in trial `d9f8e00f-d14c-4639-a0c0-a000b701ff2a`.
Original showcase reservations unchanged; no generation retry. Poll trials `34b40951`/`372ccb8f`
record existing-job reads and download. Full prompt, quote, payload, job and local MP4 saved under
`internal/frontend/inspiration/2026-11-06/`; review HTML layers the real logo/title over the motion.

Concept trial `a62e369f-5d2c-449b-ac3f-42341c01dd4e` records design artifacts and review-page checks.
Chromium decoded720x1280/4s; play reached end;390px viewport had no horizontal overflow, no autoplay,
and Skip paused/reached the concept. Missing favicon and a CLI quoting error were corrected.
Initial journal-pointer helper `394ee1cb` failed on working-directory resolution before generation;
failure preserved at $0, then fixed. Review browser/local server stopped. No production frontend,
model training, model guidance activation, source import, learner study, deployment, network change
or HRF readiness points. The visuals are not evidence that the proposed education harness works.

### 2026-11-06-d - source-grounded learning, online pilot and role/UX brief (specification only)

Edmund reports community feedback that Bitcoin education feels too advanced and should be broken
into smaller self-paced steps with familiar examples. He designates himself operator/language
editor, proposes the home Proxmox host for an online pilot and identifies community-site offline
equipment as a funding need. [Education plan](../program/bitcoin-education-pilot-2026-11.md) and
[readiness delivery scope](../evaluation/hrf-application-readiness-scorecard.md) updated before any
pilot scoring; no old trial reclassified. Feedback is founder-reported qualitative evidence,
not a quantified learner study or proof of learning improvement.

The local product/roles/UX brief in `internal/frontend/` inventories current learner/contributor,
review, pilot and language tools and proposes a source→chapter→step experience with saved progress.
It distinguishes educator/content editor/reviewer/operator personas from current backend roles,
private progress/notes from shared content, and language guidance from weight training. Current
staff-route privacy/versioning limits remain explicit. Design direction follows; no new frontend,
course/progress engine, trial, model call, Proxmox inspection/deployment, network change, publication
or grant application was performed. Google documentation used only to explain the source-linked
learning concept; no NotebookLM dependency/integration selected.

### 2026-11-06-c - education use case and internal application gate (planning only)

Edmund chose existing Afribit adult Bitcoin learners/merchants and requested at least90%
readiness before HRF application. [Education milestone](../program/bitcoin-education-pilot-2026-11.md)
reuses existing pilot/assisted-session drafts: consented discovery, reviewed learning content,
persistent secured local deployment, usability rehearsal, supervised study and a truthful case
report. The [proposed scorecard](../evaluation/hrf-application-readiness-scorecard.md) defines
20 five-point evidence criteria and hard gates. No baseline score assigned and no HRF scoring
system implied. Existing prototype results are scoped evidence, not completion of new criteria.

Adjacent needs recorded; human-to-human messaging is separate from AI inference and needs its
own E2EE, device/identity, recovery, moderation and metadata analysis. No automatic AI reading
of private messages. Kolibri/Briar reviewed as precedents, not integrated or security-endorsed.
No new participant contact, pilot, grant application, product/network change, model execution,
training, paid compute or public publication. Plan/samples/measurement criteria remain prospective.

### 2026-11-06-b - HRF funding criteria and readiness review (research only)

[Published requirements and evidence-gap matrix](../research/2026-11-06-hrf-grant-readiness.md)
compare HRF's AI for Individual Rights Fund/application, Bitcoin fund, programme and grantee
precedents with dated local evidence. A rights-focused pilot relationship, mission explanation,
sanitized reproducible release, annual/request budget, two willing references and prospective
success measures are the recommended application-preparation priorities. HRF publishes no
technical certification or compulsory TEE/4-of-7/PWA/fine-tuning test; these remain scoped
engineering claims and possible funded milestones. Grant acceptance is discretionary.

Existing phone and rental evidence remains synthetic/scoped;5/12 accepted wording ratings do
not establish language-quality acceptance or41.7% accuracy. Backup/restore, full host WAN-loss/
live recovery, governed administration, attestation, independent assessment and representative
pilot economics remain open. Actual public release not independently established; main local
community/showcase files currently uncommitted/untracked. No application, contact, disclosure
of private references/credentials, new model/test run, product/network change or spending.
This review is not new technical evidence or a grant-eligibility decision.

### 2026-11-06-a - isolated Huawei network, Ethernet host and phone page access

[Readiness and physical observations](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md)
record six running-HTTP checks in `e3f71348`, new bounded host `95811237`, and user observation
`bbe128e1`: local app loads, fresh external internet page fails, mobile data off. Host binds only
test Ethernet `192.168.1.2:4189`; household Wi-Fi remains connected. Local sign-in/card/isolation
passed automated readiness. Follow-up `74cfe3c6` now records Edmund's explicit phone A1 sign-in,
Tuesday2-4pm/free answer and approved-card label under requested unchanged network conditions.
A follow-up `eeca3eed` records A1 note survival after refresh and A2 own note/history only inside
the same community, under requested unchanged network conditions. Updated partial checkpoint
retains the earlier phone observations. Final `263f2e6c` records the no-matching-card reply and
verified graceful shutdown at14:03 Nairobi: listener absent,2 sessions/4 messages/4 notes,
1 reviewed-card/1 unavailable,5 retrieval queries,0 model/egress attempts, paid compute$0.
Note-count clarification `1d619a24`: Edmund edited/replaced the existing note, so no fifth note
was expected. Final checkpoint preserves all reports, keeps broader acceptance partial and
credentials archived. Refresh is not a server
restart; the database is ephemeral. UI separation is not a known-ID attack or host-root privacy test.
No whole-box WAN-loss/reconnection, model generation, PWA installation or local DNS claim.
IPv4 forwarding observed disabled; ICS inspection inconclusive. RouterOS scripts inspected but
not applied to Huawei; no network/router/source/build changes or paid compute. Node intentionally
had planned expiry6 November15:49 Nairobi and was closed early at14:03. All session credentials are archived.

### 2026-10-29-f - household outage deferred, owned node closed, checkpoint saved

Edmund reports HuaweiHG8145V6, then says the household cannot pause internet and asks to defer.
[All observations and cleanup](../evaluation/trials/2026-10-29-outage-deferred-session-close.md).
No WAN/router/network change or outage performed. No new date/reminder/calendar event. Only the
temporary synthetic node54b40282 was closed using its owned local stop marker at11:34:14 Nairobi,
ahead of expiry. Lifecycle completed, app/database closed, listener subsequently unreachable.

Verifier `dfe9af1d` stopped node successfully but recorded attention for an over-strict assertion:
metadata contained1 unavailable reply alongside5 reviewed-card replies. Corrected `a9d54114`
preserves both source categories and confirms0 model calls/egress,2 sessions/12 messages/4 notes,
15 retrieval queries, closed lifecycle/URL. These are remaining-row counts, not cumulative workload;
text was not exported, so the unavailable input is unidentifiable. No all-request-success claim.
Original attention record retained, later completed verification resolves it.

Partial physical checkpoint preserves user-confirmed phone page/sign-in/local answer, cross-community
B1 and same-community A2 display separation, plus agent-observed cleanup. Outage/reconnection checks
marked deferred; no remote endpoint/recovery or full P5 acceptance. Ephemeral data and old tokens
no longer active; count/UUID evidence retained. Current guide clearly marks archived credentials/
URLs inactive. No app/build/package change, model generation/training/new paid compute or spending
reservation change. Resume only with a planned household-safe window/separate test network and
fresh bounded node/account sheet. Other milestones remain independent of this deferred subtest.

### 2026-10-29-e - Huawei/Safaricom public router identification, no outage yet

Edmund supplied192.168.100.1, Huawei vendor, Safaricom ISP and direct fibre. Exact model unknown.
Native read-only `618d332a` got HTTPS trust-chain error and HTTP root200 without a model. Fresh
browser observation `99403ab5` reached certificate interstitial, not login UI; commands completed0
but this is not successful router-page access. Classification sidecar clarifies the original intended
scope flag. Browser closed, no certificate bypass/credentials/login/router settings or network change.
[Every observation, sources and next fact needed](../evaluation/trials/2026-10-29-outage-method-preparation.md).
Primary Huawei consumer Wi-Fi controls are not assumed applicable to an unidentified fibre ONT.
Next: printed model code only, no passwords. No fibre removal, reset, WAN pause, outage pass, model
call, paid compute or extension of current11:35 node expiry. Previous phone results retain their scope.

**29 October outage-test planning:** Edmund selected the combined fibre/SIM uplink option.
Exact medium/router model remains unconfirmed; requested make/model, without credentials.
No outage trial, cable/SIM removal, router/network setting change or new acceptance result.
At11:15 Nairobi the synthetic node remained active with its existing11:35 expiry. Waiting for
device details does not extend that expiry or establish no-internet behavior.

### 2026-10-29-d - iPhone same-community display separation and partial checkpoint

Record `21b9ca77-1a4c-469f-a226-8378455adf80` retains the explicit A2/CommunityA memory/history
reply: "A2 note only; no A1 conversation". Confirms user-observed own-note/foreign-history separation
within the same community, distinct from earlier A1/B1 cross-community check. Not a known-ID attack,
agent-observed phone result, independent security audit or root/host privacy claim.
[Trial sequence](../evaluation/trials/2026-10-29-member-lan-retry.md) and linked partial physical
checkpoint aggregate4 observation records into3 passed checks (reachability, local approved answer,
account display separation). Exact timings/device versions and cellular-off settings unknown.
Internet-uplink loss/local answering during loss/reconnection remain pending; remote generation/
recovery not exercised because this node has no model endpoint. No app/network/budget change,
training/inference or new paid compute. Existing service expires11:35 Nairobi29 October.

### 2026-10-29-c - iPhone cross-community separation confirmed

`2d7878c3-31b9-4b03-b2ac-f99df0c88205` retains Edmund's reply to the A1-sign-out/B1-sign-in/
CommunityB facts-and-memory test: "B1 facts and notes only; no A1 history". User-observed iPhone/
Safari cross-community result; exact interaction timestamp/device versions unrecorded. Confirms
own B1 facts/notes and absence of A1 notes/history after changing account and community. It does
not isolate the same-community A1/A2 boundary or test known foreign IDs on the physical device.
Existing API tests cover those authorization refusals separately. Next physical check is A2 in
CommunityA. [Full trial sequence](../evaluation/trials/2026-10-29-member-lan-retry.md).
No app/config/network/model change or new paid compute; saved-card mode and expiry unchanged.
Physical uplink-loss and full P5 acceptance remain pending.

### 2026-10-29-b - iPhone authentication and local-answer journey confirmed

User observation `15f7ed1c-3dee-446a-b971-ae728bc85a6a` retains Edmund's explicit reply to the A1
phone test: "Signed in; Tuesday, 2–4pm, free appears". This confirms iPhone/Safari sign-in and the
requested approved local answer on fresh host `54b40282`. Previous page-retry failure and later
page-loading confirmation remain documented in [the retry report](../evaluation/trials/2026-10-29-member-lan-retry.md).
Observed by user, not agent; precise timestamp/device/browser versions unknown. Model calls remain
disabled; no inference/privacy/TEE claim from this local card. Source label not separately confirmed
by user. Phone account-isolation and physical internet-uplink loss are separate pending observations.
No app/config/network/provider/budget change. Host expiry unchanged, original records preserved.

### 2026-10-29-a - failed phone-page report, lifecycle diagnosis and fresh retry

Edmund reported "Page does not load" then asked to continue. [Every attempt and evidence](../evaluation/trials/2026-10-29-member-lan-retry.md).
Old host `c9293b08` completed normal expiry23:38:35 Nairobi28 October,0 sessions/messages/model calls;
no listener before restart. This explains current unavailability, not necessarily the earlier failed
phone attempt: its precise time/Safari error is unknown. New host `54b40282` active until11:35:13
Nairobi29 October, same owned Wi-Fi IP4189, new credentials/ephemeral DB. No physical retry pass.

Diagnostics `bac544a1` and `5e61725b` failed only at operator cleanup DELETE: Content-Type JSON with
empty body refused400; login/chat worked. Corrected helper omits Content-Type for DELETE. Final
`acfde3a4`6/6 verifies closed prior lifecycle, unchanged tested API/web hashes, Wi-Fi/listener/PID,
actual page/JS/CSS, password login/Tuesday-free approved card, foreign-community refusal and removal
of all3 A2 probe conversations. A1/B1 reserved for phone. Read-only firewall rules show enabled Node
inbound Allow on Public; no firewall/profile/router/Tailscale/network change. Same-computer probes
do not prove iPhone connectivity. Current guide updated with new account sheet and expiry.

No source/build/dependency/model change; prior full tests/typecheck/build remain applicable.
API hash025d37a4...51fad1, web source/build hashes match completed F-033 browser handoff. No paid
compute, model generation, training or reservation change. All failures preserved. Await Safari
symptom/retry; physical phone sign-in/chat/uplink-loss remain pending. Active host expires itself.

**User-observation follow-up:** `25672a08-9f87-465c-9981-247bf27f088f` records explicit replies:
earlier "Safari could not connect", fresh retry "The page loads now". Physical iPhone/Safari page
loading is now confirmed by Edmund, superseding the pending page-retry statement above. Exact
failure time/cause remain unknown; no inferred authentication, chat or uplink-loss result. Original
pending diagnostic fields retained; guide/report updated, active node expiry unchanged, model calls0.

Every check we rely on, and a dated record of every time we measured something. It's part of
[the Book](README.md). For what the evaluations measure and how to read them, see
[Evaluation: method and results](../evaluation/methodology.md).

There are two kinds of check:

- **Standing tests** need no network or paid model. They are `pnpm test`, which the release script runs
  before every deploy. GitHub Actions (build, browser journeys, accessibility and Lighthouse budgets in
  `.github/workflows/ci.yml`) is not running for this repository; see [where tests actually run](README.md).
- **Live evaluations** call real models, cost money and vary from run to run. They are run by hand and
  logged below.

## 1. Standing test suites

Counts are from the run on 8 October 2026 for entry 2026-10-08-m below (all passing). If a count drops between runs
without an explanation, treat it as a defect.

| Suite (`pnpm …`) | Checks | What it protects |
|---|---|---|
| `test:prompt-golden` | 15 | The prompt each model receives contains the right guidance, per language and level |
| `test:secret-detector` | 34 | Real secrets (seed phrases, keys, PINs) are caught; education and scam questions are not blocked |
| `test:local-provider` | 31 | The node's model provider works against Ollama- and OpenAI-style servers and fails cleanly |
| `test:embeddings` | 26 | Hosted and local embeddings, dimensions, prefixes; a separate embedding server never gets the chat server's key (F-006) |
| `test:fusion` | 13 | Rank fusion of semantic and full-text search |
| `test:compact-prompt` | 50 | The compact prompt keeps the community's rules |
| `test:waiter` | 21 | The waiter's search ticket |
| `test:chef` | 25 | The restaurant pipeline and the privacy scrubber |
| `test:cors` | 11 | Which origins may call the API |
| `test:pack` | 63 | Pack loading and validation; the Kibera pack reproduces the prompts exactly; no Kibera words leak into another pack |
| `test:registry` | 35 | Several packs on one server: scoping, conflicts, sessions |
| `test:voice` | 35 | Voice Lab overrides: validation, atomic swap, who may edit what |
| `test:meter` | 7 | Usage metering, including when the database is down |
| `test:review` | 11 | Only approved or published cards are live; the two-person rule |
| `test:pilot` | 36 | Pilot console: aggregates, blanking of small counts, roles, export contents, page security |
| `test:grounding` | 13 | Flags invented names and figures in answers |
| `test:privacy` | 23 | F-001/F-002: where the AI runs (never overstated), retention, the browser history the server accepts, the delete routes, `userId` only from a verified token |
| `test:teach` | 12 | F-003: suggestion validation, safety topics, consent mapping, self-approval and two-reviewer rules, who may call each route |
| `test:invitations` | 13 | F-012: the `REGISTRATION` setting, codes, one generic refusal, a code works once, `closed` and `open`, who may manage invitations |
| `test:gaps` | 11 | F-004: what counts as a gap, the labeller's prompt and label checks, the 5-or-more rule, the recorder never in the answer's way, who may read and decide |
| `test:db` | 25 | The SQL of F-002, F-003, F-012 and F-004 against real PostgreSQL (PGlite); every migration must apply |
| `test:gate` | 14 | F-006: the GPU server's gate: keys and peer binding, only chat and model lists pass, model allow-list, limits, streaming, token counts, GPU-placement health, usage counts, no text in logs |
| `@afribit/web test` (Vitest) | 61 (7 files) | Web app units, incl. the privacy wording rule, recent turns, deletion, suggestion and sign-up requests |
| **Total** | **585** | (468 on 8 Oct morning; 529 at release 20261008133325; +23 with F-012; +4 with F-006 part 1; +14 with the gate; +15 with F-004) |

CI also runs `test:voice-ui-assets` (the Voice Lab page's content security policy and assets), Playwright
browser journeys with axe accessibility checks, and Lighthouse budgets.

**What the standing tests don't cover:**
- `test:db` runs real PostgreSQL, but without pgvector, so vector search is not exercised; most routes are
  still tested with stand-in stores.
- Nothing calls a real model.
- Nothing checks answer quality.
- Live evaluations reuse the same 15 cases to tune prompts and to test them.

## 2. How to add an entry

Add new entries at the top of section 3. Copy this template:

```markdown
### YYYY-MM-DD-x — <short title>
- **What:** <suite, evaluation, benchmark, blind review, load test, release check>
- **Code:** <branch> @ <commit> (<"clean" or "with uncommitted changes">)
- **Config:** <models + digests, INFERENCE_MODE, PROMPT_MODE, pack and version, hardware>
- **Result:** <numbers, with the denominator>
- **Evidence:** <results file path, or where the raw output can be requested>
- **Caveats:** <sample size, judge, single run, anything tuned on the same cases>
- **Decision / follow-up:** <what changed because of it, or "none">
```

## 3. Log (newest first)

Entries before 8 October 2026 were backfilled on that date from the evaluation document and the model
profile notes. Their raw outputs are in the maintainers' experiment folders.

### 2026-10-08-m — F-004 gap list: build, tests, and a real-model check
- **What:**
  - The standing tests for [F-004](../features/F-004-gap-list.md).
  - A real-model check: a community box built with the node kit on Eddie's laptop, with Gemma 4 26B-A4B on a
    rented RunPod GPU (Romania, secure cloud, $0.74/h, CUDA 13 host). `CHAT_RETENTION=none`. **Test questions
    only.** Scripts and output: `internal/experiments/2026-10-08-box-gpu/` (`gap-questions.mjs`,
    `semantic-scores.*`, `gap-topics*.txt`, `gaps-console.mjs`, `console-gaps*.png`).
- **Code:** `feat/frontend-rework` after `c8508e0`, with the F-004 changes (committed with this entry).
- **Standing tests:**
  - `test:gaps`: **11**, new.
  - `test:db`: **25** (+4: no text columns; case-insensitive topics; the 5-or-more list; audited decisions).
  - `pnpm test`: **585**, all passing.
- **Finding: the old "confidence" can't detect gaps.**
  - The first run recorded **no** gaps. Questions no card covers (Kenyan tax, Bitcoin ATMs) had a confidence
    of **1.0**, because that value takes the word-match score, which reaches 1 whenever words like "bitcoin"
    match.
  - We measured the meaning-match score (bge-m3 cosine) for 27 test questions: uncovered **0.42–0.65**,
    covered **0.67–0.79**.
  - The gap signal is now the meaning-match score, default threshold **0.65**.
  - The console's "search found little" figure (old measure) undercounts; the Gaps tab replaces it.
- **Result (meaning-match signal):**
  - **19/19** uncovered questions recorded as gaps; **0/8** covered ones.
  - Labels after one prompt revision:

    | Topic | Questions | Languages |
    |---|---|---|
    | Bitcoin taxation in Kenya | 6 | 4 |
    | Bitcoin ATMs in Kenya | 5 | 3 |
    | Bitcoin mining | 5 | 4 |

    Before the revision, the tax questions split 3 + 3.
  - **Three questions full of personal details** (names, a phone number, amounts, a street, a landlord)
    became "Withdrawing Bitcoin", "Paying rent with Bitcoin" and "Buying Bitcoin". No detail reached a label.
  - Console, in headless Chromium:
    - the three topics with 5+ questions show, and the three single-question topics appear only as a sum;
    - "Out of scope" with a note works and is audited;
    - no browser errors.
  - **0 of 132** chat messages kept text.
- **Also found:** four rented hosts with CUDA 12.x drivers ran the current Ollama image on the **CPU**. The
  pod script's GPU check refused them; requiring CUDA 13 hosts fixed it. Now noted in the GPU server's README.
- **Caveats:**
  - The 27 calibration questions are ours, and the margin between uncovered and covered is thin.
  - Labels were written by Gemma 4 26B; the public service would use hosted Gemma 3 12B, which is untested
    for this.
  - One run.
- **Cost:** about US$0.30 of GPU time, including the two refused CPU-only pods. No pods remain; the test box
  was removed.
- **Decision / follow-up:**
  - Release needs Eddie's approval, because on the public service the labeller is one more hosted model call.
  - Review the threshold and the labels after the pilot's first month.

### 2026-10-08-l — F-006 part 2 with a real GPU: box → gate → Gemma 4 (RunPod stand-in)
- **What:** the full Afribit Local path with the real gate in front of the model. The box was built with the
  node kit on Eddie's laptop in Nairobi. The gate ran in a container on the box's network, pointed at Ollama
  on a RunPod pod (Romania, secure cloud, $0.74/h; GPU type not reported). It was fully on the GPU, checked
  by `pod.sh` and by the gate's `/healthz` (`gpuShare: 1`). The model was `gemma4:26b-a4b-it-q4_K_M` with
  `PROMPT_MODE=full`, `MODEL_LOCATION=afribit` and `CHAT_RETENTION=none`. The gate held one test community
  key, not bound to an address, because Docker addresses are not tunnel addresses; the tunnel rehearsal
  (entry k) tested the binding. **Test questions only.**
- **Result:**
  - Box smoke test **35/35**.
  - Speed:

    | | First words | Full answer |
    |---|---|---|
    | One at a time (5 questions) | 1.1–1.8 s | 2.4–4.0 s |
    | Four at once | 3.2–3.5 s | all done in 7.8 s |

  - The gate logged 23 lines: 19 `POST /api/chat` 200, 2 `GET /api/tags` 200 and 1 `/healthz` 200 before the
    outage, plus the outage lines below.
    - Token counts on all 19 answers: 90,520 in and 5,374 out, about 4,760 and 280 per answer.
    - The usage file matched.
    - Searched for question words, key prefixes, `Bearer`, and Docker or tunnel addresses: found in **0**
      lines of the log and **0** of the usage file.
  - **GPU gone** (pod deleted): `/healthz` → 503. The box's next question was answered from the cards in
    **0.6 s** (search confidence 0.70).
- **Notes:**
  - `first-run.sh` warned that it could not reach `http://gate:8080` from the host. That is expected in this
    rehearsal (a Docker-only name). On a real box the host reaches `10.77.0.1` through its tunnel.
  - These times are about E-001's RTX 3090 figures; the previous pod (entry i) was a slower card.
- **Cost:** about US$0.09. The pod was deleted and no pods remain. The box, its volumes, its settings file
  and the test keys were removed.
- **Evidence:** `internal/experiments/2026-10-08-box-gpu/` (`gate-smoke.txt`, `latency-gate.jsonl`,
  `gate-log.jsonl`, `gate-usage-2026-10.json`, `pod.log`).

### 2026-10-08-k — F-006 part 2: the gate's tests and a tunnel rehearsal
- **What:**
  - The gate's standing tests: `pnpm test:gate`, 14 checks.
  - A rehearsal of the real `deploy/gpu-server/` scripts, the gate and `deploy/community-node/wireguard.sh`
    on four throwaway Linux containers (Docker Desktop, kernel 6.18 with WireGuard): `gpu` (with a fake
    Ollama, no GPU), `box1` ("kibera"), `box2` ("mathare"), and `out`, an outsider on the same network.
    Script: `internal/experiments/2026-10-08-gate-tunnel/tunnel-test.sh`.
- **Result: 18 of 18.**
  1. `setup-wireguard.sh` made the server end, and forwarding from the tunnel was dropped.
  2. Each box made its own key pair (`wireguard.sh key`). `add-community.sh` gave each a tunnel address and a
     key, shown once. `keys.json` held hashes only.
  3. `wireguard.sh connect` brought each tunnel up, and the GPU health answered through it.
  4. Asking through the tunnel with the box's own key → 200. With no key → 401. With kibera's key from
     mathare's address → **401**. A model pull → 403.
  5. Box 1 routes only `10.77.0.1` through the tunnel. The outsider reached neither the gate nor Ollama.
  6. `remove-community.sh mathare` cut mathare off (key revoked, peer removed), and kibera kept working. One
     peer was left.
  7. Usage counted per community. The gate's log and the usage file held no question, key or address.
- **Caveat:** containers, not the real server. `harden-host.sh` and `check-host.sh` need a real Ubuntu host
  (systemd, swap, disks) and were only syntax-checked. They run first on the Kenyan server.

### 2026-10-08-j — Web app deployed to the public site (redesign, F-001–F-003, F-012)
- **What:** production deploy of `apps/web` to Vercel (`afribit-chat`, team "afribit"), aliased to
  `https://ai.afribit.africa`. Deployment `dpl_8rQatEesdZ2yGtZs4tYoGQL26xRa`. The previous production deployment
  was `afribit-chat-jcz25t2y1` (rollback: `vercel rollback` to it, or promote it in the dashboard).
- **Code:** `feat/frontend-rework` @ `473d657`, plus a new `.vercelignore`.
- **Before:** a local build passed (12 routes prerendered; landing 72 KB, chat 110 KB gzip, within budgets).
- **Result:**
  - The uploaded source was listed through the Vercel API: 804 files, with **no `.env`, no `internal/`, and
    no other private file**.
  - Checked in headless Chromium:
    - the landing page loads;
    - `/app` shows the first-visit setup dialog, then the header chip "Outside service" and "Answered by an
      outside AI service that promises not to keep your question. Chats are deleted from the server after
      30 days." (from the API's `service` block);
    - a test question streamed an answer in mixed Sheng (`GET /api/v1/pack` 200, `POST /api/v1/chat/stream`
      200);
    - Contribute → create account asks for an invitation code.
- **Finding (security):**
  - The CLI had no `.vercelignore`, and **it does not read `.gitignore`**. Three earlier production
    deployments (`dpl_FmtugiXU…`, `dpl_8zzTXNon…`, `dpl_79RRJBqN…`, about 3 October) contain the repository's
    root `.env`.
  - Those three, and two more (`dpl_7Mhz88tv…`, `dpl_DE8StasK…`), contain files from `internal/`.
  - Deployment source is visible to the Vercel team, not the public. Even so, treat every key that was in
    that `.env` as exposed.
  - The new `.vercelignore` stops it from happening again.
- **Decision / follow-up (owner: Eddie):**
  - Rotate the keys that were in `.env` then (at least the OpenRouter key) and update the production
    server's `.env`.
  - Delete the five old deployments that hold private files.

### 2026-10-08-i — F-006: a community box using a remote GPU (RunPod stand-in), end to end
- **What:** the Afribit Local path (ADR 0016) with real parts. A box was built with the node kit on Eddie's
  laptop in Nairobi (Docker Desktop: Postgres + pgvector, Ollama with `bge-m3` on the CPU, the API, Caddy).
  Its model was **Gemma 4 26B-A4B** (`gemma4:26b-a4b-it-q4_K_M`) on a rented RunPod GPU, reached through
  RunPod's HTTPS proxy. Settings: `MODEL_LOCATION=afribit`, `CHAT_RETENTION=none`, `REGISTRATION=invite`,
  `PROMPT_MODE=full`. **Test questions only**; the pod was deleted after each attempt (a watchdog was armed
  too). Afterwards the box, its volumes and its settings file were removed. Scripts and raw output:
  `internal/experiments/2026-10-08-box-gpu/`.
- **Code:** `feat/frontend-rework` after `3eb5ccf`, with the F-006 part 1 changes (committed with this entry).
- **Attempts:**
  1. No pod: RunPod had no 24 GB card free in its community cloud.
  2. A pod in Taiwan ($0.34/h). **Ollama ran the model on the CPU (0 GB on the GPU, 3.4 tokens/s).** Answers
     took 50–125 s; one fell back to the cards after ~125 s. The path worked, but the timings are meaningless.
     The pod was deleted.
  3. A pod in Romania (secure cloud, $0.49/h; the GPU was probably an L4). 18.4 GB of the model on the GPU.
     **This is the run reported below.** The script now refuses a pod whose model isn't on the GPU.
- **Result (attempt 3):**
  - `first-run.sh` checked the remote server, **skipped the chat-model download**, and indexed 86 embeddings on
    the box.
  - `/api/v1/pack` → `service: {modelLocation: "afribit", retention: {mode: "none"}}`.
  - **Smoke test 35/35**, after fixing the smoke test's history check: on a no-storage server it now checks
    that no text was kept.
  - **Embeddings stayed on the box:** the box's Ollama logged 32 `/api/embed` calls and 0 `/api/chat` calls.
    The pod never had `bge-m3`, and no embedding failure was logged.
  - **Nothing stored:** 84 chat messages in the box's database, 0 with text.
  - **Speed** (streamed through the box; network round trip to the pod about 0.57 s including the HTTPS
    handshake):

    | | First words | Full answer |
    |---|---|---|
    | One at a time (5 questions) | 2.2–5.4 s | 6.8–14.8 s |
    | Four at once | 6.8–8.5 s | all done in 29.8 s |

  - **GPU server gone** (pod deleted, box unchanged): card-only answers in 0.3–1.1 s, search confidence
    0.70–0.80. Search still ran on the box.
  - **F-012 on a real box:**
    - `inviteCli` made a reviewer code; sign-up with it in lower case → 201; reusing it → 409 with the
      generic message; `promoteToAdmin` made that account an administrator.
    - In headless Chromium, the console's **Team → Invitations** panel created a code (shown once), listed it
      and the used one with no codes in the list, and revoked it. The revoked code was then refused (409). No
      browser console errors under the page's strict content security policy.
- **Findings:**
  - A GPU host can silently fall back to the CPU, so the GPU server's health check must check GPU placement
    (F-006 acceptance test 8).
  - Card-only answers are in English (follow-up in F-006).
  - **The node kit's Caddy did not route `/pilot`**, so nodes had no console. Fixed, and verified above.
- **Caveats:**
  - The GPU was in Romania and its type was not reported. The prompt was the long one.
  - The box was a laptop, not the pilot machine.
  - One run of 5 questions plus 4 at once.
  - Cost: about US$0.22 of GPU time across the attempts.
- **Decision / follow-up:**
  - Part 1 is done.
  - Repeat test 7 from the pilot box once the GPU is in Kenya.
  - Build part 2 (gate, WireGuard, host checklist) with the hardware.

### 2026-10-08-h — Release 20261008143525 to production (F-012)
- **What:** production release of commit `3eb5ccf` with `internal/launch/release.sh`, then the outside smoke
  test.
- **Result:**
  - The script's checks passed: typecheck, `pnpm test` (552 checks) and the build.
  - A backup was taken and a rollback tag made.
  - **Migration 018 applied before start-up.** Health is OK.
  - **Smoke test 38/38**, including the new check "sign-up without an invitation code is refused" (409).
  - The invitation endpoints refuse anonymous callers (401).
  - The console at `/pilot` serves the new Invitations panel.
- **Not done:** the web app is still not on the public site. The Vercel project belongs to a team the
  logged-in account cannot reach (see the session notes). The API is backward compatible with the deployed
  web app; its sign-up form has no code field, so sign-up there now always gets the generic refusal. That is
  intended until the new web app is deployed.
- **Follow-up:** an administrator reviews the one contributor account created by open sign-up (F-012
  decision 2).
- **Rollback:**
  `ln -sfnT /srv/afribit-ai/releases/20261008134137 /srv/afribit-ai/current && docker tag afribit-api:prev-20261008143525 afribit-api:latest && compose up -d`.

### 2026-10-08-g — F-012 accounts by invitation only: build and tests
- **What:** standing tests for [F-012](../features/F-012-invitation-only-accounts.md), run locally with
  `pnpm typecheck` and `pnpm test`.
- **Code:** `feat/frontend-rework`, the commit "Accounts by invitation only (F-012)" (migration 018).
- **Result:**
  - Typecheck clean. **`pnpm test`: 552 checks, all passing** (529 before).
  - `test:invitations` (13, new):
    - the setting defaults to `invite`;
    - codes are readable and unique, and are stored only as a hash;
    - a missing, wrong, used or revoked code and a taken email all get the **same** 409 answer;
    - a reviewer invitation makes a reviewer, once;
    - `closed` refuses even a good code; `open` behaves as before;
    - only an administrator whose **database role** is still admin can manage invitations.
  - `test:db` (+5, real PostgreSQL):
    - the stored hash matches, and the code itself appears nowhere;
    - an invitation creates the account with its role, once;
    - expired and revoked codes create nothing;
    - a taken email rolls the transaction back and leaves the code usable;
    - deleting the account keeps the invitation row;
    - create, use and revoke are audited, never with the code.
  - Web (+4): the form sends the code; a refusal and a closed server are told apart, so the message can be
    shown in the member's language.
- **Caveats:**
  - No browser journey covers sign-up. (The console's Invitations panel was later exercised in a browser on a
    real box: entry 2026-10-08-i.)
  - The smoke test now checks that sign-up without a code is refused. A full sign-up needs
    `--auth --invite <code>`.
- **Decision / follow-up:** release the API (migration 018), then an administrator reviews the existing
  contributor account (decision 2 in the spec).

### 2026-10-08-f — Release 20261008134137 to production (migrate-first, sweep delay)
- **What:** production release of commit `e6ed753`: migrations run with the new image before it starts, and
  the first retention sweep waits a minute.
- **A failed attempt first (release id 20261008133957):** the edited deploy script had Windows line endings,
  so the server's bash stopped at line 3 before extracting anything. Production stayed on 20261008133325,
  healthy throughout; the only trace is a spare rollback tag for the same image. Fixed by converting the
  script to Unix line endings.
- **Result:**
  - The script's checks passed: typecheck, `pnpm test` and the build.
  - A backup was taken.
  - **Migrations ran before start-up** (016 and 017 already applied, so nothing to do).
  - The container recreated and is healthy.
  - The first sweep, a minute later, logged no failure. The `service` block is unchanged (cloud, 30 days).
- **Rollback:**
  `ln -sfnT /srv/afribit-ai/releases/20261008133325 /srv/afribit-ai/current && docker tag afribit-api:prev-20261008134137 afribit-api:latest && compose up -d`.

### 2026-10-08-e — Release 20261008133325 to production (F-001, F-002, F-003)
- **What:** production release of the API with `internal/launch/release.sh`, then the external smoke test.
- **Code:** commit `ae99e81` on `feat/frontend-rework`. The release packages the working tree's API,
  shared package, migrations and packs, which were identical to `ae99e81`.
- **Before:**
  - Production had migrations up to 015.
  - 248 chat messages, the oldest from 24 September, so **none older than 30 days**: turning on 30-day
    retention emptied nothing.
  - Accounts: 1 admin and 1 contributor.
- **Result:**
  - The script's checks passed: typecheck, `pnpm test` (529 checks) and the build.
  - A database backup was taken, and the previous image was tagged `afribit-api:prev-20261008133325` for
    rollback.
  - **Migrations 016 and 017 applied.** Health is OK.
  - `GET /api/v1/pack` → `service: {modelLocation: "cloud", retention: {mode: "days", days: 30}}`.
  - Delete routes answer `204`; the suggestion and account routes answer `400`/`401` without valid input or
    sign-in.
  - **Smoke test: 37 of 37 automatic checks passed**, including scam, secret, off-topic and rate-limit checks.
- **Finding:** the release started the new container before migrating, so the first retention sweep ran
  seconds too early and logged "column content_deleted_at does not exist". It was harmless: logged, not
  thrown, retried hourly, and the column existed moments later. **Fixed** in the next release: migrations
  now run with the new image *before* it starts (`deploy_remote.sh`, `.github/workflows/deploy.yml`), and the
  first sweep waits a minute.
- **Not deployed:** the web app. The redesigned frontend has not been approved for the public site
  (production-setup gate 3), so the new privacy, delete and "say it your way" screens are not public yet. The
  API is backward compatible with the current web app.
- **Rollback:**
  `ln -sfnT /srv/afribit-ai/releases/20261003135841 /srv/afribit-ai/current && docker tag afribit-api:prev-20261008133325 afribit-api:latest && compose up -d`.

### 2026-10-08-d — Gemma 4 at 4-bit on rented GPUs (E-001, part 2)
- **What:**
  - Speed, concurrency and quality at 4-bit, on a rented RTX 3090 (24 GB, community cloud, $0.22/hour) and an
    NVIDIA L4 (24 GB, secure cloud, $0.49/hour) on RunPod, Ollama `q4_K_M`.
  - The 15 built-in cases, judged by the same two judges.
  - No learner data. Both pods were deleted afterwards (confirmed: no pods left on the account). Rental cost
    was about $0.50.
- **Code:** prompts from the working tree on `feat/frontend-rework` @ `bb9b7b6` (uncommitted).
- **Config:**
  - Models: `gemma3:12b`, `gemma4:e4b-it-q4_K_M` (6.6 GB), `gemma4:26b-a4b-it-q4_K_M` (18 GB),
    `gemma4:31b-it-q4_K_M` (20 GB).
  - Settings: `num_ctx` 8192, temperature 0.3, thinking off, `OLLAMA_NUM_PARALLEL=4`.
  - Digests are in the run logs (experiment folder).
- **Result:**

  | Model | GPU | One answer | 4 at once | Rubric / accurate |
  |---|---|---|---|---|
  | Gemma 4 26B-A4B | RTX 3090 | 3.5 s | 8.4 s | 14/15, accurate 15 |
  | Gemma 4 26B-A4B | L4 | 8.1 s | 24.2 s | 14/15, accurate 15 |
  | Gemma 4 E4B | RTX 3090 | 2.2 s | 11.3 s | 14/15 compact (15/15 full), accurate 13–14 |
  | Gemma 3 12B | RTX 3090 | 4.2 s | 9.9 s | 11–12/15, accurate 11–14 |
  | Gemma 4 31B | RTX 3090 | 34.9 s | — | ruled out |

  Full tables: [E-001](../features/E-001-gemma4-and-gpu.md).
- **Evidence:** the maintainers' experiment folder `2026-10-08-gemma4` (bench JSON, every answer, both judges'
  notes, the scripts, the pod logs).
- **Caveats:**
  - 15 of our own cases, an AI judge, one run.
  - Synthetic bursts, not real use.
  - Ollama's memory figures for E4B and 31B were implausible, so download sizes are used.
  - E4B was not measured on a small (8–12 GB) card.
- **Decision / follow-up:**
  - Gemma 4 passes ADR 0018's AI-judged tests at node precision.
  - Recommended: Afribit's GPU server = a 24 GB RTX 3090/4090-class card running 26B-A4B; small nodes run
    E4B.
  - The live switch waits for the reviewers' blind comparison, which adds both Gemma 4 models to the pack.

### 2026-10-08-c — F-001, F-002, F-003 built and verified
- **What:** release-style check of three new features: the model-location label, privacy settings, and
  "say it your way".
  - Standing tests (`pnpm test`).
  - Typecheck of the API and the web app.
  - Web build, and Playwright browser journeys (desktop and mobile).
  - A real-PostgreSQL check of the new SQL.
- **Code:** `feat/frontend-rework` @ `bb9b7b6` **with uncommitted changes**. New: migrations 016 and 017,
  `apps/api/src/privacy/*`, `apps/api/src/teach/*`, `routes/privacy.ts`, `routes/teach.ts`, web
  `lib/privacy.ts`, `PrivacyLine.tsx`, `TeachDialog.tsx`, and the pilot console's Suggestions tab.
- **Config:** Windows 11, Node 24.20.0, pnpm 11.25.0. No Docker. PostgreSQL via PGlite 0.5.8 (WebAssembly),
  with vector columns swapped for arrays, since PGlite has no pgvector.
- **Result:**
  - `pnpm test`: exit 0, **513 checks**, including the new `test:privacy` (22) and `test:teach` (12), and web
    Vitest 57.
  - Typecheck clean.
  - Web build passes.
  - **Playwright: 35 passed**, including the new journeys "privacy label follows the server, and Delete
    everywhere deletes on the server" and "say it your way…".
  - **SQL check: 15 passed**: all migrations apply (001–017); the retention sweep (and its open-report
    exception); report-text expiry; deletion cascades; account deletion (keep, delete, last-admin refused);
    the review queue's fallback to shared text; suggestions (create, the daily limit, queue counts, approval
    creating a correctly flagged phrase that the language-example query finds, the two-reviewer rule,
    deletion clearing shared text).
- **Evidence:** the maintainers' experiment folder `2026-10-08-privacy-sql` (the SQL check script). The
  feature specs list the files and tests.
- **Caveats:**
  - Not deployed.
  - Not committed (so no commit hash pins this result).
  - The SQL check is not in CI yet. Adding PGlite as a devDependency is recommended (dependency register
    §5b).
  - Approved suggestions reach prompts only in Sheng and mixed modes (F-003 "as built").
- **Decision / follow-up:** commit; deploy with migrations 016 and 017 (backup first); set `CHAT_RETENTION`
  per deployment; write F-004 (gap list) and F-012 (invitation-only accounts).

### 2026-10-08-b — Gemma 4 vs Gemma 3, with and without the engine (E-001, part 1)
- **What:** live evaluation. 15 language cases × 3 models × 3 setups (full prompt, compact prompt, bare model
  with no cards), scored by the communication rubric judge and the factual-accuracy judge.
- **Code:** `feat/frontend-rework` @ `bb9b7b6`, **with uncommitted changes** (prompts built from the working
  tree).
- **Config:**
  - Generated models (OpenRouter, zero-data-retention routing, thinking off): `google/gemma-3-12b-it`,
    `google/gemma-4-26b-a4b-it`, `google/gemma-4-31b-it`.
  - Settings: temperature 0.3, 500 tokens, hosted precision.
  - Judges: `openai/gpt-5.6-terra`.
- **Result:**
  - Gemma 4 26B-A4B compact: rubric 15/15, accurate 15/15.
  - Gemma 4 31B compact: rubric 15/15, accurate 14.
  - Gemma 3 12B compact: rubric 13/15, accurate 13.
  - With the full prompt: Gemma 4 26B 14/15 (11 accurate), Gemma 4 31B 15/15 (13), Gemma 3 12B 10/15 (9).
  - Bare models without the engine: rubric 1–2/15, accurate 3–6, inaccurate 1–3.
  - Full table: [E-001](../features/E-001-gemma4-and-gpu.md).
- **Evidence:** maintainers' experiment folder `2026-10-08-gemma4` (every answer, both judges' notes, the
  scripts).
- **Caveats:**
  - One run, an AI judge, and our own 15 cases, which were used for prompt tuning.
  - The bare setup was not told it is a Bitcoin assistant.
  - Gemma 3 12B full went from 15/15 on 2 October to 10/15 today, so variation is large.
  - Not yet at 4-bit node precision.
- **Decision / follow-up:**
  - Gemma 4 passes ADR 0018's first test.
  - 26B-A4B is the leading candidate: equal quality to 31B at about half the answer time.
  - Next: the 4-bit GPU measurements on RunPod (E-001 part 2), the community benchmark (E-002) and the
    reviewers' blind comparison.
  - The default has not switched yet.

### 2026-10-08-a — Baseline of the standing tests
- **What:** `pnpm test` (all 17 suites).
- **Code:** `feat/frontend-rework` @ `bb9b7b6`, **with uncommitted changes** (a large staged open-source
  and frontend change set). This result can't be reproduced from a commit until that work is committed.
- **Config:** Windows 11, Node 24.20.0, pnpm 11.25.0. No database, no model endpoint.
- **Result:** exit code 0. All suites pass, 468 checks (counts in section 1).
- **Evidence:** this entry. The raw log was not kept; future runs should save theirs.
- **Decision / follow-up:** started this log and the dependency register. Commit the working tree so later
  entries can cite clean commits.

### 2026-10-03 — Answer speed, hosted model, full vs compact prompt
- **What:** five Sheng questions, one run each, Llama 3.3 70B through OpenRouter, timed from a laptop.
- **Result:** full prompt (~5,700 tokens): median 12.1 s, slowest 21.2 s. Compact prompt (~900 tokens): median
  6.3 s, slowest 13.2 s. In 2 of about 12 early calls the default model went over the old 15 s limit and the
  fallback model answered.
- **Decision:** `default_chat` timeout raised to 30 s.
- **Caveats:** five questions, one run each.

### 2026-10-02 — Model search, harness, retrieval, GPU, grounding (several runs)
- **Model search** (15 cases, hosted, rubric judge):
  - Gemma 3 12B 15/15 and Gemma 4 26B-A4B 15/15.
  - gpt-oss 120B 13 and Qwen3.5 27B 13.
  - Gemma 3 27B 12 and Qwen3.5 9B 12.
  - Llama 3.3 70B 11.
  - Gemma 3 4B 9; Qwen3 family weak in Kiswahili (0/3 from 8B to 32B).
- **Pilot box** (2014 desktop, 4 GB GPU, 4-bit):
  - Gemma 3 12B passed 4/4; Qwen3 8B passed 0/8.
  - 1.5 tokens/s, 32–85 s before the first word. **Not viable for live chat.**
- **Compact prompt vs full prompt** (language rubric, then accurate answers out of 15):

  | Model | Full prompt | Compact prompt |
  |---|---|---|
  | Llama 3.3 70B | 11, 9 accurate | 15, 12 accurate |
  | Gemma 3 12B | 15, 6 accurate | 13, 11 accurate |

  Fluent-but-wrong was caught by a separate accuracy judge.
- **Restaurant pipeline:**
  - Full pipeline scored 14 on the rubric, 13 accurate, 0 inaccurate.
  - On questions the cards cover, it is no more accurate than a good compact prompt.
  - Privacy probe: 2 of 6 messages leaked a detail before the scrubber was added.
- **Retrieval** (40-question benchmark, right card in the top 3):
  - 25% before the fixes.
  - 82.5% after rank fusion ([ADR 0011](../adr/0011-rank-fusion-for-retrieval.md)).
  - **97.5% with bge-m3** ([ADR 0013](../adr/0013-local-embeddings.md)).
  - 100% on the waiter's English question.
- **Rented GPUs, Gemma 3 12B at 4-bit:**
  - RTX A4000 16 GB: about 20 tokens/s; 4 people at once answered in 14.4 s.
  - RTX 3080 10 GB: about 31 tokens/s; one answer in about 6 s.
- **Off-topic probe:** 4 of 5 off-topic questions were declined; one was answered from the model's own memory.
- **Grounding check:** 45 live answers, 9 flagged, several of them false positives. Left in log-only mode.
- **Caveats:** one run per case, an AI judge, the same 15 cases used for tuning, and a benchmark we wrote
  ourselves.
- **Decisions:**
  - Node default moved to `gemma3:12b`.
  - Compact prompt became the top engineering item.
  - Rank fusion and bge-m3 deployed.
  - Compact prompt, waiter and restaurant left off until community reviewers compare them blind.

### 2026-10-01 — Small models on a laptop CPU (Run 1)
- **What:** 15 cases, production prompt, 4-bit GGUF, llama.cpp, rubric judge.
- **Result:**
  - Qwen3.5 2B 3/15.
  - Llama 3.2 3B 0/15, Llama 3.2 1B 0/15, Gemma 3 1B 0/15.
  - Frequent looping. 12–31 s just to read the prompt.
- **Decision:** a 1–3B base model can't serve Sheng or Kiswahili. On-device generation parked;
  community node chosen ([ADR 0007](../adr/0007-community-node-and-tiered-clients.md)).

### 2026-09-23 — Fallback model bake-off
- **What:** five candidate fallback models, same prompts, communication rubric.
- **Result:**
  - gpt-4o-mini: average 1.75/2, 0 of 4 hard failures.
  - The previous fallback, Llama 3.1 8B: 1.00/2, 2 of 4 hard failures, including an outright error and
    incoherent Kiswahili.
- **Decision:** `fallback_chat` switched to gpt-4o-mini.

### 2026-09-17 — Sheng register on the hosted 70B
- **What:** chat evaluations on Sheng and mixed-language questions.
- **Result:** Llama 3.3 70B opened and closed answers in Sheng but wrote the body in formal Kiswahili. A
  prompt fix alone didn't clear it.
- **Decision:** Sheng and mixed-language chat routed to a stronger hosted model (`sheng_chat`). Later work
  showed a compact prompt helps more.

### 2026-10-26-a — F-014 conversation authorization, local implementation

**Revision:** uncommitted working tree based on `965d4c3`. **Scope:** local development and synthetic data;
no deployment, external model calls, GPU rentals or production database migration.

- [F-014](../features/F-014-private-conversation-access.md) adds account ownership and hashed, expiring
  guest capabilities for chat/streaming/history, linked feedback/suggestions and scoped deletion. Verified
  account auth replaces the external-user header on preferences. Guest browser credentials are retained
  across reloads and carried outside URLs. Learner account UX and community enrollment remain unbuilt.
- **Migration 020** applies with all prior migrations in PGlite PostgreSQL. The database suite now passes
  **38 cases**, including 13 new authorization/transport cases. It exercises known foreign IDs, guest token
  substitution/expiry, legacy ownerless rows, NULL/wrong pack scope, direct service calls, no-retention
  reads, linked-resource consistency, token issuance/revocation, selective bulk deletion and preferences.
- The complete `pnpm test` suite passes; browser unit tests pass **66 tests across 8 files**, including
  five new guest-capability tests. The GPU gate retains its **14 passing tests**. Tests use model stubs,
  public secret test vectors and the embedded PostgreSQL database; no provider credentials are required.
- `pnpm typecheck` and `pnpm build` pass across the workspace. This does not constitute a live deployed
  browser/device journey, performance evaluation, independent security audit or confidential-compute proof.
- **Compatibility:** coordinate migration/API/client deployment. Old ownerless sessions have no capability
  and cannot be reopened by ID; browser-local copies remain. Public pack names are not private-community
  membership checks. The application still trusts its host administrator and shared browser profile.

### 2026-10-26-b — F-015 learner identity and community enrollment

**Revision:** uncommitted working tree based on `965d4c3`, continuing F-014. **Scope:** local synthetic
data; migrations 020/021 applied only in embedded PostgreSQL. No production migration, rented compute,
provider/model calls or external authentication service.

- [F-015](../features/F-015-community-membership-and-learner-accounts.md) adds a learner role, atomic scoped
  invitation redemption, community membership and opt-in members-only policy. Protected routes and chat
  setup check current membership, including implicit continuation through a public pack. Revocation blocks
  later requests with a live JWT or a guest capability. Owner-authorized erasure remains available.
- **48 PostgreSQL cases pass**, including ten new membership cases covering public/private policy, public
  metadata redaction, scoped/expired/revoked/reused invitations, duplicate-email rollback, least privilege,
  login, own conversation listing, live-JWT revocation, bootstrap-role demotion and cross-pack contribution
  references. **73 browser unit tests pass**, including seven new account/guest storage and request-race
  cases. The full `pnpm test`, workspace `pnpm typecheck` and `pnpm build` pass.
- **Seven selected desktop browser regression journeys pass:** streamed answers/reload, secret refusal,
  offline drafts, contributor sign-in/contribution, history refresh/removal, deletion/privacy labels and
  installed offline shell. API responses are mocked; unavailable local `/pack` requests exercise the
  existing built-in fallback. These are not live-model or deployed API checks.
- A Playwright CLI check against the built app with [synthetic API responses](../../output/playwright/f015-synthetic-fixture.js)
  demonstrated learner A sign-in, a streamed answer and a draft; sign-out; learner B sign-in and B-only
  history. The browser reported `accountTextOnDisk: false`, `previousAccountVisible: false`,
  `ownHistoryVisible: true` and `oldDraftVisible: false`. No browser console errors were observed.
  [Mobile account view](../../output/playwright/f015-account-b-mobile.png).
- React review covered external-store identity subscriptions, keyed workspace resets, abort/cleanup of
  requests, suppression of late cross-identity results, labelled inputs and account-panel layout. A
  streaming fallback now stops when the identity changes rather than resending the old question under
  the new account. Membership retry and reconnect paths are available.
- New English/Kiswahili/Sheng copy passes the translation-key check (359 keys per locale); community
  language review is still required. Account preferences are currently ephemeral. Long-term memory,
  private-document/team permissions, recovery/verification and 4-of-7 governance remain separate work.
- The [operator guide](../guides/community-membership.md) describes enabling private access, creating and
  revoking invitations, joining and revocation. Enrollment/policy changes remain trusted administrator
  powers. No host-confidential or complete private tenancy claim is made.

### 2026-10-26-c — F-011/F-016 personal memory and reviewed snapshots, local proof

**Revision:** uncommitted working tree based on `965d4c3`, continuing F-014/F-015. **Scope:** local
synthetic data and embedded PostgreSQL. No production migration/deployment, GPU rental, external model
call or training run; compute spend **USD 0**. Migration 022 applies after 020/021 in the database checks.

- Private notes are off by default, limited to 20 × 500 characters, owner/pack scoped and editable with
  versions. Remote permission is independent and defaults false. No automatic extraction or training.
- Actual synthetic full/compact/stream/restaurant answer construction verifies account separation and
  final-answer-only context injection. Local-only notes stay out of remote prompts; conversations that
  used them retain a routing restriction after memory disablement. Real gateway/provider calls against
  localhost mocks reject remote primaries/fallbacks and HTTP redirects before sending private context.
- Review tests cover explicit snapshot consent, stale versions, unrelated private revisions, self and
  duplicate approvals, current roles/membership, two approvals, same-domain cross-pack retrieval,
  immutable generated cards, withdrawal and account keep/delete choices. Withdrawal removes chunks,
  cascading synthetic embeddings and stored versions; account feedback/flag queues redact unattached text.
- Generic exports, dataset campaigns and embedding backfill exclude these snapshots. Ordinary card
  creation with a topic still works. The PGlite adapter now matches pg's SELECT row count (PGlite's
  `affectedRows` is zero for SELECT); migrations use arrays in place of pgvector, so this does not test
  real vector similarity or an ANN index.
- Validation: `pnpm test` (including **59 PostgreSQL cases**, **76 web unit cases / 10 files** and
  **14 GPU-gate cases**), `pnpm typecheck`, `pnpm build`. Seven selected existing desktop browser
  journeys cover streaming/history, secret refusal, offline draft, contribution, history removal,
  privacy/deletion and the installed shell.
- The CLI browser journey in `output/playwright/f011-browser-check.js`, with its synthetic fixture,
  exercises saving, editing, remote permission, consent-gated sharing, successful 204 withdrawal/deletion,
  erase-all/disable and A→B account switching; private note text is absent from localStorage. The mobile
  capture `output/playwright/f011-member-b-mobile.png` was visually inspected at 390px with no horizontal
  overflow. Backend authorization/review is checked separately against real SQL, not inferred from mocks.
- Findings fixed: consent checkbox state flickered while awaiting the server; it now updates immediately
  and rolls back on failure. One existing browser assertion raced the deletion response; it now polls
  persisted history before asserting erasure. Final browser rerun: **7 passed**.

**Limits:** local host/configuration remain trusted, no attestation; promoted cards are lexical-only;
new memory copy is English pending community translation review. No real-device Mesh, model quality,
cost/latency, backup-erasure replay/restore or document/team ACL proof. P0/P1/P2 remain in progress.
See the [memory guide](../guides/personal-memory.md) for the coordinated release and remaining gates.

### 2026-10-26-d — F-017 early processing policy and direct card answers

**Revision:** uncommitted working tree based on `965d4c3`, continuing F-014/F-015/F-011/F-016. Local
synthetic fixtures; migration 023 applied in embedded PostgreSQL only. No deployment, real model call,
training, rental or production database changes. Paid compute **USD 0**.

- Conversation policy now precedes question insertion and all auxiliary calls. Local-only remains local
  across rewrites, embeddings, the final answer and background gap labels; nested helpers cannot weaken
  it. History is captured with policy, before waiting for external work or inserting the current turn.
- Real gateway/providers against two localhost HTTP fixtures verify explicit/inherited local policy,
  cloud/restaurant and hybrid behavior, 503/429 fallbacks, forbidden remote-node/embedding endpoints,
  redirects, parallel scope isolation and an earlier remote turn paused while a later local-only turn
  completes. Synthetic canaries in that later turn never reach the remote fixture. Retrieved routing
  instructions cannot override policy. No-retention browser history stays local; secret refusal persists.
- Reviewed-only direct/stream requests produce approved text or a no-card response with **zero model
  and embedding calls**. Effective policy and source persist through authorized API reload. Generic
  per-deployment inference behavior remains available to configured requests. No GPU efficiency claim
  is inferred from these fixtures; real vector search is outside PGlite's array substitution.
- Validation: `pnpm test`, `pnpm typecheck`, `pnpm build`; **74 PostgreSQL checks**, **77 web unit tests
  across 10 files**, **14 GPU-gate checks**. Seven selected existing desktop browser journeys passed.
  The privacy API's no-retention expectation was updated for its new effective-policy field.
- CLI browser journey `output/playwright/f017-browser-check.js`, with the matching synthetic fixture,
  verifies direct-card source labels, locked policy controls, resume metadata and mobile layout at
  390px with no horizontal overflow. `f017-reviewed-mobile.png` was visually inspected; reduced-motion
  capture avoids transient animation opacity. Browser mocks complement, not replace, real SQL/transport
  checks. New privacy controls remain English pending community review.
- Machine-readable evidence: `output/proof/p3-processing-trace.json` contains case names, local/remote
  call counts and pass status only. No prompts, headers, keys or account content are written there.

**Still open:** provider/model/region allowlists, monetary ceilings, bounded context policy, model quality
and workload/latency, real Mesh trials, document/team ACLs, backup erasure replay/restore and TEE proof.
P3 is in progress. [Guide](../guides/processing-policy.md), [spec](../features/F-017-processing-policy-and-reviewed-answers.md).

### 2026-10-26-e — F-018 compute admission and bounded requests, local proof

**Revision:** uncommitted working tree based on `965d4c3`, continuing the community privacy slices.
Migration 024 is applied only in embedded PostgreSQL. Synthetic localhost transports, no external model
calls, rental, training, deployment, upstream account changes or production migration. Paid compute **USD 0**.

- API startup enables admission before accepting requests. Missing/disabled policy denies model and
  embedding work while reviewed-card answers remain available. Exact provider/model/endpoint routes,
  requested regional base URLs, context/output bounds and daily per-community allowances are checked
  before dispatch. Processing privacy restrictions still take precedence over an approved route.
- Versioned policy updates require a current administrator. SQL reserves the full allowance and an
  attempt slot atomically; concurrent admissions, separate communities, UTC buckets, stale versions,
  policy-storage failures and edits/re-enablement are covered. Failed, cancelled and successful attempts
  retain their reservations. A reported overrun disables further dispatch without resetting consumption.
- Real local HTTP fixtures verify OpenRouter upstream/price preferences, local models/embeddings,
  allowed/denied fallbacks before stream output, no fallback after partial output, timeout transport
  closure, a stalled stream's whole-attempt deadline and generator cancellation. Ledger/audit checks
  exclude synthetic private text and keys. The local-only operator example passes policy validation.
- Validation: `pnpm test`, `pnpm typecheck`, `pnpm build`; **94 PostgreSQL checks**, **77 web unit tests
  across 10 files**, **14 GPU-gate checks**. No new UI or browser journey is part of this backend slice.
  [Aggregate proof](../../output/proof/p3-compute-allowance-proof.json) records synthetic status and
  reservation counts/amounts without prompts, account content or credentials.

**Limits:** an application dispatch allowance is not a vendor invoice or hourly-GPU cap. Real upstream
pricing/tokenization, regional residency, production PostgreSQL contention and rental shutdown are not
proven. Trusted CLI evaluations do not automatically enable API admission; a separate overall-budget
controller is required before P4 paid comparisons and the proposed USD 10 showcase. Hosted embeddings
remain disabled under enforcement pending a verified upstream/pricing adapter. P3 remains in progress;
Mesh trials, document/team ACLs, quorum governance and TEE attestation remain later gates. See the
[operator guide](../guides/community-compute-policy.md) and [F-018](../features/F-018-community-compute-allowances.md).

### 2026-10-26-f — F-019 reproducible evaluation runner, localhost proof

**Revision:** uncommitted working tree based on `965d4c3`. No production migration, deployment, GPU
rental, training or external model call. Paid compute **USD 0**. No new dependency or database migration.

- `showcase:eval` defaults to dry-run: bundled pack and four synthetic cases validate to eight paired
  attempts. Fixed bare/supplied-context variants use the same candidate, temperature/output settings
  and questions, with explicit fallback-free profiles. Source, pack, plan, benchmark and runtime settings
  are fingerprinted. Full retrieval, memory and safety post-filter paths are deliberately outside this
  generation comparison and are not inferred from it.
- Persistent experiment reservations precede dispatch, include a held-aside/non-model envelope, and
  retain successes, missing costs, failures and cancellation. Lock, crash/corruption handling, restart
  limits, immutable inputs, concurrent attempts, persistence failure and reported-overrun stops pass.
  The envelope never grants more than USD 10 and requires at least USD 2 held aside; it is not an actual
  invoice/rental cap or shared accounting across independently created ledgers.
- Real existing providers/gateway against a localhost HTTP fixture cover paired OpenRouter preferences,
  separate local candidate models despite deployment overrides, one/four-worker scheduling, interrupted
  and oversized output, timeouts, external cancellation and whole-invocation deadlines. Cleanup waits
  for settlement before unlocking; an overdue settlement retains the lock and persists a stop. This
  fixes a race discovered during testing where late settlement could follow ledger closure.
- Anonymous shuffled reviewer files omit structural model/variant identity and contain blank human
  scores. Operator artifacts retain the mapping, partial outputs, timing, usage and reservations.
  Synthetic credential checks pass; raw provider error bodies are not persisted in runner artifacts.
- Validation: `pnpm test` (including **14 showcase checks**, **94 PostgreSQL checks**, **77 web unit
  tests / 10 files**, **14 GPU-gate checks**), `pnpm typecheck`, `pnpm build`, `git diff --check`.
  The default CLI dry-run also succeeds. No UI change or new browser journey is part of this slice.
  [Aggregate evidence](../../output/proof/p4-showcase-runner-proof.json) records counts and limitations.

**Not established:** real model availability, verified digests, language quality, human scoring,
tokenizer/price conformance, upstream account limits, rental lifecycle/watchdog/final bill, real CPU/GPU
capacity or Mesh/TEE behavior. Model revisions may be operator-declared/unverified. P4 is in progress;
E-002 still requires independent community benchmark/review work. See [F-019](../features/F-019-showcase-evaluation-runner.md)
and the [operator guide](../guides/showcase-evaluation.md) for paid-execution gates and recovery limits.

### 2026-10-26-g — F-020 every-trial documentation and a scoped rental watchdog

**Revision:** uncommitted working tree based on `965d4c3`. **Scope:** synthetic localhost fixtures,
fake lease clocks and dry-run/refusal CLI invocations. No real RunPod account/resource call, rental,
external model call, training, deployment or production migration. Paid compute **USD 0**.

- The user's requirement to document every trial is now a standing rule in the
  [trial register](../evaluation/trials/README.md). Showcase/rental CLIs document before validation,
  including previews and expected invalid-argument failures. UUID records retain timestamps, commands,
  input/source hashes, phases, outcomes, cost status and artifact links. Unknown external bills stay
  null; unfinished/crashed records are not successes. Earlier evidence is not retrospectively invented.
- Model attempts now emit start and result metadata without prompt text; manifests/operator files link
  to their trial ID. Library invocations also document preflight failure. Local model-runner suite
  invocations record all cases and finish explicitly with zero external use, including negative paths.
- F-020 adds a default-preview, minimal RunPod REST v2 adapter and independent watchdog CLI. It never
  creates/starts resources or deletes independent storage. A frozen, locked Pod lease checks ID, exact
  name/creation timestamp, disk scope, locks/cluster, quote ceiling, startup-inclusive deadline and
  projected allowance. Its maximum rental allowance must fit the evaluation plan's non-model reserve.
- **14 rental/documentation checks pass:** durable success/failure/unfinished records; malformed leases;
  sanitized responses/redirect refusal; deadlines/budget grace; backward clocks/persisted restart time;
  concurrency; ownership/creation/storage changes; auth/rate limits/404; bounded DELETE retry/timeouts;
  accepted-but-unconfirmed cleanup; price/completion/cancellation/stopped triggers; journal failure;
  both CLIs' preview and validation-refusal records; absence of secret bodies and unrelated API routes.
  The updated **14 showcase checks** also verify attempt-start/result records and artifact linkage.
- Findings addressed during development: count every request in shutdown grace, preserve elapsed time
  across clock changes/restarts, re-read historical absence, and retain an attention state while still
  attempting scoped cleanup if documentation fails after arming. These are fixture-tested safeguards,
  not a demonstrated real-provider spending cap. No unexpected failing suite was hidden; deliberate
  invalid-argument trials remain recorded as failures while their refusal tests pass.
- Validation: `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`. Final full suite includes
  **94 PostgreSQL checks**, **14 showcase checks**, **14 rental checks**, **77 web unit tests / 10 files**
  and **14 GPU-gate checks**, plus the other API suites. Initial typechecks and focused suite reruns also
  passed. No UI change/browser journey is part of this backend/tooling slice. The latest aggregates
  [rental proof](../../output/proof/p4-rental-watchdog-proof.json) and
  [runner proof](../../output/proof/p4-showcase-runner-proof.json) link their own retained UUID trials.

**Limits:** no actual quote, model availability/digest validation, real provider conformance, independent
supervisor, billed amount, real storage termination or invoice reconciliation. A DELETE 204 is accepted,
not sufficient; only later observed absence after verified ownership is recorded as cleanup, and
`billReconciled` remains false. Control-plane/host/disk failure can still prevent shutdown. Upstream
account limits and independent crash recovery remain paid-run gates; the $10 envelope is not an invoice
guarantee. P4 stays in progress. [Spec](../features/F-020-trial-records-and-rental-watchdog.md),
[rental guide](../guides/rental-watchdog.md), [all documented trials](../evaluation/trials/README.md).

### 2026-10-26-h — QVAC research and F-021 model artifact discovery

**Revision:** uncommitted working tree based on `965d4c3`. **Scope:** official QVAC documentation/source,
Hugging Face model cards, localhost fixtures and one explicit public-metadata trial. No QVAC installation,
weight download, inference/training, RunPod/account action, deployment or production migration. Paid
compute **USD 0**. No new runtime dependency or migration.

- [Research assessment](../research/2026-10-26-qvac-and-afribit-fit.md) distinguishes QVAC's local SDK,
  model distribution and native GPU RPC from Afribit's community authorization, reviewed knowledge and
  compute-policy responsibilities. Its current RPC docs require a trusted private network and disclose
  no authentication/encryption on that native transport; no attested-host claim follows. The documented
  HTTP interface is an integration hypothesis, not a QVAC runtime test performed here.
- Intended task is recorded separately from a text-generation tag: AfriSLM is a translation hypothesis,
  Genesis III combined is a base research checkpoint excluded from chat, and biomedical adapters need
  matching bases and do not establish general-chat/clinical readiness. Software, weight, base, adapter
  and dataset licensing are separate; publisher Apache labels do not clear the NC synthetic dataset.
- F-021 adds a strict five-entry catalog, default offline preview and an explicit bounded public metadata
  reader. It sends no token/cookies/provider credentials, refuses arbitrary origins/redirects, validates
  repository revision and safe weight paths, and records hashes, selected files and missing information.
  Advertised artifact hashes remain unverified; RAM and language quality remain unmeasured. No discovery
  result activates a compute route or generates a runnable paid plan automatically.
- Actual trial [b236ab4f](../../output/trials/b236ab4f-cb46-43a0-a562-1f9dc43ee008.json),
  [metadata reports](../../output/discovery/b236ab4f-cb46-43a0-a562-1f9dc43ee008/summary.json): **5/5 public
  metadata requests succeeded**, zero weights/model calls, paid compute USD 0. The selected AfriSLM Q4
  files report **672,329,792 bytes** (0.8B) and **1,560,461,376 bytes** (2B), with exact commits and full
  advertised SHA-256 saved. These are Hub observations, not peak RAM or downloaded-byte verification.
- Default discovery preview also succeeds with **zero metadata requests**, documented in trial
  [1b12120a](../../output/trials/1b12120a-aa1b-4eb7-b54f-eb7fbdee8da7.json). Six fixture checks pass for
  catalogs, task gating, exact provenance, missing fields, safe origins/paths, no credentials or weight
  requests, and redirect/HTTP/JSON/size/timeout failures. Each case/outcome is recorded in its suite trial.
- Validation: `pnpm test`, `pnpm typecheck`, `pnpm build`, `git diff --check`. Full suite includes
  **6 discovery checks**, **94 PostgreSQL checks**, **14 showcase checks**, **14 rental checks**,
  **77 web unit tests / 10 files** and **14 GPU-gate checks**, plus other API suites. Focused discovery and
  API typechecks also passed. [Latest fixture proof](../../output/proof/p4-model-discovery-proof.json)
  links its own retained UUID record. No UI change/browser test was required for this tooling slice.

**Limits:** primary product/model claims remain publisher claims. No qualified Sheng benchmark, human
review, runtime compatibility/performance, weight integrity, commercial data clearance, provider quote,
supervision/termination/bill reconciliation or TEE has been proved. P4 remains in progress; QVAC is a
candidate component, not a confirmed replacement or partnership. [Spec](../features/F-021-model-discovery-and-artifact-provenance.md),
[discovery guide](../guides/model-discovery.md), [trial register](../evaluation/trials/README.md).

### 2026-10-27-a — F-022 first real local CPU generation, quality hold

**Revision:** uncommitted working tree based on `965d4c3`. **Scope:** pinned portable Windows CPU
runtime, one downloaded upstream 0.8B model and internal synthetic prompts. No RunPod/account action,
paid model API, production migration/deployment, training or real learner data. Paid API/rental charges
**USD 0**; power, connectivity and local storage costs unmeasured.

- Readiness checks found approximately 15.7 GiB usable RAM, an i7-13650HX and a listed RTX 3050 6 GB.
  Docker's Linux engine was unavailable and no model runtime was on PATH. We used a portable CPU-only
  llama.cpp b11669 archive, not the GPU or a QVAC SDK install. Exact archive/model sizes and published
  SHA-256 were checked, including disk read-back, before extraction/loading. Cache/binaries are ignored
  by Git; no package/driver/global runtime or PATH change was made.
- Actual execution [e275039e](../../output/trials/e275039e-9b81-4e21-9c17-6e65f1268190.json) completed
  **8/8 generation requests technically**, through the existing local provider/gateway and isolated
  admission. The server was loopback, CPU-only, six threads, one slot, 16,384-token context, thinking off;
  output ceiling 160 tokens, temperature zero, one repetition. Missing/wrong keys returned 401;
  authenticated alias verification passed. The owned process exited. No external inference fallback.
- Observed first content **0.45–28.06 s**, full request **2.01–36.09 s**; Windows peak working set
  **1,593,630,720 bytes (~1.48 GiB)**. Four outputs reached their token ceiling. Eight samples from one
  non-isolated laptop session do not establish p95, concurrency, GPU performance, minimum hardware or
  total cost. Prefix cache warmth and background test work were not controlled.
- A separate [AI inspection trial](../../output/trials/43c8ace0-964b-4980-9521-6a96d6bfe6a7.json) is
  `needs-attention`, preserving the original technical-completion record. Bare answers repeat/invent;
  the context-assisted recovery-phrase answer omits the required clear refusal; the context fixes one
  fictional desk fact but adds unrelated wording; unknown-trainer answers remain unreliable. **Hold
  this exact checkpoint/recipe from learner use.** No blind human score or model winner was produced.
  [Actual report](../evaluation/trials/2026-10-27-local-cpu.md),
  [machine summary](../../output/proof/p4-real-local-cpu-proof.json).
- Failures remain documented: the first typecheck found a duplicate summary property; corrected. Archive
  fixture trial [49f5ef4c](../../output/trials/49f5ef4c-3eb0-4bbe-9173-bcf1022d3146.json) failed after
  four checks because fixture creation lacked the .NET compression assembly. That setup was fixed and
  archive guards strengthened for terminating path/ADS/symlink refusal before extraction. Subsequent
  suites pass **5 artifact checks**; [latest proof](../../output/proof/p4-artifact-verification-proof.json).
- Cached verification [f08980fa](../../output/trials/f08980fa-722b-4fd4-9759-2c481c0ddd74.json) was
  refused at ~2.17 GB free RAM during build/test activity. Generation's memory guard had also applied to
  acquisition-only work; it was narrowed and generation rechecked after acquisition. Corrected cached
  trial [158cd97d](../../output/trials/158cd97d-a919-4fb2-bb57-2b76c7752085.json) passed with **zero newly
  transferred bytes/model calls**, validating current extraction/help behavior. An intermediate cache
  result's legacy `downloadedBytes` meant artifact size; new records separate transfer from size.
- Validation: full `pnpm test`, workspace `pnpm typecheck`, `pnpm build`, `git diff --check`; final cached
  verification/API typecheck and build after reporting/resource-guard refinements. Full suite includes
  **5 artifact**, **6 discovery**, **94 PostgreSQL**, **14 showcase**, **14 rental**, **14 GPU-gate** and
  **77 web unit cases / 10 files**, plus other API suites. No UI/browser journey was changed.

**Limits and next:** generation used supplied passages/full product prompts, not actual retrieval,
account memory or the normal safety post-filter path. No learner release, clinical readiness, Mesh,
OS-level no-egress proof, host-confidential execution or training claim. Compare a stronger instruction
model and shorter prompt before fine-tuning; maintain the independent paid-rental/supervision/billing
gates. P4 stays in progress. [Spec](../features/F-022-verified-local-inference-trial.md),
[guide](../guides/local-cpu-trial.md), [all trial records](../evaluation/trials/README.md).

### 2026-10-27-b — hosted model generation, QVAC clarification and GPU quotes

**Revision:** uncommitted tree based on `965d4c3`; no production code or deployment changes. Edmund
clarified that the proof should prioritize hosted models/rented GPUs over further laptop downloads,
with no fine-tuning yet. The [harness discussion](../research/2026-10-27-hosted-compute-and-community-harness.md)
separates model competence, language guidance, authorized RAG, personal memory and optional adapters.
QVAC is a possible reusable runtime/SDK; it has not been installed or benchmarked here.

- [All trial details](../evaluation/trials/2026-10-27-hosted-comparison.md): nine retained UUID invocations,
  including preflights, an import/config-loading failure, dry run, incomplete execution, diagnostics,
  a reference-length validation rejection, successful follow-up and independent AI inspection.
- Actual OpenRouter requests: **26**, with **13 successful responses and 13 failures/rejections**.
  Gemma 3 27B FP8/DeepInfra follow-up completed **8/8**, no truncation, first content **0.78–2.02 s**,
  full completion **3.04–8.24 s**. Claude Sonnet 4.6/Anthropic was rejected by ZDR routing; no privacy
  filter was weakened. Initial Gemma failure causes remain unresolved beyond coarse classification.
- Known reported costs **$0.00247344** matched the later account-usage increment; the immediate credit
  read had lagged. Per-error costs remain unknown; no invoice obtained. Retained request allowances
  total **$1.46**, plus the original **$2 held aside**, within the authorized $10. The inference key
  is uncapped; fixed-count text-only requests used upstream price/output bounds and application
  reservations, explicitly not a provider-enforced $10 key cap. Guide wording now distinguishes this
  bounded API case from rental lifetime controls. No key/account setting was changed.
- Read-only RunPod catalog returned lowest single-GPU quotes for RTX 4090 24 GB, L40S 48 GB and A100
  PCIe 80 GB; A6000 had no price. Quotes are not all-in/reserved deployment prices. Zero pods created.
- AI inspection found context corrected fictional desk times/price and withheld an unknown trainer
  name, while bare answers invented both. Supplied answers still falsely implied checking a roster,
  omitted requested content and exceeded brevity. **Quality hold, human review pending.** No model
  promotion, training, actual retrieval/account-memory pipeline, Mesh or TEE proof.
- Validation uses actual hosted artifacts, HTTP observations, persistent ledgers and a read-only cost
  check. Both new reports' **16 local links** resolve; all **9 trial JSON records** parse with completed
  lifecycle timestamps; documentation diff checks pass. The production test suite was not rerun
  because production source did not change. Earlier `2026-10-27-a` retains its full-suite results.

**Next:** isolate language guidance from supplied knowledge, run actual authorized retrieval with
separate accounts, qualify the serving recipe and independently supervised shutdown, then rent a GPU
for a narrow model/hardware measurement. The remaining $10 envelope is shared, not reset per trial.

### 2026-10-27-c — combined community API integration, partial hosted proof

**Revision:** uncommitted `965d4c3` base; final source hash
`9159fdd647ac40a7e6fc2f06931dd8fc04005a13b594484d74074bb3303ac64f`.
[F-023](../features/F-023-community-harness-proof.md) adds the default-offline combined harness to
`pnpm test`. The configured application database is never contacted; a fresh PGlite database applies
current migrations and uses lexical retrieval. Owned app/database/loopback servers close on success
and failure. Personal memory now shares the final user turn, preserving strict chat templates without
elevating its authority or changing account/pack/remote permissions.

- **9/9 integration checks** on final source: two member-only communities/four accounts; concurrent
  authorized retrieval/notes/history; known foreign IDs; membership denial before retrieval; no-model
  reviewed answers; no-remote local-only failure; deletion; remote note exclusions; inherited policy.
  Final local run `8e27186a` observed 15 loopback calls, 34 retrieval queries, no external calls.
- Real hosted API trial `e607a35c`: three model answers used the correct communities' numeric
  schedules/prices; fourth request HTTP 429 returned the approved B card locally. Acceptance remains
  **failed/partial**, not four model completions. All generated answers had incorrect/conflicting
  Kiswahili clock/daypart wording: model quality held, native-speaker review pending.
- Twelve trial records retain seed/provenance and deletion-status assertion mistakes, initial/local
  successes, DeepInfra/Parasail HTTP 429s, a Nebius unavailable preflight, bounded format probes and
  separate inspection. The merged-message probe succeeded, but normalized full execution also had a
  429; this does not prove the causes of upstream rate limits. No privacy restriction was weakened.
- Nine hosted requests: four successful responses (three pipeline, one diagnostic), five rejected.
  Known new charges **$0.00175896**, matching later account usage; session known total **$0.00423240**.
  Individual error costs remain unknown, no final invoice. All earlier allowances retained:
  **$1.505 request reservations + $2 held aside**, within the original $10. No ledger reset/refund.
- Full **`pnpm test`**, workspace **`pnpm typecheck`**, **`pnpm build`** pass. Standing tests include
  94 PostgreSQL, 9 new combined harness, 14 showcase, 14 rental, 6 discovery, 5 artifact, 14 GPU-gate
  and 77 web unit cases, plus other API suites. No UI change or deployment. All trials/evidence in
  the [actual report](../evaluation/trials/2026-10-27-community-harness.md),
  [guide](../guides/community-harness-proof.md) and [register](../evaluation/trials/README.md).

**Limits:** no actual local LLM, pgvector performance, private-document/team ACLs, heavy workload,
physical Mesh, rented serving stack, TEE or community language validation. P4 remains open; proceed
to provider lifecycle readiness and a narrow GPU serving trial, with no training.

### 2026-10-27-d — RunPod read-only lifecycle readiness

Two real read-only attempts (`6afaf7be`, `165ac1c7`) contacted the documented REST v2 organization/Pods
and GraphQL interfaces. They failed before HTTP responses; diagnostic codes are
`UND_ERR_CONNECT_TIMEOUT`. A public unauthenticated IPv4 curl probe also timed out after five seconds;
DNS resolved public addresses. This is not an auth rejection. No resource mutation, model call,
rental/download/training or charge. Live account balance/resources and watchdog schema conformance
remain unknown. Official API/schema pages reviewed; no provider guarantees inferred from docs.

[Report and next rental scope](../evaluation/trials/2026-10-27-runpod-readiness.md) preserve both trials
and the $10 shared envelope: $1.505 prior request allowances + $2 held aside leaves $6.495 unallocated
under reservation accounting. Known session model charges $0.00423240; no final invoice. Recheck
connectivity before renting; do not launch without a reliable control/cleanup path. No new runtime
source changed after the full tests/typecheck/build recorded in `2026-10-27-c`. Documentation diff
checks pass; all four new reports/spec/guide have **24 local links** verified and all **14 trial
records** parse with finalized lifecycle timestamps.

### 2026-10-27-e — GPU telemetry and isolated network failure

**Revision:** uncommitted `965d4c3` base, API/shared source hash
`63542ff9ec98d62e3e1de3eab517124a83f12af2329e793149c915e9ce7d2f9c`.
[F-024](../features/F-024-rented-gpu-telemetry.md) adds a portable Python-standard-library helper and
durable fixture launcher to `pnpm test`. No deployment, GPU use, model download, training or new spend.

- Fresh read-only readiness `a10f552f` still times out. Public isolation `6b3fb7c2`: GitHub/OpenRouter
  HTTP 200, RunPod default/both IPv4 paths connection timeouts. Legacy-host read `20e7100d` also
  times out. No credentials in public probes, no HTTP authentication verdict from failed reads, no
  DNS/VPN/firewall/proxy/account change. Root cause remains unknown beyond the tested connection paths.
- Helper records device VRAM/utilization/power and sampled maxima, bounded monotonic duration/query
  time/sample count, output ownership, partial failures and optional completion marker. Missing
  memory is not zero; an interrupted/failed collection cannot pass. It does not supervise rental
  billing or prove model GPU residency. Actual rental-host execution remains pending.
- Initial fixture trial `ae0e6e09` and full-suite `1edbed19` each pass **11 checks**. Final review added
  unexpected-adapter failure finalization; targeted trial `142b4414` passes **12**. Helper/test hash
  `d314121720ef62b260ad6ad51f3112fabe82dfd51e9331f1b87aa9c017c3cd32`. Python **3.12.10**, no pip packages.
  Fixtures include a no-GPU preview with a UUID artifact. All have zero actual GPU/account calls.
- Validation: **full `pnpm test`, workspace `pnpm typecheck`, `pnpm build` pass**. The final Python-only
  refinement passed the 12-case targeted rerun; production TypeScript behavior remained unchanged.
  Full suite also includes 94 PostgreSQL, 9 combined harness, 14 showcase, 14 rental, 6 discovery,
  5 artifact, 14 GPU-gate and 77 web unit cases, plus other API suites. Combined harness trial
  `ab4e5f56` passes 9/9 with no hosted requests. Deliberate rejection records are preserved by suites.
  Documentation diff checks pass; 14 local links across the new report, guide and spec resolve.

[All trial evidence](../evaluation/trials/2026-10-27-rental-preparation.md),
[telemetry guide](../guides/rented-gpu-telemetry.md), [register](../evaluation/trials/README.md).
Known hosted charges remain **$0.00423240**, conservative allowances **$1.505 + $2 held aside** under
the same $10. P4 still needs live lifecycle/cleanup access, a fixed model/runtime/quote, actual hardware
measurements, a final bill and community language review. No hardware result is inferred from fixtures.

### 2026-10-27-f — funded RunPod account verified, control access still intermittent

**Revision:** uncommitted `965d4c3` base; API/shared source hash
`ad3a09ad0934bc79a55bcf3f863849fcabb21a97981eb00f74ea0ad5ef8886da`.
Edmund confirmed the console opens. Read-only computer inspection made no clicks/submissions/logins;
the active browser tab changed during inspection and no unrelated browser content was saved in project
artifacts. No browser/network/security/account setting changed.

- Trial `d2872e97`: REST timed out, but GraphQL succeeded and validated the key/account: balance
  $12.8186071649, zero pods, $0/hour ongoing spend, automatic payment disabled. This separate account
  credit does not increase the original $10 showcase budget.
- `45085b06` schema probe timed out; `9234dcae` found OS/Google DNS agree and a public TLS1.2/HTTP1
  API probe returned 401. `e9f4875c` reached verified native TLS1.2 REST HTTP 200, but GraphQL HTTP400
  denied introspection. No introspection bypass, credential replacement or account mutation.
- [F-025](../features/F-025-runpod-https-compatibility.md) adds explicit `--transport https-tls12` to
  the existing GET/DELETE watchdog. Verified TLS/hostname checks, fixed origin/method scope, whole-
  request deadline, response bound, no redirect/retry/fallback; fetch remains default. Dedicated
  fixtures `06df5e9c` and full-suite `13f820fc` pass **7/7**; preview `2e822743` makes zero account calls.
- Implemented-client real read `05ec0f44` then timed out on its first request. Public family probe
  `a970fed1` reached a verified 401 via automatic IPv4 selection after another address timed out;
  forced IPv4 timed out and IPv6 lookup returned ENOENT. TLS/address-family cause and reliable fix
  remain unproved. No absent-ID/read/delete conformance result is claimed from the failed run.
- **Full `pnpm test`, API typecheck and workspace `pnpm build` pass.** Suite includes 7 new HTTPS,
  12 telemetry, 9 combined harness, 94 PostgreSQL, 14 rental, 14 showcase, 6 discovery, 5 artifact,
  14 GPU-gate and 77 web unit cases, plus other API checks. Existing deliberate-refusal trial records
  remain retained. No UI or production deployment change.

[All live/fixture trials](../evaluation/trials/2026-10-27-runpod-access-followup.md),
[watchdog guide](../guides/rental-watchdog.md). No new spend, pod creation/deletion, model download or
training. Known model charges $0.00423240; retained allowances $1.505 + $2 held aside from $10. P4
remains open for stable lifecycle access, exact serving quote/artifacts, independent supervision,
real cleanup verification, GPU measurements, invoice and community language review.

## 4. Release checks


Each deployment should add an entry. It needs at least: the `pnpm test` result on the exact commit deployed,
the images deployed, the models and digests served, and any live check run afterwards (for example a smoke
test with `pnpm smoke`). Releases are logged in section 3: entries 2026-10-08-e, -f and -h (API) and -j (web
app). Deployments before 8 October are recorded in the maintainers' operating notes. The proposal-ready
summary of all results is [evidence.md](evidence.md); update it whenever a result here changes.


### 2026-10-27-g ? frozen rental-model manifests and installed-store verification

**Built and tested; no new paid work.** [F-026](../features/F-026-rental-model-integrity.md) freezes the
existing E4B/26B Q4 candidate manifests, with exact layer hashes/sizes, and adds a Python offline
verifier for downloaded Ollama stores. It scans installed bytes only with explicit execution, rejects
manifest/blob drift, links and bounds/deadlines, and saves a unique report for preview/failure/success.
It cannot attest the host, prove GPU residency or enforce rental billing.

- Initial verifier trial `f454b4f4`: 11 checks pass. Final full-suite trial `b26b8eaf`: 11 checks pass.
- Preview reports `803e5980` and `753502ff`: snapshot validation only, no model-store scan or network.
- Model manifests: 6,583,656,505 E4B bytes and 17,987,581,215 26B-A4B bytes advertised across all layers;
  no weight bytes fetched. Registry image reads failed; separate Docker Hub metadata reads succeeded.
  Upstream image digests are publisher-reported and container/runtime integration is unqualified.
- RunPod reused-agent diagnostic: three timeouts and one verified TLS/REST 200 reporting zero pods;
  successful response did not reuse a socket. No reliable transport fix or live cleanup proof.
- Full `pnpm test`, workspace `pnpm typecheck` and `pnpm build` pass. No UI change or deployment.

[All trials, source/helper/snapshot hashes, limitations and costs](../evaluation/trials/2026-10-27-rental-model-integrity.md).
New spend $0; known session model charges $0.00423240. Prior $1.505 request allowances and $2 held aside
remain part of the original $10. No rental started; proposed $1.50/30-minute first session remains a
planning ceiling pending exact quote, authenticated worker and reliable lifecycle/independent cleanup.


### 2026-10-27-h - first current-proof RunPod lifecycle, uncertain create recovered and cleaned up

**One real Pod, no model workload.** [All trials and evidence](../evaluation/trials/2026-10-27-runpod-lifecycle-canary.md).
Shared HTTP/2 sessions reached canonical REST with normal verified TLS; the portable official CLI also
read zero pods twice, but follow-ups still failed. Fresh secure RTX 4090 quote: $0.89/hour, EU-RO-1.
The operator reserved $0.25 from the existing $10, then dispatched exactly one create.

Creation's response timed out. Recovery matched the unique UUID name/creation/storage, did not repeat
POST, re-read before DELETE, received HTTP 204 and confirmed HTTP 404 absence. Trial `18c53c21` remains
failed; resource cleanup is confirmed. No model, real GPU telemetry, private data, TEE, independent
supervision or standing-watchdog live conformance is proved. Two billing follow-ups failed; billed cost
stays null. Preserve $1.505 prior request allowances + $0.25 canary allowance + $2 held aside = $3.755;
$6.245 unallocated, without refund/reset. Earlier known hosted-model charges are $0.00423240.

Also retained: a 10-entry public test-assets bundle (every archive member checked), verified portable
runpodctl v2.14.0 binary, CLI help/diagnostics and every failed read. No global CLI/PATH install; the
vendor CLI initialized a 53-byte config with an empty credential field. Upstream PR 330/release v2.12.0
removed timer flags that were not enforced; no timer experiment or claim of provider expiry was made.
No network/account setting changed. Last application source/tests/typecheck/build remain unchanged;
this slice changed operator scripts/artifacts/docs only, so broad application suites were not repeated.

### 2026-10-27-i - authenticated rental model, full-byte verification, actual requests and cleanup

**Built and exercised; model quality held.** [Every trial, artifact, failure and limitation](../evaluation/trials/2026-10-27-rented-model-worker.md).
[F-027](../features/F-027-authenticated-rental-worker.md) joins the existing gate, byte verifier,
telemetry helper, synthetic runner and separately running local watchdog. No account key in Pod
payload; fresh test bearer in controller memory, its hash on the rental; Ollama loopback-only;
authenticated diagnostics, arm, completion and generation. Signed Ubuntu packages plus checksum/size
pinned Node 22.23.4 installed inside the rental, no custom image or laptop weight download.

- `76f889ef`: first model rental failed before warmup at a legacy manifest mismatch. Ollama 0.40.11
  uses canonical v2 manifests and a differing legacy compatibility anchor. Fix preserves all frozen
  manifest/layer pins, allows only the exact pinned final leaf link, refuses linked parents/blobs,
  and binds the local test tag to the frozen digest. All 15 store fixtures pass.
- `4443ee26`: verified 6,583,656,505 bytes, warmup 1 and anonymous 401. Comparison plan used invalid
  remote region/reservation, rejected before comparison requests. Corrected complete plans/context
  preparation now run before account calls; three offline checks exercise 16 simulated streams.
- `7b7b7832`: proxy 404 at arm, no model pull/warmup. Six arm fixtures cover bounded authenticated
  same-worker reconciliation, already-armed/no-repeat, auth refusal and supervisor loss. No create
  retry or deadline extension. The next run did not need that retry.
- `8b4888f5`: fourth rental completed eight requests at concurrency one and eight at four, one warmup,
  same pinned E4B Q4/Ollama 0.40.11/context4096/temp0/max300. Median first content 0.816/0.939 seconds;
  full response 1.244/3.671 seconds. Fixed order/cache and tiny sample prevent capacity/speed claims.
  Four outputs ended `length`: 4089 input + 7 output = 4096 tokens. Transport pass is not quality pass.
- Exact running digest and Ollama GPU allocation ratio matched. Real RTX 4090 telemetry exported
  76 samples/77.35 seconds, sampled max5568 MiB/91%/227.91 W, baseline1 MiB, no observed query failures.
  Snapshot is live/not finalized, no complete trace or guaranteed peak. Runtime size counters are
  distinct from downloaded bytes and device memory; no independent layer attestation claim.
- All four separate watchdogs accepted termination and confirmed absence, no attention; controller
  independently reconciled absence. Final read-only observer `886c1e47`: owned Pod404/account0 Pods,
  billing200/zero rows still pending. Deadline expiry and whole-local-host loss remain unqualified.

Also retained: Windows journal EPERM full-suite failure and four bounded replacement fixtures; initial
nested-event offline-fixture failure/incomplete preview; wrapper-count failure despite 12 underlying
passes; all previews/static/bootstrap/worker fixtures and derived-summary trial `1a9c85fe`. The report
links their exact UUIDs. No failed/crashed record was overwritten or reclassified as passing.

Final full `pnpm test` passes with 4 persistence, 17 rental, 15 store, 12 worker, 12 telemetry, 7 HTTPS,
9 combined-harness and 77 web checks, alongside other standing suites. Workspace typecheck passes;
prior workspace build covers unchanged runtime code. Final source hash `d7c9abbc74c25f83783bd90207c117eb2a963c540cbfa0ede66d36e5d92df68a`;
helper/bundle hashes are separately recorded. No production deployment or new database migration.

Budget: $1.505 previous request allowances + $.25 canary + four $1.50 model rentals + $2 held aside
+ $.000016 dispatch = **$9.755016**; **$.244984 unallocated**. No reservation refunded or funding
reset. Model-session bills remain unknown; final rental compute-only time/rate arithmetic $.04070613
is not an invoice. Prior known hosted charges $.00423240 and later canary reported $.006488841492682695
are within their existing allocations. No further paid rental fits the current $1.50 envelope.

Next: offline token-aware prompt/headroom correction and native blind review; then a newly budgeted
same-model repeat/second GPU comparison if warranted. Actual retrieval/private account memory has
its separate F-023 evidence. Mesh, 4-of-7 administration, training, confidential compute and pilot
acceptance remain separate milestones. Do not claim full P4 completion or host privacy from this run.

### 2026-10-28-a - context headroom, incomplete answers and populated rental billing

**F-028 built and tested offline; no new real inference or rental.**
[Every trial, failure, source hash and billing observation](../evaluation/trials/2026-10-28-context-headroom.md).
The previous paid response4089 prompt +7 output =context4096 reproduced the issue. The evaluator now
checks UTF-8 content bytes +64/message +256 template allowance, reserving all requested output tokens
before ledger creation or dispatch. The existing compact/full builders are explicit showcase recipes;
native Ollama's configured context applies even without a plan hint, and declared/runtime mismatch
refuses dispatch. No silent input truncation, production prompt switch or default model approval.

This is a conservative admission estimate, not an exact model-tokenizer count or universal bound.
Preview `296ff509`: full4096 and full8192 refuse; compact8192 passes with maximum prompt estimate4074,
output300, minimum estimated room3818. No model inference/GPU fit/language result follows. Length
finishes now retain partial text/usage but fail evaluation and blind-review completeness. Protocol
fingerprints change, so old ledgers cannot silently resume under changed semantics.

Showcase suite grew14→19: multibyte/framing/exact boundary, output reserve, old recipe rejection,
native-window mismatch before ledger, compact native wire/manifest and length-finish evidence. Native
fixture sends context8192/max300/thinking-disabled through the actual adapter. Final suite `75cface1`
passes19 with53 localhost requests; final rental suite `7bcbbab7` passes17. Full `pnpm test`, workspace
typecheck and build pass, including15 store/12 worker/12 telemetry/7 HTTPS/9 combined API/14 gate/77 web
checks alongside other standing suites. Source hash `4badb7d732277ae157516e9126f0123c92be9cb2f37c62499ce3a52d0df29e14`.

Two root failures retained: `14916bf3` exposed the old generic CLI test inheriting a too-small native
context; the child now owns an explicit fixture-only32768 context. `cf953a3b` counted an unrelated
concurrent review UUID as one of its four CLI records; it now filters expected CLI purposes. Guard
behavior remains separately checked. Earlier passes, invalid-argument refusals and incomplete
answers were not rewritten. New CLI context refusals expose only allowlisted local error messages.

Read-only derivation `9bc10378` combines16 prior rental answers into a new shuffled anonymous pack,
marks4 incomplete, retains source hashes/operator mapping separately and adds no human scores.
Review is still pending. No prompt/model weights, new npm/pip/tokenizer dependency, training,
production migration or deployment. The [guide](../guides/showcase-context-headroom.md) provides an
offline preview example and explains estimator/runtime limits and the next qualification gate.

Read-only billing now returned one record per model-session Pod: $0.019573818892240524,
$0.05441781505942345, $0.009391230531036854 and $0.040801142691634595. Total reported model rentals
**$0.12418400717433542**. Including earlier canary/hosted reports, known reported charges are
**$0.1349052486670181**; `85078a88` retains the derivation. Final invoice is unconfirmed and no new
balance reconciliation was performed. Each owned Pod returned404/account0 Pods. Conservative
allocations stay **$9.755016**, including untouched$2 held aside, **$.244984 unallocated**; no refunds,
budget reset, new paid work or account credit treated as funding. P4 remains in progress.

### 2026-10-28-b - integrated community API to rental-worker preparation

**F-029 built and rehearsed offline, live execution pending.**
[Every trial/failed assertion/settings/limits](../evaluation/trials/2026-10-28-community-rental-preparation.md),
[live-run guide](../guides/community-rental-live-run.md). Reuses F-023's isolated PGlite migrations,
JWT/membership, real lexical SQL retrieval, scoped personal notes/history and normal chat routes;
joins the existing native Ollama adapter to the actual rental-worker/gate. Two logical remote HTTPS
identities map to owned loopback fixtures, preserving remote privacy classification. Model replies,
placement and ready declarations are simulated. Zero real model/GPU/account calls or paid spend.

- Initial23 checks `b8f8c622`, expanded25 `f48d60cb`, corrected26 `4b20d3d1`, expanded27 `1a881e48`.
  Failed `421e3d58` retained: the test incorrectly expected fallback after streamed output; the API
  correctly signals interruption and persists `stream_interrupted`, without silently swapping answers.
- Final full-suite integrated run `791bb8aa` passes27, original community suite `b0e09e12` passes9,
  worker `c69e8f5d` passes13. Final narrower readiness-shape validation run `8080da16` passes27,
  then workspace typecheck/build pass again. Full root suite, earlier typecheck/build also pass.
- Final fixture counters:15 logical remote boundary traces,18 model-backend calls including4 through
  the reusable live hook,4 overlapping requests,0 unexpected client egress. No latency/capacity or
  real language result inferred. All workers/backend/app/database closed and adapters restored.
- Own retrieval/memory/history, known foreign IDs, local-only/reviewed-only zero egress, note revoke/
  delete, controlled approved-record update, endpoint replacement, outage/keys/quota, context overflow,
  truncated non-streaming and interrupted streaming are exercised. Personal notes do not become shared
  knowledge. Approved-row fixture update is not full publication-governance validation.
- Context guard now lives in shared prompt code and an explicit async operator scope protects final
  native API requests including memory/history before reservation/transport. Outside that scope,
  deployments keep existing behavior. Estimates remain conservative, not exact model tokenization.
- Native adapter name alone previously labeled remote rental answers local. Chat/stream now pass the
  configured endpoint to location classification. Remote/private-IP native endpoints say outside;
  reviewed cards stay local. Privacy and normal API tests assert this; no historical origin inferred.
- Explicit worker8192/default4096, matching loaded context/digest/GPU allocation,13 fixtures. Live hook
  capped at4 attempts, checks fresh supervisor/worker/byte/helper/snapshot/telemetry evidence and immutable
  lease deadline/fingerprint, carries cancellation and a persistent cumulative ledger. Lost supervisor
  refuses dispatch. No actual8192 GPU placement or supervisor/provider conformance is inferred.

Final source hash `248261beb303c6fbecc21dc6fd8164e9c1f60cd9d26a23b8d7e64fa5a0d77ca3`,
uncommitted base `965d4c3f13747679391ecd2e1bd362acb4940f2d`. First static handoff `971f23b0`
retained; final `3198fb16` matches8080da16/source and compiles the pinned context8192 installer without
executing setup. Source/helper/model pins and four synthetic questions are in the preparation pack.
Placeholder key hash/deadline are preview data, not a live launch payload. No dependency, model/tokenizer
download, global install, image publication, production database migration, UI change or deployment.

Earlier reported rental/hosted/canary costs are not reread or refunded here. Allocations remain
$9.755016 of original$10, including untouched$2 held aside; $.244984 unallocated. No new rental was
admitted. Before launch: a reviewed allocation/fresh quote, actual owned disposable worker8192,
independent watchdog and fresh ready evidence. The exported live hook then exercises4 real normal-API
answers, retaining measurements and cleanup. Human language review, real Mesh/device use, affordable
local-model hardware, private-document ACLs,4-of-7 administration and TEE remain separate milestones.

### 2026-10-28-c - four real normal-community-API answers on rented compute

**F-030 functional live proof demonstrated.**
[All trials/source/settings/measurements/limitations](../evaluation/trials/2026-10-28-community-live-rental.md).
Kept all prior reservations/$2 held aside. A new **$.24** allocation fits the existing$.244984
unallocated balance, with10-minute absolute lease,120sec shutdown grace,$1/hour quote ceiling,
$.05 included non-compute allowance. At ceiling10-minute compute+.05 is$.216667. It is a local
planning allowance, not provider-enforced billing. No$1.50 allowance/refund/reset/additional funding.

Preview `999dda25` checked frozen preparation/source/worker hashes, previous absence, lease arithmetic
and54,513-byte bootstrap with no account/model call. Actual `d14704f6` created one secure EU-RO-1
RTX4090 at$.89/hour, armed separate supervision, verified all6,583,656,505 model bytes and loaded
the matching digest/context8192. Same pinned E4B/Ollama0.40.11/Node22.23.4/Python3.12.3 and current
F-029 source `248261beb303c6fbecc21dc6fd8164e9c1f60cd9d26a23b8d7e64fa5a0d77ca3`.
No API runtime changed, so existing full tests plus final targeted27/typecheck/build apply; no
production migration/deployment or new laptop weights, training or custom image.

The controller ran27 offline checks then **4 complete real sequential model answers** through
normal HTTP API auth/membership, actual local lexical retrieval, own remote-permitted memory and
message persistence. Every actual prompt passed own-community/owner and absent draft/local-only/
foreign canary checks. All4 `answerSource:model`, `usedFallback:false`, `answeredBy:outside`, no
safety withholding; scoped native contract requires stop rather than length/error. A's output used
the updated Wednesday fixture schedule; B's used Friday/KSh50. This demonstrates using approved
context without training, not a full governance-publication or personalization-quality result.

Gate4 requests/0 refusals/3810 input/415 output tokens, one direct warmup separately. Actual model
calls are not combined with the fixture's simulated calls. Conservative max prompt estimate4323,
output300, minimum estimated room3569, not an exact tokenizer measurement. Runtime digest/context8192
and reported GPU allocation ratio matched. Live telemetry101 samples/103.668sec, sampled max5832MiB/
65%/155.46W, baseline1MiB, zero observed failures, exported before finalization. No guaranteed peak
or independent host/layer attestation. GPU24564MiB/driver595.91.07, CUDA13.2; provider memory61 is host RAM.

Observed lifecycle **176.687sec**,14:22:03.674-14:25:00.361 Nairobi. Last offline check to final
worker status26.804sec includes qualification/control and4 calls; it is not a per-request timing.
Per-request latency/token fields were not exported from the temporary database before close;
retain nulls rather than invent benchmark figures. Actual aggregate gate tokens are retained.

Supervisor `a935089a` accepted scoped deletion/confirmed absence, exit0/no attention; controller
independently confirmed absence. Observer `5ea4f300`: Pod404/account0 Pods, billing200/zero records,
therefore new bill pending. Compute-only elapsed/rate arithmetic$.04368095 is not an invoice or all-in
cost. Earlier reported charges remain$.1349052486670181 before this pending bill. Final aggregate
held/allocated **$9.995020**, including4 microdollar dispatch reservations, leaving **$.004980**;
untouched$2 included. No new rental fits without a reconciled spending decision.

Readonly derivation `50609688` retains input hashes/complete answers/metrics and a new shuffled
anonymous review pack with blank human scores and separate operator mapping. Repeated wallet closings,
identical A outputs, omitted free-price wording and unclear two-visit planning are review concerns;
technical completion is not native language/usefulness acceptance. No real learner/patient/student
records. Next: native human review, richer benchmark/per-request measurement export and real device/
LAN uplink-loss demonstration; local hardware economics, private-document ACLs,4-of-7 administration
and TEE remain separate gates. P4 is in progress; the bounded integrated synthetic flow is now live-proven.

### 2026-10-28-d - human-review handoff and member-network acceptance preparation

**F-031 preparation built and verified; people and physical observations pending.**
[Every trial, including failures](../evaluation/trials/2026-10-28-review-and-network-acceptance.md).
Edmund selected "Prepare the kit for later" for phone/Wi-Fi testing. Added the
[physical test procedure](../guides/member-lan-acceptance.md), unfilled evidence template,
[human-review handoff](../guides/live-answer-human-review.md) and unassigned collection template.
No reviewer contacted, phone test, node deployment, paid inference, new model download or training.

Existing plain-HTML blind review now supports approved fictional reference facts and single-answer
acceptance, with legacy comparison retained. Three independent shuffled copies retain the exact four
F-030 answers and blank scores. Source/operator mappings remain private. Initial build `0cc79af9`
had co-located keys; final distribution `6f90f6bd` exposes only HTML, never distributed. Browser
`d3b8d134` failed because file URLs were blocked; `fc583334` passed via owned loopback static server,
390x844 rendering, four forms and JSON download after browser-network offline. Identity/ratings are
explicit automated fixtures, rejected by scorer; not human judgments. Storage cleared, browser/server
closed. Actual phone attachment opening remains unverified.

Integrated initial `90b18e77`, final `ef951f41` pass28/28, adding an actual loopback member HTTP
listener and compute-gate socket close/restart. During outage reviewed-only and local-only continue
locally, configured remote receives reviewed fallback; zero backend calls. Restoring the same port
recovers the same conversation with one backend call, two user/two assistant turns and scoped history.
All responses are fixtures. No real Wi-Fi, uplink, route, DNS, mobile-data or Tailscale change occurred.

Future exports retain API-helper elapsed times and persisted message latency/tokens/retrieval/source
before DB shutdown, failing the trial after cleanup if export fails. Final39 helper requests,
45 assistant rows,31 marked model:30 with measurement fields populated and one existing streaming row
with null fields. This is fixture usage, not a GPU benchmark or a fix for streaming metering. F-030's
missing individual timings stay missing; actual socket-call timing has separate evidence.

Full `pnpm test`, `pnpm typecheck`, `pnpm build` pass. Final review fixtures `e5028ce4`6/6, original
community `8c2e214c`9/9, integrated `ef951f41`28/28, showcase19, rental17, worker13, store15,
telemetry12, HTTPS7, gate14, web77, and standing suites pass. Full-suite UUIDs/expected negative
children and copied logs/hashes are retained in final verifier `fe761975`; five failed verifier
attempts remain documented (first over-strict streaming metadata assertion, then nested fields
rejected by scalar-only trial journal). Final helper preserves nulls and flattens event fields.
Static handoff `43ac22b7` validates current28-check source and parses installer without executing.
Source hash `f64a4934670f700170a1057d9d0ee580fb1c4d6a337971d440e970322c09e4fd`, uncommitted
base `965d4c3f13747679391ecd2e1bd362acb4940f2d`; helper-specific hashes separate. No new dependency.

Read-only observer `5b36bd7a` reports F-030 charge **$0.043415188789367676**, invoice not final,
owned Pod404/account0 Pods. Previous reported total plus this observation is approximately
**$0.1783204374563858**; not a complete invoice/economics claim. No new paid compute and no reservation
refund/reset: **$9.995020** held/allocated including untouched **$2** held aside, **$.004980**
unallocated. P4 remains in progress; P5 has software preparation only. Next are independent native
reviewer returns and physical LAN observations on an isolated synthetic node when available.

### 2026-10-28-e - temporary Wi-Fi human-review delivery

Edmund confirmed his iPhone shares the existing internet-enabled Wi-Fi and asked where to share
reviews. [Every trial and limits](../evaluation/trials/2026-10-28-wifi-review-delivery.md).
Host `ae51bb07` is **active, deliberately not a completed trial**, serving exactly three fixed
fictional HTML files on the observed Wi-Fi IP192.168.100.192:4188, with no keys, directory listing,
uploads or AI API. It starts20:19:52 and expires22:19:52 Nairobi28 October. No router/firewall/
Tailscale/default-route changes; internet stays enabled. Listener automatically closes at expiry.

Verifier/deliverable `c1045af5` completed: all3 pages200/exact original hashes;6 refused paths404,
POST405; ZIP contains3 standalone HTML copies plus instructions and no operator key. Existing
Node/tsx/Python zipfile reused, no install/application change/new model call/paid compute. Prior
full repository checks remain current; actual LAN host behavior tested directly in this pass.

[Human-review guide](../guides/live-answer-human-review.md#open-on-the-current-wi-fi) now includes
live local links, ZIP, copyable invitation and one-copy-per-reviewer/JSON-return workflow. No message
or publication to others occurred; reviewers unassigned and zero returns. Asked user to open01 on
iPhone. **Physical phone loading awaits confirmation.** Same-computer HTTP is not phone or Mesh proof.
People outside this Wi-Fi need the standalone file or separately arranged hosting; LAN links are not
internet links. Full synthetic chat-node and uplink-loss test remain pending, with no new rental.

**Phone observation follow-up:** Edmund replied "Yes, the review page loads" to the shared-Wi-Fi/
iPhone/Reviewer01 question. Record `18c1087a-7208-4105-8341-fd5270bcb781` retains that explicit
user report; no agent-observed device interaction or inferred ratings. This confirms physical phone
page reachability with internet enabled, superseding the pending-phone sentence above. No iPhone
rating export, completed review, AI-chat, uplink-loss, Mesh routing or TEE result yet. No new paid
compute/network change; the temporary host's lifecycle and expiry remain separate.

### 2026-10-28-f - first completed human-review JSON

Edmund supplied `D:\Downloads\review-es.json`. Intake `b645fe46-4d78-446a-9a19-2d15a4f11859`
completed: exact Reviewer01 pack6633eca19d/single mode/four case IDs/letters, valid rating values,
selections, notes and timestamps. Original copied byte-for-byte and hashed; source hash rechecked
unchanged. Existing scorer passed with its matching private key. [All evidence and findings](../evaluation/trials/2026-10-28-first-human-review.md).

One ES review form, naturalness4/3/3/4 (**3.5/5**), all4 mostly correct,0 fully correct/incorrect,
2/4 acceptable as written,2/4 revision/rejection,0 risky flags. Q1 preferences:inavyo→ina,
kwenye→kwa,jinsi→vile. Q4:inacosta→inacost, retained as submitted (source spells inakosta).
Q2/Q3 have no explanatory notes. Two identical Wednesday source outputs received4 and3 naturalness;
do not normalize individual judgments or infer a representative language benchmark.

Export timestamps20:28:21.175-20:37:29.742 Nairobi,548.567seconds, not verified active time.
One of three planned forms received; two pending. Audience fit/identity independence and exact
export device unverified. Original reviewer file/raw scoring/collection snapshot remain operator
artifacts. Review submission is not training/corpus/publication permission. No automatic style or
model change, new inference, package, rental or outbound message. Overall language acceptance and
physical AI-chat/uplink-loss gates remain open. Previous full repository checks remain current;
this pass exercised actual-file validation/scoring and checked documentation.

### 2026-10-28-g - three-reviewer collection and findings complete

Edmund supplied KS/GT JSONs. [Full findings, every trial and limits](../evaluation/trials/2026-10-28-three-reviewer-findings.md).
Intakes `458c41dd-d0c2-42d3-ad90-17d33000ad77` (KS/02) and
`3d2dd20b-7ef0-4b9a-8983-821265fd37c0` (GT/03) each validated all4 expected single-answer
cases/fields and ran the existing matching-key scorer. Originals and exact bytes/hashes preserved.
Intake helper now describes only its own file; historical first-return snapshots stay unchanged.

Aggregate `3ebb549d-241b-49b2-afa0-f07cbcdc0a3a` combines those with ES `b645fe46`. Three
distinct source hashes/packs/normalized pseudonyms, all manifests matched and originals rechecked.
Join on case IDs/source answer hashes, not shuffled question positions. **3/3 planned forms received,
12 ratings of4 outputs containing3 unique answer texts**; collection complete. All3 new trials pass.

Naturalness ES3.5/KS4/GT3.5, combined **3.67/5**. Fully correct1/12, mostly11/12, incorrect0/12;
accepted as written **5/12**, revision/rejection7/12, risky flags0/12. No unanimously accepted case;
F1 unanimously rejected, other3 split. Exact-case acceptance pair agreement6/12, not a population
reliability estimate. Identical W1/W2 wording still has different ratings; retain the variability.

All3 prefer more conversational jinsi→vile/inavyo→ina and cost wording inacost; ES/KS preferkwa,
KS/GT ask for12-hour clock, GT recognizes cheki/ona variants. These are candidate scoped community
preferences, not global Sheng rules or automatic corpus/training permission. No source answer or
note changed. No formal release threshold was registered; recommend language/usefulness refinement
and fresh held-out questions before quality acceptance. No model/prompt/app code change or new
inference, training, package, rental or outbound message. Audience-fit/identity independence remain
unverified; file return does not identify export device. Physical AI-chat/uplink-loss remains open.
Previous full checks remain current; actual-file scoring/aggregation and documentation verified here.

### 2026-10-28-h - scoped community language iteration prepared offline

Edmund asked to continue after all three forms. F-032 specified before implementation; operator-only
draft pack candidate uses existing language/shape fields. Target Sheng/mixed receives proposed
conversational guidance; target schedule task guidance covers all its modes without changing their
language policies. Other-community full/compact/serve prompts remain byte-identical. No global word
replacement, production pack edits, automatic raw-note publication/corpus/training or activation path.

[Every trial and final identity](../evaluation/trials/2026-10-28-language-iteration-preparation.md).
First preflight `dc63cca7-b26d-4152-b35a-cf037f8536f4`, final root-suite
`f1ac615c-2f35-4fc3-a53c-966b9acbcea3` pass13/13. Real builders verify scope, async isolation,
unchanged safety/passages/history, missing/incorrect proposal refusal and assessor-field exclusion.
Updated supplied record changes prompt/fact hashes with same language recipe, no model call.
Eight engineering-authored development probes include missing facts, false premise, updated record,
free/paid visits, midnight/noon, English and other-community control.15 compact baseline/candidate/
control previews fit8192 with300 output reserve; minimum remaining conservative estimate2651.
No exact tokenizer, held-out community evaluation, real retrieval-quality or output-quality result.

Handoff `192db411-dc17-4d1f-a109-9c210154f136` freezes draft recipe/suite/review protocol, prepared
source identity, validation logs/digests and all17 root-suite trial records, including2 expected
negative CLI children. No failed language-preparation invocation. Full `pnpm test`, `pnpm typecheck`,
`pnpm build` pass; new13 plus standing review6/community9/integrated28/showcase19/rental17/worker13/
store15/telemetry12/HTTPS7/gate14/web77 and standing suites. No dependency installed.

Source hash `6292670985a24f69fe0a373bbe43351cfe7747e9f172cb2c3d973b5a8f232d4d`, uncommitted
base `965d4c3f13747679391ecd2e1bd362acb4940f2d`; separate proposal/suite/protocol/helper hashes
retained. This invalidates old paid-run source fingerprints for future launches; no closed lease
or reservation reset. New spend$0, original$10 allocations$9.995020 including untouched$2 held aside,
$.004980 unallocated, reported bills unchanged. Existing temporary review host lifecycle separate.

[Next iteration guide](../guides/community-language-iteration.md) has concrete draft wording/protocol
for community sign-off. Numeric release threshold unfilled for prior agreement, not retrofitted to
the baseline. Next: approved scoped guidance, fresh community-authored/approved held-out questions,
reconciled funded comparison and human review. No model answer, fine-tuning, deployment, network change
or improvement claim. Physical AI-chat/uplink-loss, hardware economics,4-of-7 and TEE remain separate.

### 2026-10-28-i - running member node on Wi-Fi and real browser flow

F-033 specified before code. [Every trial/failure and current resource state](../evaluation/trials/2026-10-28-running-member-lan-node.md).
Built operator-only ephemeral PGlite node using real hashed-password auth, community guard, chat,
notes/history routes and built learner app. Two member-only fictional communities/four learner test
accounts, closed registration/no admin. Serial query/explicit-connection leases prevent concurrent
transactions interleaving. Reviewed-only processing for every request, empty model-provider map,
compute enforcement and refused fetch egress. Configured application PostgreSQL never connected.
Static serving preloads an allowlist, no arbitrary operator/env/source-map reads. Temporary generated
credentials stay in an unserved local account sheet. All inputs must be fictional; plain LAN HTTP.

Initial API trial `2301fc64` failed the expected status for an anonymous unknown API route: guard
correctly401 before route404. Corrected authentication of static-route checks, pass `73cf51b5`9/9;
initial root `92ab44d3`, final-source root `e71d7c1a`9/9. Covers login/refusal, membership/known foreign
IDs, distinct cards, parallel notes, streaming reviewed source, read/delete history, static refusal,
zero model/egress and restoration of pool/env/fetch/registry on owned closure.

First live `4954df44` cancelled after browser `15f09a41` failed: direct Crypto.randomUUID missing on
plain LAN HTTP. Replaced5 browser call sites with shared secure random-ID helper: native UUID or
getRandomValues UUIDv4, never Math.random,5 tests for receiver/freshness/masks/missing/failing RNG.
React checklist applied to2 touched components, no hook/account flow change. First typecheck found
possibly undefined network interface; explicit guard fixed it. Final tests/typecheck/build all pass.

Old Windows background node force-stopped only after owned PID/command verification. Observer
`30cc60fc` could not immediately confirm; `df0a3213` confirmed process/port absence. Old lifecycle
journal cancelled, no graceful metrics claimed. Added local stop-marker polling for future nodes.
Second live `9d3e8706` completed browser QA and graceful stop with exported metadata. Browser
`f26f03f6` completed actual Wi-Fi HTTP app at390x844: A2 sign-in/Tuesday-free card/new fictional
note/sign-out, B2 sign-in/Friday-KSh50 card/own memory with no A2 markers/sign-out,0 console errors.
Browser closed. No fake LLM response; UI explicitly labels approved-card/no-generation behavior.

Initial handoff `6d154bab` reached clean shutdown but wrongly expected9 notes; actual4 seeds+1new=5.
Corrected `83ef688b` verifies2 sessions/4 messages/5 notes,2 reviewed-card replies,4 retrieval queries,
0 model calls/egress attempts, completed QA journal and unreachable QA listener. Freezes final logs,
web/build hashes and45 related trial entries including both root suites/expected negative CLI
children and failed/attention records. No failure deleted. Source hash
`025d37a412ab03a0ea39cbea5f85796882e14586351505e7912f0feedb51fad1`, base
`965d4c3f13747679391ecd2e1bd362acb4940f2d`, uncommitted; web hashes separate.
Final API9/language13/review6/community9/integrated28 and standing suites, gate14, web82 pass.

Fresh user node `c9293b08` deliberately active on192.168.100.192:4189, expires23:38:35 Nairobi
28 October, fresh credentials/empty QA history. Readiness `0c70b211` verifies app200, two member-only
public access states and source agreement. [Phone instructions](../guides/running-member-lan-node.md)
link only the private local test account sheet. Asked user for actual A1 sign-in/Tuesday-free answer;
observation pending. Counts/source metadata export on closure, no note/chat text. No firewall/router/
Tailscale/default-route change, training, model download, rental or paid inference. F-032 draft not
activated. Reported bills/allocations unchanged ($9.995020 held/allocated, $.004980 unallocated,
untouched$2 included). This is local retrieval/account proof, not a physical phone/uplink/LLM/TEE pass.
