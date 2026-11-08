# First completed human-review return - 28 October 2026

**Later collection update:** [three-return findings](2026-10-28-three-reviewer-findings.md) now
validate KS/GT alongside ES. The one-return/two-pending counts below are the original snapshot.
Collection is complete; quality acceptance remains open.

**One of three planned review forms received and validated; overall language acceptance pending.**
Edmund supplied `D:\Downloads\review-es.json` for checking. It matches Reviewer01 pack
`6633eca19d`, single-answer mode, with all four expected case IDs and valid complete ratings.
The original was preserved unchanged, copied byte-for-byte to private operator artifacts and hashed.
Reviewer pseudonym is ES; audience fit, identity independence and export device were not verified.

| Trial | Actual result |
|---|---|
| [b645fe46](../../../output/trials/b645fe46-4d78-446a-9a19-2d15a4f11859.json) | Completed intake: pack/mode, exact four cases, answer letters, rating ranges/enums/booleans, selection, notes and timestamps validated; existing scorer completed with the matching private key; original source hash unchanged |

[Structured result and hashes](../../../output/human-review-returns/b645fe46-4d78-446a-9a19-2d15a4f11859/summary.json),
[unaltered return copy](../../../output/human-review-returns/b645fe46-4d78-446a-9a19-2d15a4f11859/original-review.json),
[scorer output](../../../output/human-review-returns/b645fe46-4d78-446a-9a19-2d15a4f11859/scoring-report.md),
[current collection snapshot](../../../output/human-review-returns/b645fe46-4d78-446a-9a19-2d15a4f11859/collection-status.json).
Keep reviewer returns private; this submission permits the requested evaluation, not publication of
the raw return, language-corpus inclusion or model training.

## Observed ratings

Question numbers follow this review copy's order. Acceptable means the single answer was selected
as suitable as written; this is not a head-to-head model preference.

| Question | Naturalness /5 | Correctness | Risk flagged | Acceptable as written |
|---|---|---|---|---|
| 1 | 4 | Mostly | No | Yes |
| 2 | 3 | Mostly | No | No |
| 3 | 3 | Mostly | No | Yes |
| 4 | 4 | Mostly | No | No |

Average naturalness **3.5/5**; fully correct0/4, mostly correct4/4, incorrect0/4;
acceptable as written2/4; needs revision or rejection2/4; risky flags0/4.
Zero flags means this reviewer flagged none on these four synthetic answers; it is not a safety
certification. Q2/Q3 have no explanatory notes, so the reason behind their "mostly" ratings remains
unspecified. Correctness ratings are reviewer judgments, not an independent factual audit.

The export reports20:28:21.175-20:37:29.742 Nairobi, elapsed548.567seconds (9min8.567seconds).
These are form timestamps, not verified active reviewing time or device-clock accuracy.

## Language feedback and implications

Q1 notes prefer **inavyo → ina**, **kwenye → kwa**, and **jinsi → vile**. Q4 notes prefer
**inacosta → inacost**. These are recorded as submitted, including spelling. The original Q4 answer
spells the word `inakosta`; do not silently normalize either the feedback or the evaluated output.
These choices suggest the reviewer wants more conversational code-switching for this audience.
They do not establish universal Sheng rules or preferences for every community.

The two Wednesday-community source answers are identical but received different naturalness scores
(4 and3). Retain both individual ratings. This small return cannot separate reviewer variability,
question-order effects or language preferences, or establish reliable model superiority.

Next: obtain the two other planned independent returns with their own keys. Encourage short reasons
for "mostly correct" and rejected answers so factual gaps and language preferences can be separated.
Once community reviewers approve a style preference, it can become scoped language guidance or
reviewed context. No fine-tuning is required to test that approach, and no runtime/prompt changes
or new inference were made here. If future prompts use this feedback, these four probes become
development examples; evaluation on fresh held-out questions is still needed before claiming improvement.

This intake establishes a complete matching review-file return after confirmed phone page access.
It does not independently identify which device exported the file, complete AI-chat/uplink-loss
testing, satisfy the planned three-reviewer gate, or establish Mesh/TEE confidentiality. The older
zero-return artifacts remain historical snapshots. No new package, paid compute or external message;
no app code changed. The existing scorer was exercised on this actual file; no full-suite rerun was
needed for the operator-only intake/documentation. Helper source/hash is retained with the result.
