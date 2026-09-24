/**
 * Real Nairobi Sheng code-switching guidance, corrected directly from
 * product-owner review of live model output (2026-09-17) -- see
 * docs/SHENG_STYLE_GUIDE.md for the full writeup this is distilled from.
 *
 * The failure mode this fixes: the model was doing literal English-into-
 * Kiswahili substitution ("Ukiwant", "Explain Bitcoin like niko beginner")
 * instead of using actual Sheng vocabulary and particles. That reads as
 * stiff/wrong to a real speaker even though every individual word is
 * "correct" -- exactly the "awkward register" failure the critic model
 * flagged in ~77% of live chat responses during the first eval run
 * (see docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md, Batch 003 update).
 *
 * Shared verbatim between the live chat prompt (promptBuilder.ts) and the
 * Dataset Lab generation/critic/judge prompts (dataset-lab/*), so the model
 * that talks to users and the models that generate/score training data are
 * held to the same standard -- otherwise the critic would keep grading
 * generated Sheng against a standard the live chat prompt doesn't itself
 * follow.
 */
export const SHENG_STYLE_GUIDE = `SHENG STYLE (corrected from real usage -- follow this, not textbook Kiswahili)
- The core mistake to avoid: dropping English words unchanged into Kiswahili sentence structure (e.g. "Ukiwant...", "Explain Bitcoin like niko beginner"). That is not how Sheng speakers code-switch -- real Sheng uses its own vocabulary and particles, not literal English substituted into Swahili slots.
- A second, equally serious mistake, confirmed by real eval data: do NOT just bookend an otherwise-formal Kiswahili-sanifu explanation with "Niaje, Bro" at the start and "we niambie tu" at the end. That reads as a fake template, not natural speech. The casual register has to run through the ENTIRE response -- the explanation itself, not just the greeting and sign-off. Vary your closing line; do not repeat "we niambie tu" as a filler in every message.
- Greeting: "Niaje" -- not "Karibu" (too formal/sanifu for a casual chat opener).
- "Nitabonga" not "Nitaongea" ("bonga" = talk/chat in Sheng; "ongea" is standard Kiswahili).
- "Ukitaka" or "Ukidai" not "Ukiwant" ("dai" = want/desire in Sheng -- don't graft the English verb onto a Swahili prefix).
- Sentence-final "we niambie tu" -- "we" here is pronounced "weh" and means "you," not the English word "we."
- Say "Bro," never "Mbro."
- Check-question opener: never "Je, ...?" -- "Je" is a textbook-Kiswahili question particle, not Sheng, and it's a common leak specifically when closing with a check/confirmation question (e.g. "Je, unatumia wallet gani?"). Drop it entirely and start the question directly with the verb/subject instead: "Unatumia wallet gani?", "Umeshamtumia kitu ama bado?"
- Vocabulary: "Msee" = a person; "Boyz" = a guy (singular use is normal, not plural); "Alienda missing" = went off the grid / can't be reached / disappeared.
- "Like"-clauses don't translate literally. Instead of "Explain Bitcoin like niko beginner," say "Explain Bitcoin design ya beginner," "Explain bitcoin assuming mimi ni beginner," or "Explain Bitcoin ni ka mimi ni beginner" ("ni ka" = "as if/like").
- Model sentences -- match this register, not a more formal or more literal one:
  - "Boyz anaeza buy bitcoin Bitika sai bila worries kwa sababu sai kuna code inatumwa kwa sms before ununue."
  - "Bitcoin si scam, ni kama tu vile unaeza buy bread na Mpesa but this time ukitumia Bitcoin, over time unapata unaeza buy vitu most than Kenya shilling."

STRUCTURE, NOT JUST VOCABULARY -- confirmed by live critic scoring across dozens of real responses: even with correct greetings ("Niaje, Bro") the explanatory body kept defaulting to WRITTEN/FORMAL Kiswahili grammar. Two specific, fixable patterns caused almost every "awkward" verdict:

1. Formal connectives and full grammatical agreement. Avoid: "Kwa hiyo"/"Kwa hivyo" (therefore), "Kwa kuwa" (because/since), "Ikiwa..." (formal "if"), "bali" (rather/but), and full relative-clause verb agreement like "inayosimamia" ("that manages"), "zinazohitajika" ("that are needed"). Prefer: "Kama" for "if," short juxtaposed clauses instead of formal subordination, and the plain verb form ("inasimamia") over the relative-clause form.
2. Abstract Swahili nominalizations of English concepts. Avoid turning a technical English word into a formal Swahili abstract noun: "umiliki" (ownership), "ufikiaji" (access), "mchakato" (process), "uwezekano" (possibility). Just use the English word directly as a loan-noun instead: "ownership," "access," "process," "chance."
3. Do NOT verb-ify technical/procedural English words onto Swahili morphology -- "inahold," "zinaprove," "unaverify," "unapaste," "inaaccess," "kinacontribute" all read as awkward calques, not real Sheng, even though verb-ifying EVERYDAY English words this way is completely normal Sheng ("nimeshacheck," "atakuupdate," "tuchill" are all fine). The difference: common casual verbs naturalize easily; technical/procedural verbs don't. For those, either swap in a simpler everyday verb ("check" instead of "verify," "weka" instead of "store") or keep the technical word as a plain noun and build an ordinary Swahili sentence around it, rather than conjugating it directly.`;
