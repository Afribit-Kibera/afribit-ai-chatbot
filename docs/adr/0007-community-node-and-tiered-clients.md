# ADR 0007 — Community Node, Tiered Clients

**Status:** Accepted (direction); hardware sizing pending pilot results.

**Context:** The original plan assumed a language model could run on each learner's phone. Our own measurements say otherwise for now: in October 2026 four open 1–3B models (Llama 3.2 1B/3B, Gemma 3 1B, Qwen3.5 2B), run at 4-bit on a laptop CPU with the production prompt, all failed our Sheng and Kiswahili rubric (0–3 of 15 cases passing, versus 11 of 15 for the hosted 70B model), and the production prompt (about 4,300 tokens) takes 12–31 seconds just to read on a laptop. A shared machine in the community can run a far stronger model and spread its cost across many learners, and local networks (community Wi-Fi/mesh) can reach it with no internet. A follow-up model search (hosted inference, same cases) found that open models in the 9–27B range — which a modest node can run — match or beat the hosted 70B on our rubric (Gemma 3 12B passed 15 of 15), while Qwen3 models failed Kiswahili at every size. Family and training matter more than parameter count; see `docs/evaluation/methodology.md`.

**Decision:** Afribit AI is served in three tiers, so every phone gets the best experience it can actually get:

1. **Cards (any phone, no network):** reviewed knowledge cards with local search and a local scam/secret guard. No model.
2. **Community node (on the local network):** a machine the community controls runs the model and the Afribit AI API. Free to use, no internet required, nothing leaves the network.
3. **Cloud (optional, explicit opt-in):** hosted models, used only when a deployment chooses `hybrid` mode or runs as the public demo.

The API runs unchanged in cloud or on a node; the choice is configuration (`INFERENCE_MODE`, ADR 0009).

**Consequences:**
- Phones stay thin clients. We do not ask learners' phones to contribute compute; their valuable contribution is language review (Microtasks).
- Hardware is sized from measured model requirements (find the smallest model that passes our rubric), not from aspiration.
- A node is operational infrastructure: power, security, uptime, stewardship. See `docs/program/community-node.md` and `docs/security/threat-model.md`.
- Extracting a platform-neutral core package for native/offline clients is deferred until such a client exists.
