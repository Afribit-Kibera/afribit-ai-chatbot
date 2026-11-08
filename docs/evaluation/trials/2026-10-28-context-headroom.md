# Context headroom correction and rental-billing observations - 28 October 2026

**Outcome:** offline context admission and incomplete-answer handling implemented. Compact/8192
passes its conservative preparation estimate; no new inference, rental, weight download or training.
Native human review and a real model/tokenizer rerun remain open. All prior rental Pods are absent.

## Question and implementation

Could the evaluator have refused the prior full/4096 recipe before paying for comparison calls, and
could it distinguish truncated outputs from complete answers? The retained rental response has
4089 prompt + 7 completion tokens, `finishReason: length`. The previous runner counted that as
transport success and marked its review entry complete.

[F-028](../../features/F-028-showcase-context-headroom.md) adds an explicit full/compact showcase
recipe, optional declared context, and native-Ollama runtime-window agreement. It estimates message
demand using UTF-8 content bytes +64 per message +256 template allowance and reserves all requested
output tokens. Oversize preparation fails before ledger creation/dispatch. It never silently trims
inputs. This is deliberately conservative, not exact model tokenization or proof against arbitrary
template behavior. Production prompt selection, community data and account-memory behavior are unchanged.

Length finishes now preserve partial text/usage but count as failures, with incomplete anonymous
review entries and a truncated summary count. New manifests/previews retain admission arithmetic;
protocol-version fingerprints prevent silently resuming an earlier ledger under changed semantics.

## Every trial and validation

| Trial | Result |
|---|---|
| [b13e777d](../../../output/trials/b13e777d-063a-4eb8-a37e-7dee26f6c714.json) | Initial expanded showcase suite 18/18; localhost only |
| [296ff509](../../../output/trials/296ff509-53eb-4123-b367-1363a09af09c.json) | Three-recipe preparation on the unchanged rental benchmark/pack; full4096 and full8192 refused, compact8192 admitted by estimate; zero network/model calls |
| [eafb3a8c](../../../output/trials/eafb3a8c-6913-4f41-9506-6e27b9569d36.json) | Expanded native streaming/manifest suite 19/19 in first full run; 53 localhost fixture calls |
| [14916bf3](../../../output/trials/14916bf3-06b3-4416-9e3c-a835f5d3eec5.json) | First full run failed in rental suite at old CLI-preview expectation; 15 cases passed before failure; no account calls |
| [87eb4319](../../../output/trials/87eb4319-562c-478e-8e0e-dca9804dd004.json) | Expected rental CLI preview completed, zero account calls |
| [ceb8fea3](../../../output/trials/ceb8fea3-e836-4824-ae29-7e36ba2e53d0.json) | Deliberate invalid rental argument refused, zero account calls |
| [8bb87377](../../../output/trials/8bb87377-5916-4fce-b256-ba58e797824f.json) | Old default full-prompt preview refused under inherited native context8192; preserved failed record, no model calls |
| [695f1270](../../../output/trials/695f1270-c9e4-41a4-8253-40b3d98979c6.json) | New compact-context example preview completed, eight prepared tasks, zero model calls |
| [2ce0b148](../../../output/trials/2ce0b148-0c41-4f9b-9f60-5f7593c5f6ed.json) | Second full-run showcase suite 19/19; includes native compact context8192/max300/thinking-disabled wire settings |
| [cf953a3b](../../../output/trials/cf953a3b-0d13-4fd7-a831-f44d8a04ad56.json) | Second root run failed in CLI fixture counting five new UUIDs instead of its four: concurrent review derivation had created an unrelated journal; no account calls |
| [8164258a](../../../output/trials/8164258a-56ea-4d02-9062-0a5f29cf8ea6.json), [4d604e4b](../../../output/trials/4d604e4b-44ff-4254-bcfa-335eb09238aa.json) | Second-run rental CLI preview/expected argument refusal recorded as completed/failed respectively |
| [536f4ef4](../../../output/trials/536f4ef4-7f67-4f0e-b737-98dbe0d24b28.json), [fa21eafc](../../../output/trials/fa21eafc-c95b-4a5c-a793-4a6a92a25c08.json) | Second-run showcase CLI preview/expected argument refusal recorded as completed/failed respectively |
| [75cface1](../../../output/trials/75cface1-b088-4953-9599-9ee3a63350dd.json) | Final full-run showcase suite 19/19, 53 localhost fixture requests |
| [7bcbbab7](../../../output/trials/7bcbbab7-3ff0-43c0-aaba-24e9d19e0056.json) | Final full-run rental/CLI suite 17/17, no account calls |
| [9bc10378](../../../output/trials/9bc10378-39c1-467b-a2c1-8dc3b13fc279.json) | Read-only derivation of anonymous review pack: 16 original answers, four marked incomplete, source hashes retained, no human scores added |
| [c5e39797](../../../output/trials/c5e39797-1a5e-4a39-aac2-358ddcdb11cc.json) | Successful rental billing HTTP200/one row, reported $0.040801142691634595; Pod404/account0 Pods |
| [e1ee372d](../../../output/trials/e1ee372d-0785-4358-8a25-359443b32552.json) | First failed model-session billing HTTP200/one row, $0.019573818892240524; Pod404/account0 Pods |
| [798cf0aa](../../../output/trials/798cf0aa-0392-46c4-b06c-711aa0ac6744.json) | Second model-session billing HTTP200/one row, $0.05441781505942345; Pod404/account0 Pods |
| [5cf3775a](../../../output/trials/5cf3775a-8bfe-490f-817c-5e094afe74e6.json) | Third model-session billing HTTP200/one row, $0.009391230531036854; Pod404/account0 Pods |
| [85078a88](../../../output/trials/85078a88-4406-4491-8c58-c74dfc65a264.json) | Read-only billing rollup, no network: four model sessions reported $0.12418400717433542, not a final invoice |

