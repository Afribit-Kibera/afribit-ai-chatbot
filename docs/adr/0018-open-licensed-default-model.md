# ADR 0018 — Default to an open-licensed model: Gemma 4, if it matches Gemma 3

**Status:** Accepted, 8 October 2026, as a conditional decision. **Evaluation progress (8 Oct):** the AI-judged tests passed, hosted and at 4-bit on an RTX 3090 and an L4 ([E-001](../features/E-001-gemma4-and-gpu.md)). The blind comparison by community reviewers is the remaining test. The switch happens only after the
evaluation below passes; until then the node default stays `gemma3:12b`.

**Context:**

- The node's default model, Gemma 3 12B, passed all 15 of our Sheng, Kiswahili and English cases. But it is
  released under Google's Gemma Terms of Use, which is not an OSI-approved licence, so "open source end to
  end" is not quite true of a node that runs it.
- Gemma 4 was released on 2 April 2026 under **Apache-2.0**, in four sizes: E2B, E4B, a 26B
  mixture-of-experts with about 4B active parameters, and a 31B dense model.
- In our hosted model search, Gemma 4 26B-A4B also passed 15 of 15
  ([evaluation](../evaluation/methodology.md)).
- The sizes differ in what hardware they need. The 26B mixture-of-experts needs about 18 GB at 4-bit (measured 8 Oct 2026, E-001; a 24 GB card),
  where Gemma 3 12B needs about 8 GB. That is an estimate to measure.

**Decision:** Switch the default model to the Gemma 4 model that **matches Gemma 3 12B on our tests and
fits the target hardware**, evaluated separately for each kind of deployment.

1. **The tests:**
   - The 15-case communication rubric.
   - The separate factual-accuracy judge.
   - The retrieval-grounded answers through the real engine.
   - A blind comparison by community reviewers.
   - Speed and memory on the target GPU at 4-bit.
2. **"Matches"** means: no worse on the rubric or on accuracy, no new unsafe-content flag, reviewers prefer
   it or find no difference, and it serves a small group within the pilot's speed targets.
3. **Where it applies:**
   - **Afribit Local GPU servers** ([ADR 0016](0016-afribit-local-community-box.md)): we choose the
     hardware, so the best passing size wins.
   - **Self-hosted nodes:** the default is the best passing size that fits a 10–16 GB GPU. If none fits,
     Gemma 3 12B stays as the documented default for that hardware, and its licence is stated plainly.
4. **When it switches,** we update the model profiles, the node kit and the dependency register; log the
   results and model digests in the [test and evaluation log](../book/test-and-evaluation-log.md); and
   record any change of hardware advice in the community node specification.

**Consequences:**

- **Open on every switched deployment.** Where the switch happens, the code, the model weights and our
  adapters (ADR 0015) can all carry open licences, which several funders require.
- **Hardware advice may change.** The mixture-of-experts model is faster per token but larger in memory.
- **Gemma 3 may stay on some nodes.** If no Gemma 4 size fits small nodes, those nodes keep Gemma 3, and our
  documents say which licence each deployment runs.
- **Adapters follow the base model.** Any community adapter is trained on the chosen base and must be
  retrained if the base changes.
