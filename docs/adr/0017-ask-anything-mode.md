# ADR 0017 — An "Ask anything" mode: separate, labelled, off by default

**Status:** Accepted, 8 October 2026. Not built.

**Context:**

Community leaders expect their assistant to work like any AI chat. Today it answers only from approved
knowledge and declines most other questions. That is the right default for teaching Bitcoin safely, but
it leaves members with no private place for everything else. In an off-topic probe the model declined 4 of
5 questions and answered one from its own memory
([evaluation](../evaluation/methodology.md#off-topic-questions-probe-2-october-2026-five-questions-hosted-model-full-prompt)).
The models a node runs can answer general questions reasonably. The risk is not that they can't. The risk
is that people mistake an unchecked answer for one the community's reviewers approved.

**Decision:** Add a second mode, **"Ask anything"**, beside the default **"Learn"** mode.

- **Off by default.** A community switches it on only when its steward and its reviewers agree. The
  setting lives in the community's configuration (pack or server), and every change is recorded.
- **Always visibly separate:**
  - Members choose the mode explicitly.
  - Every Ask-anything answer carries a label in the community's language, for example "General answer —
    not checked by Kibera's reviewers".
  - The interface never mixes the two kinds of answer in a way that hides which is which.
- **Same privacy as Learn mode.** It uses the same model on the same path (node, Afribit Local box, or
  cloud), with no extra outside calls and no web search.
- **Same safety floor:**
  - Secret detection on the way in and out, the output safety check, and the Bitcoin safety rules (never
    ask for secrets, never promise returns) all still apply.
  - Health, legal and money questions get general information and a pointer to a qualified person.
  - Retrieval still runs. If an approved card matches the question, the answer points to it and offers to
    switch to Learn mode.
- **It never becomes knowledge on its own.**
  - Ask-anything answers are not added to the knowledge base and not used for training.
  - A reviewer may turn a good one into a draft card, which then goes through the normal review.
- **Measured separately.** Usage is metered as its own mode, so the community sees what it costs, and it has
  its own test set (general, off-topic and harmful requests) that must pass before any community can switch
  it on.
- **The pilot does not use it.** Its learning results come from Learn mode only.

**Consequences:**

- **Members get a normal-feeling, private AI chat,** and the reviewed mode keeps its meaning.
- **Larger safety surface.** More kinds of questions reach the model, so its safety tests need categories
  beyond Bitcoin.
- **New work:**
  - A general prompt variant.
  - The mode switch and labels in the app.
  - Mode-aware metering.
  - The community setting and its audit record.
  - A test set and an evaluation run before release.