The initial root failure was a fixture-environment assumption exposed by the new guard, not a
provider call: the generic CLI test expected the full prompt to preview under whatever context
the development `.env` supplied. Its child now explicitly owns a fixture-only native context32768;
guard behavior at4096/8192 remains covered separately. No production context grew. Context refusals
in the CLI now print only a small allowlist of local configuration messages; provider bodies stay hidden.
The second root failure exposed a global-journal count race: the test counted the independent
review-derivation UUID as one of its four CLI invocations. It now filters by the two expected CLI
purposes; no trial record is removed. Context-matching patch refusals changed no files before the
corrected patches applied.

The [preview artifact](../../../output/context-headroom/296ff509-53eb-4123-b367-1363a09af09c/summary.json)
retains source, benchmark, pack, per-task message hashes and arithmetic. Maximum estimates:
full22048/compact4074; output300. Compact8192 minimum remaining estimate3818. Do not mislabel those
values as exact tokenizer counts, live capacity measurements or a model-quality pass. The original
[rental report](2026-10-27-rented-model-worker.md) and frozen paid-session artifacts remain intact.

Final **`pnpm test`**, **`pnpm typecheck`** and **`pnpm build`** pass. The full run includes 19 showcase,
17 rental, 15 store, 12 worker, 12 telemetry, 7 HTTPS, 9 combined-harness, 14 gate and 77 web checks,
plus the other standing suites. Final application/test source hash:
`4badb7d732277ae157516e9126f0123c92be9cb2f37c62499ce3a52d0df29e14`, uncommitted base
`965d4c3f13747679391ecd2e1bd362acb4940f2d`. No UI change/deployment or migration. Initial successful
typecheck/build checks were repeated after runtime edits; the last fixture-only count correction did
not change built runtime code. All normal suite UUIDs and deliberate CLI refusals remain in
`output/trials`; the table highlights new behavior/failures/observations rather than overwriting them.

## Billing and budget

| Prior model session | Provider-reported USD |
|---|---:|
| First, manifest refusal | 0.019573818892240524 |
| Second, ready but comparison-plan refusal | 0.05441781505942345 |
| Third, arm proxy refusal | 0.009391230531036854 |
| Fourth, actual comparisons | 0.040801142691634595 |
| **Four model rentals** | **0.12418400717433542** |

The successful session includes reported GPU $0.04056966118514538 + disk $0.00023148150648921728.
API-reported disk was zero in the other three observations; this is a reported category, not proof
that all applicable storage fees are final. These are bucketed Pod-specific reports; `invoiceFinal`
remains false and no independent new account-balance reconciliation was performed.

Including earlier canary reported $0.006488841492682695 and hosted-model reported $0.00423240,
known reported combined charges are **$0.1349052486670181**. The new read-only observations/fixtures
cost $0. Conservative experiment allocations remain **$9.755016**, including untouched $2 held aside;
**$0.244984 unallocated**. No allowance was refunded, account credit treated as funding, or new paid
run admitted. All four owned model Pods returned404 and each account read reported zero Pods.

Next: review the corrected anonymous pack, retain full/compact as separate recipes, and obtain exact
model/template token counts plus a funded live repeat before language/capacity qualification. No
claim about full privacy, TEE, Mesh, fine-tuning or complete P4 acceptance follows from this work.
