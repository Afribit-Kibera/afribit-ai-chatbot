# Three-reviewer findings - 28 October 2026

**The planned collection is complete: three valid review forms, four answers, twelve ratings.**
The baseline needs language/usefulness refinement before acceptance. Collection completion is not
a model-quality pass. This is a small single-answer review of the synthetic live rental outputs,
not a comparison against Claude, a representative Sheng benchmark or a release certification.

## Deliverable and validation

Edmund supplied KS and GT returns after the earlier ES return. Each matches a different expected
pack: ES01/6633eca19d, KS02/8720a57dce, GT03/557a00e770. Each has all four expected case IDs,
single-answer mode, valid complete rating fields and coherent form timestamps. Source hashes,
pack IDs and normalized reviewer pseudonyms are distinct: no duplicate submission among these files.
The pseudonyms do not independently prove three separate identities or community audience fit.

All three source files remain unchanged. Copies, exact notes and scoring output stay in operator
artifacts. Aggregation joins by **case ID**, never by shuffled question number, and checks the
answer hashes against the frozen source mapping. One scorer invocation per matching private key;
the paired/comparison tool is not used to combine mismatched packs.

| Trial | Result |
|---|---|
| [458c41dd](../../../output/trials/458c41dd-d0c2-42d3-ad90-17d33000ad77.json) | KS/Reviewer02 validated and scored; original preserved;4/4 responses |
| [3d2dd20b](../../../output/trials/3d2dd20b-7ef0-4b9a-8983-821265fd37c0.json) | GT/Reviewer03 validated and scored; original preserved;4/4 responses |
| [3ebb549d](../../../output/trials/3ebb549d-241b-49b2-afa0-f07cbcdc0a3a.json) | Aggregate completed with earlier ES intake b645fe46; unique hashes/packs/pseudonyms, exact source mapping,12 ratings,3 unique answer texts, original source hashes rechecked |

[Combined structured findings](../../../output/human-review-findings/3ebb549d-241b-49b2-afa0-f07cbcdc0a3a/summary.json)
and [completed collection snapshot](../../../output/human-review-findings/3ebb549d-241b-49b2-afa0-f07cbcdc0a3a/collection-status.json)
are the current result. The [first-return report](2026-10-28-first-human-review.md) and its zero/two
pending counts remain historical. The intake helper now explicitly describes one intake only;
it no longer implies that other already-returned packs are pending. New aggregation covers all three.
All three new trials completed; no failed intake or model trial in this pass.

## Ratings

| Reviewer | Naturalness /5 | Fully correct | Mostly correct | Acceptable as written | Risk flags |
|---|---:|---:|---:|---:|---:|
| ES | 3.50 | 0/4 | 4/4 | 2/4 | 0 |
| KS | 4.00 | 1/4 | 3/4 | 1/4 | 0 |
| GT | 3.50 | 0/4 | 4/4 | 2/4 | 0 |
| Combined reviewer-answer ratings | **3.67** | **1/12** | **11/12** | **5/12 (41.7%)** | **0/12** |

Seven of twelve ratings request revision or rejection. No answer received unanimous acceptance;
one received unanimous rejection, and three had split acceptance votes. These are twelve judgments
of **four** outputs, not twelve separately generated answers. "Mostly correct" is the reviewer's
category, not an independently verified error diagnosis. No reviewer chose "incorrect" or flagged
risk, which does not establish factual perfection or general safety.

The stable labels below identify the exact outputs across shuffled copies. W1/W2 are the two
Wednesday-community results; F1/F2 are the Friday-community results.

| Output | Naturalness ES / KS / GT | Mean /5 | Accepted ES / KS / GT | Total accepted |
|---|---|---:|---|---:|
| W1 | 4 / 4 / 3 | 3.67 | Yes / No / No | 1/3 |
| W2 | 3 / 4 / 4 | 3.67 | Yes / No / Yes | 2/3 |
| F1 | 4 / 3 / 3 | 3.33 | No / No / No | 0/3 |
| F2 | 3 / 5 / 4 | 4.00 | No / Yes / Yes | 2/3 |

