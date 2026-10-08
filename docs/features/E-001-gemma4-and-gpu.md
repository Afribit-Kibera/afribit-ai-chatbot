# E-001 — Gemma 4 comparison and the GPU decision

**Status:** **Done**, 8 October 2026: the hosted comparison, and the 4-bit measurements on a rented
RTX 3090 and an L4. The live switch waits for the reviewers' blind comparison (ADR 0018). · **Roadmap stage:** 1 · **Decision record:** [ADR 0018](../adr/0018-open-licensed-default-model.md)

## Questions

1. Does Gemma 4 (Apache-2.0) match Gemma 3 12B on our tests, so the default model can be open-licensed?
2. Which size, and therefore which GPU, should Afribit's GPU server in Kenya use
   ([ADR 0016](../adr/0016-afribit-local-community-box.md))?
3. How much does our engine add over a bare open model? This is the outside reviewer's "is it just a
   wrapper?" question, asked properly in [E-002](E-002-community-benchmark.md).

## Part 1 — Hosted comparison (done)

**Method:**

- Our 15 language cases: Sheng 5, Kiswahili 3, English, mixed, scam and safety traps.
- Same day, same settings: temperature 0.3, 500 tokens, thinking off, zero-data-retention routing on
  OpenRouter.
- Three setups per model:
  - **full** — the production prompt;
  - **compact** — the shorter prompt;
  - **bare** — a one-line "reply in the user's language" instruction, no cards, no rules.
- The same two AI judges as all our evaluations: the communication rubric, and a separate factual-accuracy
  judge against the knowledge cards.

| Model | Setup | Language rubric passed | Sheng | Kiswahili | Accurate | Minor issue | Inaccurate | Unsafe flag | Median answer |
|---|---|---|---|---|---|---|---|---|---|
| Gemma 3 12B | full | 10 / 15 | 3 / 5 | 1 / 3 | 9 | 6 | 0 | 1 | 3.1 s |
| Gemma 3 12B | compact | 13 / 15 | 4 / 5 | 3 / 3 | 13 | 2 | 0 | 0 | 3.1 s |
| **Gemma 4 26B-A4B** | full | 14 / 15 | 5 / 5 | 2 / 3 | 11 | 4 | 0 | 0 | 5.2 s |
| **Gemma 4 26B-A4B** | **compact** | **15 / 15** | **5 / 5** | **3 / 3** | **15** | 0 | 0 | 0 | 3.3 s |
| Gemma 4 31B | full | 15 / 15 | 5 / 5 | 3 / 3 | 13 | 2 | 0 | 0 | 6.3 s |
| Gemma 4 31B | compact | 15 / 15 | 5 / 5 | 3 / 3 | 14 | 1 | 0 | 0 | 6.5 s |
| Gemma 3 12B | bare | 2 / 15 | 0 / 5 | 0 / 3 | 6 | 6 | 3 | 0 | 5.6 s |
| Gemma 4 26B-A4B | bare | 2 / 15 | 1 / 5 | 0 / 3 | 6 | 7 | 2 | 0 | 5.9 s |
| Gemma 4 31B | bare | 1 / 15 | 0 / 5 | 0 / 3 | 3 | 11 | 1 | 1 | 12.2 s |

**What it shows:**

1. **Gemma 4 matches or beats Gemma 3 on these tests.** Gemma 4 26B-A4B with the compact prompt passed every
   language case and was accurate on all 15, the best result we have recorded. Gemma 3 12B with the compact
   prompt scored 13 and 13. *By ADR 0018's first test, Gemma 4 passes.*
2. **The 26B mixture-of-experts is the better candidate than the 31B.** Equal quality, roughly half the
   answer time (only about 4B parameters are active per word), and less memory.
3. **The engine is most of the result.** The same models without it passed 1–2 of 15 language cases and were
   accurate on only 3–6. With it they passed 13–15 and were accurate on 13–15. Bare-model failures included:
   - advising *not* to write a recovery phrase on paper;
   - explaining M-Pesa instead of a Bitcoin wallet;
   - telling a user to look up a Lightning payment on a block explorer;
   - attributing on-chain fees to miners rather than the sender.
4. **The compact prompt helps every model.** It is a fifth of the size and scored higher. That supports
   switching it on, once the reviewers' blind comparison agrees.

**Read with care:**

- **One run per case, an AI judge, and 15 cases we wrote ourselves** and used to tune the prompts.
- **The bare setup was not told it is a Bitcoin assistant,** which explains some of its failures. E-002 will
  test a fairer bare setup on 50 community-written questions, scored by people.
- **Run-to-run variation is real.** Gemma 3 12B with the full prompt passed 15 on 2 October and 10 today.
- **The two "unsafe" flags are the judge being strict:** a factual muddle about fees (Gemma 3, full) and a
  political answer about governments (Gemma 4 31B, bare). Neither asked for a secret.
- **This is hosted precision, not the 4-bit precision a node runs.** Part 2 checks that.

Raw answers, judge notes and scripts are in the maintainers' experiment folder (`2026-10-08-gemma4`).

## Part 2 — 4-bit on real GPUs (done, 8 October 2026)

**Setup:**

- Rented on RunPod: an **RTX 3090** (24 GB, community cloud, $0.22/hour) and an **NVIDIA L4** (24 GB,
  secure cloud, $0.49/hour).
- Both run Ollama with `q4_K_M` models, the 15 built-in cases, and the same judges as Part 1.
- **No learner data was used.** The pods were deleted at the end. Rental cost was about $0.50.

