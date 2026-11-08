# Community language iteration preparation - 28 October 2026

**Offline preparation complete,13/13 checks; candidate remains draft. No model output or language
improvement measured.** Edmund's "Continue" authorizes the next implementation step after the
[three-reviewer findings](2026-10-28-three-reviewer-findings.md). It does not establish community
sign-off of the proposed wording. [F-032](../../features/F-032-community-language-iteration.md)
was written before implementation.

## Every new preparation trial

| Trial | Observed result |
|---|---|
| [dc63cca7](../../../output/trials/dc63cca7-b26d-4152-b35a-cf037f8536f4.json) | First offline preflight13/13; real full/compact/serve prompt builders, pack/mode and async isolation, unchanged safety/passages, poisoned assessor metadata refusal, context overflow and changed-record checks |
| [f1ac615c](../../../output/trials/f1ac615c-2f35-4fc3-a53c-966b9acbcea3.json) | Same13/13 in full root test run;8 synthetic cases,15 prepared compact prompts, minimum conservative remaining estimate2651 after reserving300 output tokens in8192 |
| [192db411](../../../output/trials/192db411-dc17-4d1f-a109-9c210154f136.json) | Final handoff freeze: current source matches preflight, protocol still draft/unapproved, copied recipe/suite/protocol and full validation logs with hashes,17 full-suite trial records retained |

All three completed, paid compute$0, model calls0. Deliberate invalid-input assertions are checks
inside a passing trial; they are not new real model attempts. Full-suite negative CLI child records
are retained below. No failed language-preparation invocation occurred in this pass.

[Final frozen handoff and SHA-256 digests](../../../output/language-iteration-handoff/192db411-dc17-4d1f-a109-9c210154f136/summary.json),
[prepared prompts](../../../output/language-iteration/f1ac615c-2f35-4fc3-a53c-966b9acbcea3/prepared-prompts.json),
[checks/summary](../../../output/language-iteration/f1ac615c-2f35-4fc3-a53c-966b9acbcea3/summary.json),
[operator guide](../../guides/community-language-iteration.md).

## What was built and tested

The recipe derives an in-memory synthetic candidate using existing pack fields. Proposed wording
reaches only target Sheng/mixed language policies. Schedule-task guidance applies to the target's
other language modes too, while their language policies stay unchanged. Other communities' full,
compact and serving prompts remain byte-identical. Safety strings, factual passages, existing
examples and postprocessing rules are preserved. No blind word substitution or global style rule.

Tests use actual builders and `runWithPack` async scoping. Concurrent candidate/control/baseline
work retains its own pack; active registry/base-pack hashes remain unchanged. Wrong communities,
undeclared/non-code-switched modes, duplicate cases/packs and fake approved metadata refuse.
Whitelisting admits only the question/passage; changing assessor fields or adding raw-review
markers leaves prompts unchanged. History/question order is preserved. Updated supplied facts
change passage/prompt hashes while the language recipe hash remains constant, without a model call.

Eight engineering-authored probes cover paid/free visits, unknown price, false day premise, current
record replacing an old one, midnight/noon, English and another-community control. Seven target
cases have baseline/candidate pairs; one control has a single unchanged prompt,15 total. These
fixtures are developer-visible and not a community-authored held-out benchmark. No answer, fluency
score, exact tokenizer claim, hardware throughput, GPU memory or new retrieval-quality result.

Compact previews fit the conservative UTF8/message/template estimator at8192 with300 reserved output
tokens; minimum remaining estimate2651. Full/serve paths were tested structurally, not admitted
as8192 generation recipes. Overflow refuses before a request can be planned here. This helper has
no provider, activation, install, database mutation or rental path, so no inference dispatch occurred.

The review protocol separates technical completeness, source-fact/task eligibility and human
language/acceptance judgments. Numeric release threshold and community approvals stay unfilled;
they require a prior decision before a scored model run. No retrospective pass criterion applied
to the original reviews. Original feedback/answers and all earlier trial artifacts are unchanged.

## Final verification and identity

