# Test and evaluation log

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

Counts are from the run on 8 October 2026 after entry 2026-10-08-i below (all passing). If a count drops between runs
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
| `test:db` | 21 | The SQL of F-002, F-003 and F-012 against real PostgreSQL (PGlite); every migration must apply |
| `@afribit/web test` (Vitest) | 61 (7 files) | Web app units, incl. the privacy wording rule, recent turns, deletion, suggestion and sign-up requests |
| **Total** | **556** | (468 on 8 Oct morning; 529 at release 20261008133325; +23 with F-012; +4 with F-006 part 1) |

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

## 4. Release checks

Each deployment should add an entry. It needs at least: the `pnpm test` result on the exact commit deployed,
the images deployed, the models and digests served, and any live check run afterwards (for example a smoke
test with `pnpm smoke`). No release has been logged here yet. Earlier deployments are recorded in the
maintainers' operating notes.
