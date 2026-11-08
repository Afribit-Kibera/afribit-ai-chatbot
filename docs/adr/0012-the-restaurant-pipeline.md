# ADR 0012 — The restaurant: waiter, chef, and a pantry the community owns

**Status:** Accepted (built, off by default; evidence below; needs blind human review before use).

**Context:** We want to use the best available model for accuracy and for questions beyond our knowledge cards, without exposing learners' words, names or dialect to a third party, and without that model deciding how the community talks. A single model does both jobs badly: the language that sounds natural and the facts that are right are different skills.

**Decision:** Split the work like a restaurant.

- **Customer** — writes in Sheng, Kiswahili, English or a mix.
- **Waiter** — a small model that speaks the customer's language. It writes a neutral English *order ticket*, and at the end serves the answer back in the customer's own register. Ideally runs locally.
- **Chef** — a larger, hosted, zero-data-retention model. It receives **only the scrubbed English question and the community's reviewed knowledge cards**; it never sees the customer's message, name, number or dialect. It returns a short fact sheet.
- **Pantry** — the community's reviewed knowledge: the only source of facts. Nobody, human or model, approves their own output.

Implemented in `apps/api/src/restaurant/` (the chef and a deterministic scrubber), `apps/api/src/waiter/` (the ticket) and `buildServePrompt` (the serving step). Switch with `CHAT_PIPELINE=restaurant`. It is ignored in `node` mode (there is no hosted chef), and any failure of the chef or waiter falls back to the single compact prompt.

**Evidence (15 cases):** the full restaurant passed 14 of 15 on the language rubric and was accurate on 13, none clearly wrong, using about 1,400 prompt tokens across three calls. A single compact prompt did as well on questions the cards answer (13–14 passed, 11–13 accurate), so **the chef is not needed for accuracy where the cards suffice** — its value is privacy and, later, questions the cards do not cover (untested).

**Privacy, stated carefully:**
- The waiter's ticket dropped most personal details but leaked a first name and a Lightning invoice in a six-message probe. A deterministic scrubber (phone numbers, long identifiers, emails, names that echo the customer's words) is the backstop. It is a safety net, **not a guarantee**: the claim is "the hosted model sees far less", never "nothing".
- The privacy benefit exists only when the **waiter is local** (a node, or `hybrid` mode). In pure `cloud` mode the waiter is hosted too, so the pipeline buys accuracy, not privacy.
- The chef sees one question, not the conversation, so follow-ups that depend on earlier turns lose context.

**Consequences:** The harness — the waiter's language rules, the safety floor, the knowledge, the evaluation and the review process — is the community's asset and works with whatever model is best next year ("bring your own chef"). Three calls cost more latency than one; the compact prompts keep the total about a third of the old single prompt.
