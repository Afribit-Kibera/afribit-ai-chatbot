# Evidence: what we have built and measured

A summary of every result we can cite, for proposals, partners and reviewers. Each line gives the number,
how it was measured, its caveat, and the [test and evaluation log](test-and-evaluation-log.md) entry that holds
the details. **Last updated 8 October 2026.**

**Read it this way:**
- **Live** means in service on the public site today.
- **Built and tested** means working and tested, but not in service for any community.
- **Measured** means a result from an evaluation or benchmark, with the caveat that comes with it.
- Most language-quality results so far are **AI-judged on our own test cases**. People have not yet reviewed
  them blind. That review, and a benchmark written by the community, come next. Say so whenever you quote
  them.

## 1. At a glance

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
