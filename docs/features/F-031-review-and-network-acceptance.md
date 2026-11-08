# F-031 - Human-review handoff and member-network recovery acceptance

**Status:** Preparation built and verified; human/physical acceptance pending. **Date:** 28 October 2026. **Roadmap:** Mesh proof P4-P5.

Later follow-up: phone page access confirmed by Edmund and
[all three planned human-review returns validated](../evaluation/trials/2026-10-28-three-reviewer-findings.md).
Collection is complete:12 ratings, naturalness3.67/5,5/12 accepted as written. Baseline language/
usefulness refinement and physical AI/chat/uplink-loss observations remain open; no overall quality pass.

F-030 demonstrated four complete synthetic normal-API answers on a real rental. Humans have not
reviewed their correctness/Sheng/usefulness, and a physical member-device/LAN uplink-loss test has
not run. Prepare those next gates without more paid inference or pretending automated tests are people.

Extend the existing self-contained blind-review builder with optional synthetic reference facts and
single-answer review wording. Keep old paired comparison behavior. Produce three separately shuffled
reviewer copies of the four unchanged live answers, with blank scores, model/source mappings kept
separate. Include exact approved fictional facts and neutral review criteria. No generated corrections,
new model outputs, fabricated reviewer scores, source comparison or E-002 claim. Do not send to others.

Extend the integrated rehearsal with a real loopback member HTTP listener and actual owned remote-gate
socket shutdown/restart. While that link is down, reviewed-only/local-only answers must still work;
an allowed generation returns an explicit reviewed fallback. Reconnection should restore model
transport in the same conversation with scoped history and no duplicate user/assistant turns.
All model responses remain fixtures, and loopback socket loss is not physical Wi-Fi/backhaul evidence.

Export per-API-request elapsed time and persisted message latency/token/retrieval/source metadata
before closing the temporary database, correcting F-030's missing future measurement evidence.
Do not retroactively fill missing values in F-030. Keep all credentials out of exports. Record
request counts, failure/recovery observations and owned-resource cleanup with UUID trials.

Supply a physical test script/checklist and unfilled evidence template: member mobile data disabled,
local API reachable, hub internet/backhaul removed while local LAN stays on, local reviewed answers,
remote unavailable labeling, reconnect/recovery and scope checks. No firewall/network setting change,
real user record, deployment, model download, rental or assertion that the actual Mesh passed.

Acceptance: offline review pack builds with exact source answers/facts and no scores; legacy builder
still works; browser verifies offline page/render/form/export; deterministic builder tests cover
HTML injection/metadata separation. Integrated socket-loss/recovery and metadata exports pass with
all owned resources closed. Human reviews and physical-network observations remain explicitly pending.

Delivered: [review handoff](../guides/live-answer-human-review.md),
[deferred physical kit](../guides/member-lan-acceptance.md) and
[all trials, failures and limits](../evaluation/trials/2026-10-28-review-and-network-acceptance.md).
Integrated28/28, review-tool6/6, full tests/typecheck/build pass. Future metadata exports preserve
unknown values, including the existing streaming row's null measurements. No quality scores or
physical-network evidence have been invented.
