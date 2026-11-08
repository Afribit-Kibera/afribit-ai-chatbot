# Features

Every feature on the [roadmap](../../ROADMAP.md) gets an ID and, before anyone builds it, a short
specification:

- what problem it solves;
- what people will see;
- how it works;
- what data it touches;
- how we will know it works;
- what it does not do.

Building starts only when the spec is **agreed**. A feature is **done** when its acceptance tests pass, the
docs it changes are updated, and the result is logged in [the Book](../book/README.md).

## The process

1. **Draft.** Someone writes the spec from the [template](#template). Decisions that belong to the
   maintainers or the community are listed under "Decisions needed".
2. **Agreed.** The maintainers accept the spec (and reviewers, where it changes what learners see or what
   data is kept). Its status changes here and on the roadmap.
3. **Building.** Code, tests and docs are written together.
4. **Done.** The acceptance tests pass (in `pnpm test`, run before every release); the [test and evaluation log](../book/test-and-evaluation-log.md)
   has an entry; the roadmap item is ticked.

## Register

| ID | Feature | Roadmap stage | Status | Spec |
|---|---|---|---|---|
| E-001 | Gemma 4 comparison and the GPU decision | 1 | **Done** 8 Oct 2026; GPU recommended; switch awaits the reviewers' blind comparison | [E-001](E-001-gemma4-and-gpu.md) |
| E-002 | Community benchmark: raw open model vs Afribit, scored blind | 1 | **Draft**; writers' plan for review ([guide](../evaluation/community-benchmark-writers-guide.md)) | [E-002](E-002-community-benchmark.md) |
| F-001 | Where the AI runs: an honest model-location label | 1 | **Live** 8 Oct 2026 (API release 20261008133325) | [F-001](F-001-model-location-label.md) |
| F-002 | Privacy settings: no storage, retention, deletion | 1 | **Live** 8 Oct 2026 (API release 20261008133325; migration 016) | [F-002](F-002-privacy-settings.md) |
| F-003 | "Say it your way": members suggest wording, reviewers decide | 2 | **Live** 8 Oct 2026 (API release 20261008133325; migration 017) | [F-003](F-003-say-it-your-way.md) |
| F-004 | Gap list: questions no card answered | 2 | **Built and tested** 8 Oct 2026 (migration 019); not yet released | [F-004](F-004-gap-list.md) |
| F-005 | Community console v1 | 2 | Planned (spec to write) | — |
| F-006 | Afribit GPU server and the box → GPU path (ADR 0016) | 2 | **Built and tested** 8 Oct 2026 (box, gate, tunnel, host checklist); goes live with the GPU in Kenya | [F-006](F-006-afribit-gpu-server.md) |
| F-007 | A chat channel where people already are (Telegram first), labelled honestly | 2 (experiment) | Planned (spec to write) | — |
| F-008 | "Ask anything" mode (ADR 0017) | 3 | Planned (spec to write) | — |
| F-009 | Language readiness kit | 3 | Planned (grows out of E-002) | — |
| F-010 | Shared Bitcoin core + community overlay packs | 3 | Planned (spec to write) | — |
| F-011 | Opt-in, inspectable account/pack memory with local-only defaults | Mesh proof P2 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 022 required | [F-011](F-011-personal-memory.md) |
| F-012 | Accounts by invitation only (authorized trainers) | 1 | **Live** 8 Oct 2026 (API release 20261008143525; migration 018) | [F-012](F-012-invitation-only-accounts.md) |
| F-013 | The public website tells today's story | 1 | **Built** 8 Oct 2026; waiting for the web deploy | [F-013](F-013-public-website-content.md) |
| F-014 | Account ownership and guest capabilities for conversations, linked feedback/suggestions and deletion | Mesh proof P1 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 020 required | [F-014](F-014-private-conversation-access.md) |
| F-015 | Learner accounts, scoped community invitations, revocable membership and shared-device workspace separation | Mesh proof P1 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 021 required | [F-015](F-015-community-membership-and-learner-accounts.md) |
| F-016 | Explicit memory snapshots, two-reviewer publication and withdrawal | Mesh proof P2 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 022 required | [F-016](F-016-memory-knowledge-promotion.md) |
| F-017 | Local-only policy before auxiliary calls, reviewed-card answers and outage handling | Mesh proof P3 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 023 required | [F-017](F-017-processing-policy-and-reviewed-answers.md) |
| F-018 | Per-community routes, dispatch allowances, bounded requests and cancellation | Mesh proof P3 | **Built and tested locally**, 26 Oct 2026; not deployed; migration 024 required | [F-018](F-018-community-compute-allowances.md) |
| F-019 | Synthetic model comparison, persistent experiment allowance and anonymous review files | Mesh proof P4 | **Built and exercised**, 27 Oct 2026; 16 rented transport completions, 4 context-limited outputs; quality held | [F-019](F-019-showcase-evaluation-runner.md) |
| F-020 | Durable trial records and scoped rental cleanup watchdog | Mesh proof P4 | **Built; live completion cleanup exercised**, 27 Oct 2026; deadline/host-loss limits remain | [F-020](F-020-trial-records-and-rental-watchdog.md) |
| F-021 | Reviewed model discovery and exact artifact metadata | Mesh proof P4 | **Built and tested locally**, 26 Oct 2026; public metadata only, no weights/inference | [F-021](F-021-model-discovery-and-artifact-provenance.md) |
| F-022 | Verified portable runtime and real synthetic CPU generation | Mesh proof P4 | **Built and exercised**, 27 Oct 2026; eight completions, model quality held; no deployment | [F-022](F-022-verified-local-inference-trial.md) |
| F-023 | Combined API retrieval, account memory and routing proof | Mesh proof P1–P4 | **Built**, 27 Oct 2026; 9/9 local checks, hosted 3 model answers + 1 fallback; quality held | [F-023](F-023-community-harness-proof.md) |
| F-024 | Bounded rental-host GPU telemetry and durable sampled metrics | Mesh proof P4 | **Built and exercised**, 27 Oct 2026; 12 fixtures, 76 real samples exported before finalization | [F-024](F-024-rented-gpu-telemetry.md) |
| F-025 | Explicit verified HTTPS compatibility for rental control | Mesh proof P4 | **Built**, 27 Oct 2026; 7 fixture checks, live access intermittent; fetch default unchanged | [F-025](F-025-runpod-https-compatibility.md) |
| F-026 | Frozen rental-model manifests and offline installed-store verification | Mesh proof P4 | **Built and exercised on rental**, 27 Oct 2026; 15 fixtures, exact 6.58 GB E4B verification | [F-026](F-026-rental-model-integrity.md) |
| F-027 | Authenticated rental worker, absolute lease and separate supervision | Mesh proof P4 | **Built**, 27 Oct 2026; 12 worker fixtures; live trials/failures retained | [F-027](F-027-authenticated-rental-worker.md) |
| F-028 | Context headroom before dispatch and incomplete-answer evaluation | Mesh proof P4 | **Built**, 28 Oct 2026; 19 localhost showcase checks; compact8192 is an offline candidate only | [F-028](F-028-showcase-context-headroom.md) |
| F-029 | Integrated normal API to rental-worker rehearsal and bounded live hook | Mesh proof P3-P4 | **Built and rehearsed**, 28 Oct 2026; current28 checks; bounded real follow-up in F-030 | [F-029](F-029-community-rental-rehearsal.md) |
| F-030 | Normal community API to real rented E4B model | Mesh proof P3-P4 | **Demonstrated**, 28 Oct 2026; 4 complete synthetic-member model answers, cleanup confirmed; human quality pending | [F-030](F-030-community-live-rental.md) |
| F-031 | Human-review handoff and actual socket recovery rehearsal | Mesh proof P4-P5 | **Built; review collection complete**, 28 Oct 2026; 28 integrated checks, 3 valid returns; quality held for refinement, physical AI test pending | [F-031](F-031-review-and-network-acceptance.md) |
| F-032 | Scoped language candidate and next-evaluation preparation | Mesh proof P4 | **Offline preparation built**, 28 Oct 2026; 13 checks, 8 development probes, 15 prompt previews; community approval/model comparison pending | [F-032](F-032-community-language-iteration.md) |
| F-033 | Running synthetic member node on existing Wi-Fi | Mesh proof P5 | **Built and browser/API verified**, 28 Oct 2026; 9 API checks, real sign-in/cards/notes flow; physical phone chat and uplink loss pending | [F-033](F-033-running-member-lan-node.md) |
| F-034 | Green education entry, onboarding and private source notebooks | Education pilot | **First slice built and tested locally**; Open Notebook lifecycle verified, inference fixture only; not deployed | [F-034](F-034-education-entry-and-private-notebooks.md) |

Specs are written just before their stage, so they use what the earlier stages taught us.

| F-035 | Community learning workspace and AI Studio | Education pilot | **Built and privately staged**; automated UI/ownership checks pass; public ingress, performance and participant acceptance pending | [F-035](F-035-community-learning-release.md) |

## Template

```markdown
# F-0XX — <name>

**Status:** Draft | Agreed | Building | Done · **Roadmap stage:** N · **Decision records:** ADR …

## Problem
## What people see
## How it works
## Data and privacy
## Acceptance tests
## Not in this feature
## Decisions needed
## Depends on
```
