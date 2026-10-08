# Pilot Plan

The pilot exists to turn assumptions into measurements. We publish the results whether or not they flatter us.

> Targets below are **proposals**. They are agreed with the community's language and safety reviewers before the pilot starts, and recorded in the pilot's pre-registration note so we cannot move them afterwards.

## What we are testing

| # | Hypothesis | If it fails |
|---|---|---|
| H1 | A community node running an open model **on modest hardware** can answer Bitcoin questions in Sheng, Kiswahili and English well enough, and safely enough, for beginners. | Find a smaller/better model, fine-tune, or constrain the model's role (retrieval and showing approved text) |
| H2 | The node can serve the **number of people** who actually use it at acceptable speed. | Compact prompt, prefix caching, bigger hardware, a request queue |
| H3 | Learners **understand more and fall for fewer scams** after using it. | Change the teaching content and flow, not the claims |
| H4 | A community can **operate and fund** a node (power, uptime, upkeep) without us. | Simplify operations; redesign funding |
| H5 | Over a **local network with no internet uplink**, the experience still works. | Fix naming/HTTPS/captive portal; reconsider the mesh role |

## Design

1. **Phase A — bench (weeks 1–2):** one node at a community hub. Run the standing evaluation (15+ cases, community-reviewer judged as well as the automatic rubric) against candidate models; select the smallest that passes. Measure speed and concurrency with synthetic load.
2. **Phase B — supervised pilot (weeks 3–8):** 20–50 learners recruited by Afribit educators, using the node over local Wi-Fi, with an educator present for the first sessions. Collect the metrics below with consent. The pilot runs in **Learn mode only**; the "Ask anything" mode ([ADR 0017](../adr/0017-ask-anything-mode.md)) stays off so learning results come from reviewed answers. The model may run on a GPU at the hub or, if the hub has none yet, on Afribit's GPU server in Kenya ([ADR 0016](../adr/0016-afribit-local-community-box.md)); the report states which, because the privacy result differs.
3. **Phase C — offline (after the mesh hardware is available):** repeat key measurements with no internet uplink.
4. **Report (public):** a results note covering every metric, including failures, plus the raw evaluation cases and the decisions made as a result.

## Metrics

| Area | Metric | How measured | Proposed target |
|---|---|---|---|
| Quality | Share of evaluation cases passing the rubric, overall and for Sheng | Rubric judge **and** blind scoring by community reviewers | At or above the hosted baseline measured the same week |
| Safety | Unsafe-content flags on scam/secret cases | Automatic + reviewer check. The [pilot console](../guides/pilot-console-guide.md) shows answers withheld by the output check and secrets caught, live | **Zero** |
| Accuracy | Factual errors per 100 answers | Bitcoin reviewers, sampled | Set after the first sample |
| Speed | Time to first word, p50 and p95, at stated concurrency | Server timings. The console shows whole-answer time p50/p95 (first word is not recorded) | p50 ≤ 15 s, p95 ≤ 45 s |
| Capacity | Concurrent users served within the speed target | Load test + real use | Cover the observed peak with headroom |
| Availability | Uptime during opening hours; power-outage recovery time | Health checks | Set with the steward |
| Cost | Electricity + upkeep per 1,000 questions, plus amortised hardware | Meters, receipts. The console supplies hosted-model cost per 1,000 answers (not electricity or hardware) | Reported, no target |
| Adoption | Weekly active devices; questions per learner | Aggregate counts only. The console supplies conversations, questions and conversations with 2+ questions, per day and per channel link (`?ref=`). Anonymous chat has no unique people, so these are conversations, not devices or learners | Reported |
| Learning | Short comprehension check and scam-recognition quiz before and after | Educators administer | Positive change, reported with sample size |
| Trust | Short survey: "I trust the answers", "I would use it again" | Anonymous | Reported |
| Community | Reviewers active; corrections raised and resolved | The console's answer queue (raised, resolved, waiting; each resolution logged), plus the review log | Reported |
| Teaching | "Say it your way" suggestions raised, approved and rejected; questions no card answered (the gap list); **reviewer hours spent** | Teach-mode queue and gap list, once built ([ADR 0015](../adr/0015-how-the-assistant-learns.md)) | Reported. Reviewer hours set what the community can sustain |

## Consent, ethics, data

- Participation is voluntary and explained in plain language, in the participant's chosen language.
- **Minimal data.** Aggregate usage counts by default. Individual conversations are not retained for the pilot's analysis unless a participant opts in for a specific purpose, and are never used for training without the separate consent described in [data stewardship](../governance/data-stewardship.md).
- Participants can withdraw at any time; their data is deleted.
- No participant is asked to enter a real seed phrase, key or PIN, ever.
- We seek legal advice on Kenya's data-protection obligations before the pilot starts (see [data stewardship](../governance/data-stewardship.md)).

## Risks

| Risk | Mitigation |
|---|---|
| The model is not good enough in Sheng on modest hardware | Constrain its role; fine-tune; keep the hosted model as an *opt-in* hybrid fallback for comparison only |
| Hardware failure or theft | Stewardship plan, spares, backups of the database; do not store more than needed |
| A bad answer reaches a learner | Safety floor, output check, reviewer sampling, an easy "report a bad answer" button, an educator present early on |
| Small sample, not generalisable | State the limits plainly; the aim is learning and a repeatable method, not proof of impact |
