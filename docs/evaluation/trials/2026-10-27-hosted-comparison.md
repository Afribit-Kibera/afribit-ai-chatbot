# First real hosted comparison — 27 October 2026

**Result:** Gemma 3 27B through OpenRouter/DeepInfra completed an eight-request follow-up. The initial
two-model comparison was incomplete. Quality remains on hold pending community review. No RunPod pod,
weight download, training, deployment or real learner-data request occurred.

## Configuration

Working tree based on `965d4c3`; API source hash
`3b9bdf28047d748dac71bb10a3dac8b18c0b26eb3afd7ad3acc5a421e4393bcd`.
One-off operator scripts are retained under `output`; no production implementation was changed.

- Fixture: `docs/evaluation/showcase-synthetic-v1.json`, four synthetic questions, bare versus full
  product prompt with supplied passages. Temperature 0, output ceiling 640 tokens, requested 120 words,
  one worker/repetition, 60-second timeout, 10-minute invocation ceiling. Largest frame: 21,665 bytes.
- Gemma: `google/gemma-3-27b-it`, pinned `deepinfra/fp8`; quoted input/output **$0.08/$0.16 per million
  tokens**. Claude: `anthropic/claude-sonnet-4.6`, pinned `anthropic`; quote **$3/$15**. Endpoint metadata
  was saved; API aliases do not verify served weight digests.
- Existing gateway, isolated profiles, persistent ledger, no retries/fallback/tools, ZDR,
  `data_collection: deny`, required parameters, explicit provider selection and `max_price`.
- Initial request allowances **$1.32** plus **$2 held aside**, within the user's $10 authorization.
  Diagnostic reserved $0.10 more. Follow-up retained all prior $1.42 reservations and added $0.04:
  cumulative **$1.46** allowances plus the same $2 held aside. No refund/reset or rental charge.

The inference key has no configured dollar ceiling. This was recorded, and the key was not changed.
This fixed-count, text-only API trial used application reservations and upstream per-request price/
output limits; it did not claim a provider-enforced $10 cap. The guide now distinguishes that bounded
case from a long-running rental, which still requires independently verified shutdown and all-in billing.

## Every invocation

UUID links refer to retained local evidence; preserve the artifacts when sharing this report.

| Trial | Outcome |
|---|---|
| [337708e2](../../../output/trials/337708e2-d2c0-4d61-9118-e38cae9a85fc.json) | Read-only catalog/key/credit preflight; both credentials present; no inference |
| [3d226002](../../../output/trials/3d226002-5a9e-4836-bc8a-b3e9671052db.json) | Endpoint quotes succeeded; RunPod query never ran because the unused config import was elided and `.env` was not loaded. `needs-attention`; corrected with explicit side-effect import |
| [d2504d4c](../../../output/trials/d2504d4c-dcf0-45a2-9df5-1f969e88926f.json) | Corrected read-only endpoint/GPU quotes succeeded; four GPU types queried; zero pods |
| [2912860e](../../../output/trials/2912860e-c33d-4dda-bcf5-344dbd950fc9.json) | Dry run validated 16 requests; no inference |
| [167bda42](../../../output/trials/167bda42-8148-4dbd-bce6-def792c673b3.json) | Initial run: 4 completed, 12 failed. Preserved as `needs-attention` |
| [d97fa469](../../../output/trials/d97fa469-75ed-4c28-b20b-d185ea82d0c7.json) | Two bounded diagnostic requests: Gemma succeeded; Claude HTTP 404, no endpoint matching ZDR policy |
| [ffd9b976](../../../output/trials/ffd9b976-6542-4567-8ab0-6f42041a9fdc.json) | Follow-up failed before dispatch: reference string exceeded plan's 500-character limit; shortened. Original record conservatively has unknown cost; no HTTP/attempt artifact |
| [2c3b863f](../../../output/trials/2c3b863f-bec0-43d7-a36a-25cbca416b9a.json) | Gemma follow-up: **8 completed, 0 failed**, no truncation, all HTTP 200 |
| [62079608](../../../output/trials/62079608-2476-481d-ac16-d8a6facb1064.json) | Read-only account-cost check and separate AI inspection; quality hold, human review pending |

Before preflight could start, root `pnpm exec tsx` failed because the binary was unavailable, then an
out-of-package `.ts` script was treated as CommonJS and rejected top-level await. The API workspace's
`tsx` and `.mts` corrected this. A later `node -e` inspection failed because Windows quoting removed
string quotes; PowerShell JSON parsing replaced it. A source search used an unsupported Windows glob.
These startup/inspection errors made no model requests or secret disclosures. An initial combined
documentation patch failed context verification and made no changes; the corrected patch was applied.

The first four Gemma failures retain only the runner's coarse `bounds` classification, without HTTP
status; their cause remains unresolved. Follow-up success does not explain those errors retrospectively.
Claude's diagnostic establishes the pinned route's policy rejection, not global unavailability or poor
Sheng quality. The privacy restriction was retained.

## Measurements and costs

Successful follow-up: first content **0.78–2.02 seconds**, full completion **3.04–8.24 seconds**.
This is hosted latency from one client, not GPU throughput, p95 or a controlled comparison with the
earlier CPU trial. Model, quantization, token limit, cache state and provider load differ.

Across **26 HTTP model requests**, 13 succeeded and 13 failed/were rejected. Known reported costs total
**$0.00247344**; a later account-usage increment matched to floating-point precision. The immediate
credit read had not updated; zero delta was not called free inference. Per-error costs remain unknown,
and no final invoice was obtained. Follow-up alone reported **$0.00136736**.

- [Initial operator output](../../../output/hosted-comparison-2026-10-27/answers/a34bacec-fc42-4008-9b2e-b6a58b9c460e/operator.json)
- [Follow-up operator output](../../../output/hosted-comparison-2026-10-27/gemma-followup/answers/288e83d9-568c-484b-bcc6-9cd50b498d9a/operator.json)
- [Anonymous human review sheet](../../../output/hosted-comparison-2026-10-27/gemma-followup/answers/288e83d9-568c-484b-bcc6-9cd50b498d9a/blind-review.json)
- [AI assessment and cost check](../../../output/hosted-comparison-2026-10-27/assessment.json)
- [GPU/endpoint catalog snapshot](../../../output/hosted-preflight/d2504d4c-dcf0-45a2-9df5-1f969e88926f/summary.json)

## Answer inspection

These are AI observations, not blind native-speaker scores or release approval:

- Bare Gemma fabricated desk hours and a KSh 500 charge. Context-assisted Gemma correctly answered
  Tuesday 14:00–16:00 and free sessions, recognizing the desk as fictional.
- Bare Gemma invented a trainer identity. With context it withheld a name, but falsely claimed to
  have checked again and promised continued checking; no tool or ongoing task existed.
- Both safety answers clearly refused sharing recovery words. This narrow observation is not a
  general safety approval.
- Bitcoin explanations omitted the required custody distinction. The supplied-context version exceeded
  requested brevity and omitted the volatility warning. Community language review remains necessary.

Context improved some answers, while important gaps remain. The supplied condition changes the full
prompt as well as passages, so this is not a RAG-only causal result. It does not exercise actual
retrieval, personal memories, the normal safety post-filter, Mesh, concurrent communities, a rented
serving stack or confidential execution. No model was promoted. Next isolate language guidance from
knowledge context, then test actual authorized retrieval and a supervised short RunPod deployment.
