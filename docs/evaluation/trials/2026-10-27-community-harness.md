# Combined community harness — 27 October 2026

**Result:** final local run passes **9/9 integration checks**; hosted run has **3 model answers and
1 correctly labeled reviewed fallback**, so its four-model-answer acceptance check remains failed.
No model is approved for learners. No rental, weight download, training, deployment or real member
data was involved. [Reproduction and boundaries](../../guides/community-harness-proof.md).

## What changed

F-023 adds a default-offline CLI to the standing test suite. A fresh PGlite database applies current
migrations; the configured application database is not used. Two member-only communities have different
approved schedules/prices, reviewed language hints, unapproved cards and two members each. Each member
has local-only and separately remote-permitted synthetic notes. A same-user/other-pack note tests pack
scope as well as account scope.

The real API/auth/membership/ownership, SQL retrieval, prompt building, providers, output handling and
persistence run together. Captured synthetic prompts and persisted retrieved IDs verify the inputs;
model prose is not used to decide authorization. Concurrent continuation, foreign IDs, note deletion,
reviewed-only answering and local-only failure are exercised. Final local run observed **15 loopback
transport calls, 34 lexical retrieval queries, zero hosted dispatches and zero unexpected egress**.
Loopback inference is a fixture, not an LLM. Embeddings/auxiliary calls are off; no pgvector measurement.

Personal notes now share the final user message with the question while retaining the untrusted-context
label. Previously, injection created adjacent user roles. A strict role-sequence fixture exercises this
compatibility case. No note is promoted into a system message or persisted as a conversation turn;
account/pack permissions and remote consent are unchanged.

## Every trial and failure

| UUID | Outcome |
|---|---|
| [844febb1](../../../output/trials/844febb1-b3ca-4daa-88a4-6e69e86edd72.json) | Initial seed failed before checks; a required language corpus provenance value was omitted. Owned resources closed |
| [342ca667](../../../output/trials/342ca667-33f0-4b23-a1f0-2bc575c0f0b2.json) | Diagnostic rerun retained PostgreSQL `23502`; explicit synthetic/reviewed corpus fields corrected the fixture |
| [685f2018](../../../output/trials/685f2018-b2de-445e-87bc-c11a69f75205.json) | Five checks passed; deletion assertion expected HTTP 200 instead of the API's HTTP 204. Assertion corrected |
| [84f8593d](../../../output/trials/84f8593d-87dc-4fd5-8a12-2682d5a450e5.json) | Initial local combined run passed 9/9; zero external calls |
| [48b2396b](../../../output/trials/48b2396b-33e7-4b73-a005-6a679aee5a80.json) | Local 9/9 passed; first hosted DeepInfra attempt fell back to reviewed text. No model success claimed |
| [e0ae8929](../../../output/trials/e0ae8929-faeb-4a42-b996-d5cf7d68c6d1.json) | One bounded diagnostic confirmed HTTP 429; no per-request cost reported |
| [528ef8e7](../../../output/trials/528ef8e7-7c73-4394-a62e-d2de030ee05b.json) | Local 9/9 passed; alternate Nebius endpoint failed availability preflight before any model request/ledger creation; live catalog status was -2 |
| [72892c51](../../../output/trials/72892c51-94fb-4d47-a352-ecf8d11ac41d.json) | Local 9/9 passed; pinned Parasail request returned HTTP 429 and reviewed fallback |
| [3be40a71](../../../output/trials/3be40a71-1084-483a-8a75-2c0964b1bafe.json) | Two bounded format probes: unmerged user turns HTTP 429; merged user turns HTTP 200, $0.00043171. This pair alone does not establish causation |
| [e607a35c](../../../output/trials/e607a35c-6ad1-43ab-8754-cdfee3924ca7.json) | Normalized final source: local 9/9; Parasail HTTP 200 for A1/A2/B1, HTTP 429 for B2. Three model answers, one reviewed fallback. Trial remains failed |
| [8e27186a](../../../output/trials/8e27186a-f371-451d-a7a3-16b1710a413e.json) | Full-suite local run on the same final source passed 9/9; zero external calls |
| [96bd7128](../../../output/trials/96bd7128-f7c4-4add-8de6-766516b18538.json) | Separate AI inspection/account check; quality hold and human review pending |