**Speed** (the compact prompt unless noted; "4 at once" is four different questions, all answered):

| Model (4-bit, download size) | GPU | One answer | Words per second | 2 at once | 4 at once | With the full prompt |
|---|---|---|---|---|---|---|
| **Gemma 4 26B-A4B** (18 GB) | RTX 3090 | **3.5 s** | 112 | 3.9 s | **8.4 s** | 5.4 s |
| **Gemma 4 26B-A4B** | L4 | 8.1 s | 35 | 10.1 s | 24.2 s | 12.8 s |
| **Gemma 4 E4B** (6.6 GB) | RTX 3090 | **2.2 s** | 113 | 5.3 s | 11.3 s | 4.1 s |
| Gemma 4 E4B | L4 | 5.6 s | 30 | 7.9 s | 24.5 s | 12.2 s |
| Gemma 3 12B (today's default, about 8 GB) | RTX 3090 | 4.2 s | 76 | 4.4 s | 9.9 s | 6.0 s |
| Gemma 3 12B | L4 | 10.4 s | 20 | 12.8 s | 19.3 s | 12.4 s |
| Gemma 4 31B (20 GB) | RTX 3090 | **34.9 s** | — | — | — | — |

**Quality at 4-bit** (15 cases, AI-judged):

| Model | Prompt | Language rubric | Sheng | Kiswahili | Accurate | Inaccurate | Unsafe flag |
|---|---|---|---|---|---|---|---|
| **Gemma 4 26B-A4B**, both GPUs | compact | **14 / 15** | 4 / 5 | 3 / 3 | **15** | 0 | 0 |
| **Gemma 4 E4B** | compact | 14 / 15 | 4 / 5 | 3 / 3 | 13–14 | 0 | 0 |
| **Gemma 4 E4B** | full | **15 / 15** | 5 / 5 | 3 / 3 | 13 | 0 | 0 |
| Gemma 3 12B | compact | 11–12 / 15 | 2 / 5 | 3 / 3 | 11–14 | 0 | 0–1 |

**What it shows:**

1. **At node precision, Gemma 4 beats today's default.** Both 26B-A4B and E4B match or beat Gemma 3 12B on
   language and accuracy. 26B-A4B was accurate on all 15 on both GPUs. ADR 0018's AI-judged tests pass.
2. **26B-A4B is also faster than Gemma 3 12B on the same card.** Only about 4B parameters are active per word.
   On the RTX 3090, four people at once were all answered in 8.4 s.
3. **E4B is the surprise.** A 6.6 GB model that matches the 26B on the language rubric and is accurate on 13–14.
   It fits GPUs far smaller than the 10–16 GB we said a node needs. That is to measure on such a card; here it
   ran on 24 GB cards. *(Our earlier Gemma 3 4B scored 9 of 15.)*
4. **31B is ruled out.** 34.9 s for one answer on a 24 GB card in Ollama. Its memory report was also
   implausible, so it was probably not fully on the GPU. Its quality run was stopped to save cost.
5. **The L4 is about a third the speed of the 3090** for these models. Its memory is much slower. It draws
   72 W against the 3090's 350 W (manufacturer ratings).

**Read with care:**

- Still 15 cases we wrote and an AI judge.
- One run each.
- Speed measured with short synthetic bursts, not real use.
- Ollama's memory readings were unreliable for E4B and 31B, so model sizes come from the downloads.

## The GPU decision

**Recommended, for Eddie to confirm:**

| Where | GPU | Model | Why |
|---|---|---|---|
| **Afribit's GPU server** (Afribit Local, several communities) | A **24 GB card with fast memory: RTX 3090 or 4090 class** | **Gemma 4 26B-A4B** | Fastest measured: 3.5 s per answer, four at once in 8.4 s. The headroom lets one server serve several communities. Plan for its power draw (about 350 W) on UPS |
| **A community hub's own GPU** (e.g. Kibera, if the grant funds it) | An **L4** where power is scarce (72 W, solar-friendly), otherwise the same RTX class | Gemma 4 26B-A4B | One community rarely has four people asking at once. On the L4 one or two answers take 6–10 s, within the pilot's target |
| **Small self-hosted nodes** (8–16 GB GPU) | What they have | **Gemma 4 E4B** | 6.6 GB, Apache-2.0, 14/15 at 4-bit. Speed on a small card is still to be measured |
| Not recommended | 16 GB cards for 26B (18 GB does not fit); 31B anywhere | — | Measured or too large |

**Then buy or rent the Afribit GPU in Kenya** (roadmap task 2.1). Prices are not quoted until there are
Kenyan quotes.

## Switching

- **What happens when Part 2 confirms the decision:**
  - `node_chat` and the node kit's default change;
  - the model digest is recorded;
  - the [dependency register](../book/dependency-register.md) and the
    [community node spec](../program/community-node.md) are updated;
  - the [test and evaluation log](../book/test-and-evaluation-log.md) gets the results.
- **The reviewers' blind comparison is still required** before the live voice changes (ADR 0018, test 1).
  Add Gemma 4 26B-A4B and E4B, at 4-bit, to the blind-review pack beside the current setup.
- **Proposed defaults once reviewers agree:**
  - the node kit default becomes `gemma4:e4b-it-q4_K_M`, because it runs on most hardware;
  - the kit README recommends `gemma4:26b-a4b-it-q4_K_M` for 24 GB cards;
  - the Afribit GPU server runs 26B-A4B.
