# Prepare the next community language iteration

28 October 2026. **Offline candidate prepared and tested; no model answers generated or learner
pack changed.** The [three-reviewer findings](../evaluation/trials/2026-10-28-three-reviewer-findings.md)
are the baseline. They are development feedback now, not a held-out test for a prompt tuned on them.

## What is ready

- [Proposed language/task guidance](../evaluation/community-language-proposal-v1.json), explicitly
  draft, no community approvals, scoped to synthetic `language-pilot-a` only.
- [Eight new development probes](../evaluation/language-iteration-synthetic-v1.json), authored for
  engineering checks. Seven target-community cases prepare baseline/candidate pairs; one other-
  community control stays unchanged. That is15 prompt previews, not15 model completions.
- [Proposed review protocol](../evaluation/language-iteration-review-protocol-v1.json), written before
  future generation. It separates technical completion, factual/task requirements and human ratings.
  A numeric release threshold is deliberately unfilled pending a prior community decision.
- [Implementation/trial report](../evaluation/trials/2026-10-28-language-iteration-preparation.md)
  with prompt hashes, source identity and output-reserved context estimates.

Run the offline preflight:

```powershell
pnpm --filter @afribit/api test:language-iteration
```

It creates a new UUID record and `output/language-iteration/<UUID>` with copied proposal/suite,
prepared prompts, checks and summary. It does not call a model, provision compute, install a pack,
publish reviewer notes, connect to the application database or turn notes into training examples.

## How guidance is scoped

The operator helper `apps/api/src/showcase/languageIteration.ts` derives an in-memory candidate
from an explicitly named pack. Real full/compact/serve builders consume the pack's existing fields;
the runtime engine needs no new global language setting or string-replacement filter. The helper is
only imported by this offline CLI. It has no activation route or provider dependency.

| Component | Candidate behavior |
|---|---|
| Target Sheng/mixed language policy | Adds proposed conversational guidance |
| Target English/Kiswahili language policy | Preserves the existing policy, with no added pilot Sheng guidance |
| Target schedule-task shape | Adds explicit facts/price, unknown details, visit planning and relevant-closing guidance in every target language mode |
| Other community | Keeps all prompt bytes unchanged |
| Safety, knowledge records, examples and cleanup rules | Preserved; no raw reviewer material injected |

The guidance favors natural sentence rewrites using `vile`, `kwa`, `ina-` constructions and
`inacost` when appropriate. It permits `cheki` and `ona` variants. It requests clear12-hour time,
explicit free/price details, supported separate visits and clarification only when useful.
Style cannot change a factual number or weaken safety. These are proposals for this pilot's
audience, not universal Sheng rules. Full/compact/serve tests verify propagation; only compact
previews receive the8192-window admission check in this iteration.

## What reviewers still need to decide

Confirm that the proposed wording, time notation and optional relevant closing match the intended
community. Confirm the semantic checklist and agree the release decision rule before generation.
Record actual approval rather than treating file submission or "Continue" as community language
sign-off. Existing reviews did not grant raw-note publication, corpus inclusion or training rights.
The recipe rejects claims of approval and is deliberately limited to draft synthetic preview.

The eight probes cover paid/free visits, unknown price, a false opening-day premise, an updated
record, midnight/noon formatting, English and another community. Assessor requirements are stored
separately from the whitelisted question/passage used for prompts. Poisoned-assessor tests prove
those fields cannot change prepared prompts. Facts are supplied passages here; this does not add
a new SQL/pgvector retrieval benchmark. The existing API harness separately tests real lexical SQL.

These fixtures are not a sealed benchmark: developers can read their expectations, and they are not
community-authored. Obtain fresh community-authored/approved held-out cases before an improvement
claim. Keep the previous baseline and all incomplete/failed outputs, compare the same facts/model/
settings, blind recipe identity and record individual disagreements. Do not score fluency by looking
for a few preferred substrings, or label a manually edited answer as a model output.

## Before a real run

No rental or model request is authorized by this preflight. Conservative allocations remain
$9.995020 of the original$10, including$2 held aside. Reconcile spending and select a funded bounded
allocation before new compute; do not reset ledgers. A real run also needs current source identity,
model/digest/context verification, a supervised disposable lease, fresh credentials and cleanup.
Current source has changed since F-030: its frozen source fingerprint and closed reservation cannot
be silently reused. The old successful run remains evidence only for its original source/settings.

After community approval, map the recipe to that actual pack through normal reviewed pack files,
retain version/provenance and test isolation again. Then run a funded comparison and collect human
ratings. This stage can test adaptation through context without fine-tuning; whether it improves
answers remains an empirical question. Physical AI-chat/LAN uplink-loss testing is still separate.