W1 and W2 have identical source answer text. Therefore these four cases contain only **three unique
answer texts**. Keep both ratings as collected; they are not independent evidence of task diversity.
Different ratings for the identical wording show variability that this sample cannot explain.
Binary acceptance agreement is6/12 within-case reviewer pairs; do not treat this as a population
reliability estimate or inflate it by matching different question positions.

## Shared feedback

| Theme | Submitted feedback | Review support | Interpretation for this pilot |
|---|---|---|---|
| Conversational phrasing | jinsi → vile; inavyo → ina | ES, KS, GT | Candidate scoped language guidance; use grammatical sentence rewrites, not blind string replacement |
| Preposition choice | kwenye → kwa | ES, KS | Candidate preference for this audience, not a universal rule |
| Cost phrasing | inakosta/inacosta → inacost | ES, KS, GT | Consistent dislike of the evaluated cost wording; preserve original spelling in raw notes |
| Time readability | Prefer12-hour clock | KS, GT | Express reference times clearly, e.g.3:00-5:00pm and9:00-11:00am, keeping original hours unchanged |
| Wording variation | kucheki/ona, with unaeza cheki or unaeza ona described as variants | GT | Allow local alternatives; do not convert this one note into a ban on cheki |

The time comments include local time expressions, retained verbatim in the private notes. They are
reviewer feedback, not a new externally verified language rule. Style preferences can differ across
communities; the approved guidance should be scoped accordingly. No exact evaluated answer or
reviewer note was silently corrected during scoring.

## Recommended next iteration

1. Have the community confirm a small style guide for conversational choices and time formatting.
   Put approved preferences in that community's prompt/language context. Do not automatically turn
   these evaluation notes into shared knowledge, training data or instructions for every community.
2. Address task completeness as well as wording: explicitly include the reference price/free status,
   make two visits understandable, avoid invented appointment dates and keep closing questions
   relevant. These were concerns in the original live report; do not attribute unspecified factual
   mistakes to reviewers who supplied no such explanation.
3. Write acceptance rules before the next run. Preserve this baseline and select fresh community-
   authored held-out questions. These four probes become development examples if their feedback
   changes the prompt; rescoring tuned answers on them alone cannot establish improvement.
4. Test the approved prompt plus RAG recipe before considering fine-tuning. A model retrain is not
   required to test conversational guidance or updated local reference facts. More GPU work needs
   a reconciled allocation: no new paid experiment is started by this report.

**Decision:** keep the baseline held for language/usefulness refinement. No numeric release threshold
was pre-registered, so this is a cautious engineering recommendation, not a retrospectively invented
statistical pass/fail rule. Review collection is finished; model-quality approval is still open.
The separate physical AI-chat/account/LAN uplink-loss demonstration also remains open. Earlier
iPhone page reachability and returned JSONs demonstrate review delivery, not those AI behaviors.

## Provenance, privacy and checks

KS reports20:41:55.405-20:46:34.497 Nairobi,279.092seconds; GT20:47:15.713-20:50:53.221,
217.508seconds. Exported intervals do not verify active review time, device clocks or identity.
Audience-fit/independence/compensation details and the precise export devices remain unrecorded.
The raw returns and notes are evaluation information; no publication/corpus/training permission is
inferred. Nothing was sent to other people, and the read-only Wi-Fi host has no submission upload API.

No application/prompt/model change, new dependency, training, rental or paid inference. Reused the
existing matching-key scorer; intake and aggregation validate actual files and preserve SHA-256
provenance. Original source-file and copied-file hashes are checked again in aggregation. Operator
helpers and source digests accompany their UUID artifacts. Previous full tests/typecheck/build
remain current; no full-suite rerun was needed for operator-only intake/reporting. All owned paid
resource/reservation accounting remains unchanged.
