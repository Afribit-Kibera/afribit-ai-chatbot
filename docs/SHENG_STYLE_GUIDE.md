# Sheng Style Guide

Captured directly from product-owner review of live model output on
2026-09-17, after the first live-chat eval (`chat_evaluations`, campaign
`batch_2026_09_003` — see `docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md`)
showed the critic model calling 77% of non-fallback responses "awkward."
This is the source of truth those corrections came from.

**The authoritative, actually-used copy of this guidance lives in code**:
[`apps/api/src/prompt/shengStyleGuide.ts`](../apps/api/src/prompt/shengStyleGuide.ts)
(`SHENG_STYLE_GUIDE`), imported into the live chat prompt
(`prompt/promptBuilder.ts`), the Dataset Lab generation prompts
(`dataset-lab/promptTemplates.ts`), and the critic/judge scoring prompts
(`dataset-lab/critique.ts`, `dataset-lab/judge.ts`, `dataset-lab/runEval.ts`)
— one standard shared by the model that talks to users and the models that
generate/score training data. This document is the human-readable version;
if the two ever disagree, the `.ts` file is what's actually running.

**Update (2026-09-17):** the rules above alone only got the model to
bookend responses with corrected vocabulary ("Niaje, Bro" ... "we niambie
tu") while leaving the explanatory body in formal Kiswahili sanifu — a live
eval (`chat_evaluations`) caught this directly. What actually fixed it was
adding real demonstrated conversation turns, not more rules:
[`apps/api/src/prompt/shengFewShotExamples.ts`](../apps/api/src/prompt/shengFewShotExamples.ts)
(`SHENG_FEW_SHOT_EXAMPLES`), injected into the live chat prompt for
sheng/mixed_ke only. Two of its four examples are real `chat_evaluations`
rows the critic model itself scored "natural" at 4-5/5 — not invented from
scratch. A model swap to Claude Sonnet 5 was also tried and reverted once
these examples made the register work on the existing Llama model too —
see the reasoning in `chatService.ts`'s `selectModelProfile()`.

## The core mistake

The model was doing **literal English-into-Kiswahili substitution** —
grafting an English word onto Swahili sentence structure unchanged — rather
than using actual Sheng vocabulary and particles. Every individual word
reads as "correct" but the result is not how anyone actually talks.

| Wrong (literal substitution) | Right (real Sheng) |
|---|---|
| "Karibu. Nitaongea kwa Sheng + English. Ukiwant nibadilishe style later, niambie tu." | "Niaje. Nitabonga na Sheng + English. Ukitaka (or 'Ukidai') nichange style later, we niambie tu." |
| "Explain Bitcoin like niko beginner" | "Explain Bitcoin design ya beginner" / "Explain bitcoin assuming mimi ni beginner" / "Explain Bitcoin ni ka mimi ni beginner" |

## Corrected vocabulary

| Term | Meaning / note |
|---|---|
| Niaje | Greeting — use instead of "Karibu" (too formal/sanifu for a casual chat opener) |
| Bonga | "Talk/chat" — "Nitabonga" not "Nitaongea" |
| Dai | "Want/desire" — "Ukitaka"/"Ukidai" not "Ukiwant" (don't graft the English verb onto a Swahili prefix) |
| We (pronounced "weh") | Means "you" — e.g. sentence-final "we niambie tu" ("you just tell me") — **not** the English word "we" |
| Bro | Use "Bro," never "Mbro" |
| Msee | A person |
| Boyz | A guy — singular use is normal, not plural |
| Alienda missing | Went off the grid / can't be reached / disappeared |
| Ni ka | "As if / like" — for comparisons, instead of English "like" |

## Model sentences (match this register)

- "Boyz anaeza buy bitcoin Bitika sai bila worries kwa sababu sai kuna code inatumwa kwa sms before ununue." (A guy can buy Bitcoin on Bitika now without worries because now there's a code sent via SMS before you buy.)
- "Bitcoin si scam, ni kama tu vile unaeza buy bread na Mpesa but this time ukitumia Bitcoin, over time unapata unaeza buy vitu most than Kenya shilling." (Bitcoin isn't a scam — it's just like how you can buy bread with Mpesa, but this time using Bitcoin, over time you find you can buy more things than with Kenyan shillings.)

## Example questions this should handle naturally

- "Na hii bitcoin huwa nini?"
- "Bitcoin ni scam ama?"
- "Ebu explain bitcoin vizuri mos mos tu hadi nielewe"

## Status

This is a first correction pass from one native-speaker review session, not
a linguistically exhaustive Sheng reference. Treat it the same way the rest
of `docs/LANGUAGE_CORPUS.md`'s model treats any single source: useful,
directional, and worth expanding with more real corrections over time —
not a substitute for the L2/L3 human-reviewed corpus that's still the real
long-term goal.