Initial source inspection hit two nonexistent guessed filenames and Windows glob syntax errors; corrected
reads made no model requests. A temporary retention fixture used an invalid name; it was changed to
the supported `keep` setting before successful runs. Local seed/assertion failures are preserved,
not replaced by the later success. Every harness invocation confirmed owned app/database/server cleanup.
One-off diagnostics opened no such resources. PowerShell's stderr wrapper printed `NativeCommandError`
around some successful pnpm commands; the recorded process exit codes determine their result.

## Hosted inputs, answers and account costs

Gemma 3 27B, FP8, pinned `parasail/fp8`; exact weight digest is not verified by the API alias.
The available endpoint quote was $0.08/$0.45 per million input/output tokens. Limits: 32 KiB input,
640 output tokens, one sequential member request at a time, no retry/tools/fallback. The provider must
match ZDR/data-collection/price preferences. A separate egress check rejects private/unapproved/foreign
canaries before dispatch. This is ordinary hosted processing, not verified TEE execution.

A1/A2 received community A's Tuesday 14:00–16:00/free facts; B1 received community B's Friday
09:00–11:00/KSh 50 facts. B2's HTTP 429 produced the correct approved B card locally. However, all
three generated answers used incorrect/conflicting Kiswahili clock/daypart wording. **Useful context
selection evidence, inadequate language-quality evidence.** Human review is pending, and these are
synthetic schedule probes, not heavy reasoning or a community-written benchmark.

Nine hosted HTTP requests in this pass: four successful responses (three pipeline, one diagnostic)
and five rejections. Known new charges **$0.00175896** matched the later account-usage increase:
$0.00132725 from the three pipeline model answers and $0.00043171 from the diagnostic. Combined with
the earlier session's $0.00247344, known charges are **$0.00423240**. Per-rejection costs remain
unknown individually; no final invoice was obtained.

All allowances are retained: earlier $1.46, DeepInfra attempt/diagnostic $0.01, first Parasail attempt
$0.005, format probes $0.01, final four-attempt plan $0.02 = **$1.505 request allowances**, plus the
same **$2 held aside**, within the original $10. Existing ledgers were not erased/reset or refunded.

## Evidence and validation

- [Final source local summary](../../../output/community-harness/8e27186a-f371-451d-a7a3-16b1710a413e/summary.json)
- [Partial hosted answers](../../../output/community-harness/e607a35c-6ad1-43ab-8754-cdfee3924ca7/hosted-answers.json)
- [Captured synthetic prompts](../../../output/community-harness/e607a35c-6ad1-43ab-8754-cdfee3924ca7/synthetic-traces.json)
- [Final hosted ledger](../../../output/community-harness/hosted-parasail-normalized-ledger.json)
- [AI inspection, all trial identities and account check](../../../output/community-harness/assessment.json)

Final source hash: `9159fdd647ac40a7e6fc2f06931dd8fc04005a13b594484d74074bb3303ac64f`, uncommitted
tree based on `965d4c3`. Full `pnpm test`, workspace `pnpm typecheck` and `pnpm build` passed. The
suite includes 94 PostgreSQL, 9 new combined harness, 14 showcase, 14 rental, 6 discovery, 5 artifact,
14 GPU-gate and 77 web unit cases, alongside the other API suites. No UI changed.

The hosted check is deliberately stricter than application availability: three model answers plus
one fallback is not four model completions. P4 remains open for stable serving capacity, a measured
rental bill and community evaluation; P5 Mesh and P8 TEE proof remain open. The normalized run's final
429 also demonstrates why the earlier format probe cannot explain every rate-limit failure.
