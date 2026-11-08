# Review the four real rental answers

**Next physical test:** [running member-node instructions](running-member-lan-node.md) now provide
the real app/API on Wi-Fi port4189, temporary synthetic accounts and local approved answers. The
review pages on4188 remain a separate completed review workflow. Phone chat confirmation is pending.

Prepared 28 October 2026. **All three planned review forms returned and validated: ES, KS and GT.**
Combined12 ratings of4 answers: naturalness3.67/5,1 fully correct/11 mostly correct,
5/12 acceptable as written and no risky flags. [Final collection findings](../evaluation/trials/2026-10-28-three-reviewer-findings.md)
retain exact-source aggregation, shared feedback and limits. Review collection is complete;
language/usefulness refinement and overall quality acceptance remain open.

**Next iteration prepared:** [scoped language/task guidance](community-language-iteration.md) now
has an isolated draft candidate,8 synthetic development probes and13 passing offline checks.
No model rerun or improvement result yet; community wording/protocol approval and fresh held-out
questions remain separate gates. The original reviewed outputs and returns stay unchanged.

## Open on the current Wi-Fi

**Temporary server started 28 October 2026. Expires at 22:19 Nairobi that evening.** Keep this
computer awake and connected to Wi-Fi. Internet can stay enabled. These links are local to this
network; they are not public internet links. The computer's IP may change after reconnecting.

- [Reviewer 01](http://192.168.100.192:4188/reviewer-01/review.html)
- [Reviewer 02](http://192.168.100.192:4188/reviewer-02/review.html)
- [Reviewer 03](http://192.168.100.192:4188/reviewer-03/review.html)

**iPhone access confirmed by Edmund:** "Yes, the review page loads." This is a user-observed
phone-to-computer page-load result on the shared internet-enabled Wi-Fi, recorded in
[the observation trial](../../output/trials/18c1087a-7208-4105-8341-fd5270bcb781.json).
Computer-side checks retrieved all three exact pages. No firewall rule or router forwarding changed.
A complete matching JSON has since been returned and validated. Its precise export device was
not independently confirmed.
The host exposes only these three fixed fictional review pages, with no uploads or scoring keys.
It automatically closes after two hours. This is review delivery, not the running AI/chat API.

For reviewers outside this Wi-Fi, download the
[share pack](../../output/review-deliverables/c1045af5-2329-4ee9-9d40-b5fec47c8055/Afribit-human-review-share-pack.zip).
It contains three clearly named standalone HTML files and instructions, no operator keys. Unzip it
and give **one different HTML file to each reviewer** through your chosen channel. Internet elsewhere
does not make the local links accessible. Phone attachment support varies; public hosting is not set
up by this deliverable. No messages/files have been sent on your behalf.

Copy this invitation when assigning a reviewer:

```text
Please independently review four Afribit AI answers using the fictional reference facts shown.
Open your assigned page, enter initials or a pseudonym, and rate all four answers for naturalness,
correctness and safety. Do not coordinate ratings with other reviewers. At the end, tap
"Save my answers" and return the downloaded review-<name>.json file to me.
No wallet secrets or real learner information, please. We will agree review time/compensation first.
Your feedback is for this evaluation; publication or training would need separate permission.
```

The deliverable to collect is **three original completed JSON reviews**, one per assigned person,
followed by a checked summary of factual errors, language feedback and disagreements. The HTML page
itself is not the completed review. All three original returns are now validated and the
[findings deliverable](../evaluation/trials/2026-10-28-three-reviewer-findings.md) is written.

## Review scope and collection

The [live run](../evaluation/trials/2026-10-28-community-live-rental.md) produced four complete answers
using fictional community context. Technical completion does not establish correctness, natural Sheng
or usefulness. This is single-answer review, not a comparison between models or the E-002 benchmark.

| Copy | Reviewer file | Assigned | Returned |
|---|---|---|---|
| 01 | [review.html](../../output/human-review/6f90f6bd-735e-4fa6-a39d-e81d89dcec8b/reviewers/reviewer-01/review.html) | ES return received; assignment details unrecorded | Validated, 28 Oct; [report](../evaluation/trials/2026-10-28-first-human-review.md) |
| 02 | [review.html](../../output/human-review/6f90f6bd-735e-4fa6-a39d-e81d89dcec8b/reviewers/reviewer-02/review.html) | KS return received; assignment details unrecorded | Validated, 28 Oct; [findings](../evaluation/trials/2026-10-28-three-reviewer-findings.md) |
| 03 | [review.html](../../output/human-review/6f90f6bd-735e-4fa6-a39d-e81d89dcec8b/reviewers/reviewer-03/review.html) | GT return received; assignment details unrecorded | Validated, 28 Oct; [findings](../evaluation/trials/2026-10-28-three-reviewer-findings.md) |

Choose three independent speakers familiar with the intended community's Sheng; record their audience
fit and agree review time/compensation before distribution. That cost is not included in the rental
budget. Share only each assigned HTML file. Keep the sibling `operator` directory, source mapping and
scoring keys private. Copies have shuffled question order and distinct pack identifiers; do not send
the whole output folder. The answer wording is unchanged and reference facts are explicitly fictional.

Tell reviewers: use the reference day/time/price, rate naturalness and correctness, flag risk, and
decide whether each answer is acceptable as written. Assess whether the requested two-visit plan is
usable and whether the closing question helps. Work independently; do not show one another ratings.
No score or suggested correction is prefilled. If unsure, explain that in the notes. Do not enter
personal financial information, wallet secrets or real learner conversations.

The page is self-contained and saves progress in that browser. It asks for a name or initials;
a pseudonym is fine. Area and age group are optional. Save the returned JSON privately. These names
and notes are evaluation information; agreeing to review is not consent to publish them or train on
them. Corpus/training reuse needs a separate explicit agreement under the data-stewardship policy.

Opening HTML attachments directly varies by phone/browser. Test opening on the actual phone before
the review. The verified alternative is serving the **single reviewer directory** on an owned local
network and opening its page, then disconnecting external connectivity after load. Do not serve the
repository or the `operator` directory. Desktop mobile-sized rendering/export has passed; actual
phone/file-attachment compatibility remains pending. No server is needed after the page is loaded.

After collecting each JSON, verify its pack ID against that copy's key and score each pair separately:

```powershell
node tools/blind-review/score.mjs output/human-review/6f90f6bd-735e-4fa6-a39d-e81d89dcec8b/operator/reviewer-01-key.json path/to/returned-review-01.json
```

Repeat with keys 02 and 03. A different copy's key must be refused. Record returns and refusals in
the [assignment template](../examples/live-review-assignment.template.json); retain original exports
and report reviewer disagreements and uncorrected factual errors. Any combined summary needs explicit
operator alignment using the private mapping; the CLI does not merge differently shuffled packs.
Do not interpret three people as a representative Sheng benchmark or a model-ranking result.

The browser verification used the name `AUTOMATED-FIXTURE-NOT-HUMAN` and arbitrary form-test ratings.
Its JSON remains only in the browser trial directory; the scoring script refuses that marker. It is
never a reviewer return, an AI quality judgment or evidence of community acceptance.