`pnpm test`, `pnpm typecheck`, `pnpm build` all exited0. No dependency install. The new13-check suite
is part of root tests. Standing review-tool6, community9/integrated28, showcase19, rental17,
worker13, store15, telemetry12, HTTPS7, gate14, web77 and other standing API suites passed.

| Full-suite trial | Result |
|---|---|
| [ab2ff06b](../../../output/trials/ab2ff06b-c22f-4147-b5f7-1284eb35c98b.json) | Journal-replacement fixtures pass |
| [331465e3](../../../output/trials/331465e3-a3d3-4e69-90fd-395fa18e7634.json) | Review-tool6/6 |
| [f1ac615c](../../../output/trials/f1ac615c-2f35-4fc3-a53c-966b9acbcea3.json) | New language preflight13/13 |
| [360af1cc](../../../output/trials/360af1cc-d476-4f57-9e98-b0c631cacd41.json) | Showcase19/19 |
| [b3a097d6](../../../output/trials/b3a097d6-78e7-4688-abaa-1992c1b853a8.json) | Rental/documentation17/17 |
| [b32876d8](../../../output/trials/b32876d8-7ccf-418d-a219-d82b9cbf7b43.json) | Discovery fixtures pass |
| [86993c7d](../../../output/trials/86993c7d-30ed-4df5-8fc3-a35f8f5293ca.json) | Artifact fixtures pass |
| [d8bbcb57](../../../output/trials/d8bbcb57-9dc6-4c2a-bc86-44acd16782c7.json) | Community9/9 |
| [56ce9880](../../../output/trials/56ce9880-be82-42e1-9a37-d0e0502b22ef.json) | Integrated28/28 |
| [823f71e9](../../../output/trials/823f71e9-220d-4344-9dd8-eddeaa62cb73.json) | Telemetry12/12 |
| [cc87c7da](../../../output/trials/cc87c7da-611b-4de1-abd7-f41c95cc9282.json) | HTTPS7/7 |
| [ca2bee47](../../../output/trials/ca2bee47-fb94-448e-8119-8d0b370eb8c6.json) | Store15/15 |
| [a57c77ac](../../../output/trials/a57c77ac-2301-498b-9d8a-05b0df9618ad.json) | Worker13/13 |

Expected CLI children of the passing rental suite:
[2185bc18](../../../output/trials/2185bc18-9885-4ce3-adc7-674e45ace693.json) completed preview,
[eec69250](../../../output/trials/eec69250-dc16-4cb9-b2ba-e0c85ec30622.json) expected refusal,
[ab39ee1c](../../../output/trials/ab39ee1c-f628-45b8-b190-3a9f2267bf4e.json) completed preview,
[08db8978](../../../output/trials/08db8978-4fb9-46cb-bf52-54f467c9e231.json) expected validation
failure. All17 suite records are listed in the frozen manifest; failures were not removed.

Base commit `965d4c3f13747679391ecd2e1bd362acb4940f2d`, uncommitted source hash
`6292670985a24f69fe0a373bbe43351cfe7747e9f172cb2c3d973b5a8f232d4d`.
The source fingerprint covers API/config/shared TS/JSON; separate recipe/suite/protocol/log/helper
hashes are frozen in the handoff. Production pack files remain unchanged. No deployment or migrations.
Frozen paid-run/source identities from F-030 are historical and do not match this new source.

## Next gates and cost

Community review of concrete proposed wording/protocol, then fresh community-authored/approved
held-out questions, a reconciled funded allocation and actual baseline/candidate outputs with
human review. No quality or training-privacy result follows from a successful preflight. Physical
AI-chat/LAN uplink-loss, affordable node hardware, governed4-of-7 administration and TEE are separate.

No new model download, fine-tuning, rental, paid API call, network-setting change or outbound message.
Reported costs and conservative reservations unchanged: $9.995020 held/allocated within original$10,
including untouched$2 held aside; $.004980 unallocated. No refund/reset or new allocation here.
The temporary review-page host's existing lifecycle is separate; this pass neither extends it nor
counts its prior user-observed iPhone page loading as an AI-chat test.
