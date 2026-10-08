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
4. **Done.** The acceptance tests pass in CI; the [test and evaluation log](../book/test-and-evaluation-log.md)
   has an entry; the roadmap item is ticked.

## Register

| ID | Feature | Roadmap stage | Status | Spec |
|---|---|---|---|---|
| E-001 | Gemma 4 comparison and the GPU decision | 1 | **Done** 8 Oct 2026; GPU recommended; switch awaits the reviewers' blind comparison | [E-001](E-001-gemma4-and-gpu.md) |
| E-002 | Community benchmark: raw open model vs Afribit, scored blind | 1 | **Draft**; writers' plan for review ([guide](../evaluation/community-benchmark-writers-guide.md)) | [E-002](E-002-community-benchmark.md) |
| F-001 | Where the AI runs: an honest model-location label | 1 | **Live** 8 Oct 2026 (API release 20261008134137) | [F-001](F-001-model-location-label.md) |
| F-002 | Privacy settings: no storage, retention, deletion | 1 | **Live** 8 Oct 2026 (API release 20261008134137; migration 016) | [F-002](F-002-privacy-settings.md) |
| F-003 | "Say it your way": members suggest wording, reviewers decide | 2 | **Live** 8 Oct 2026 (API release 20261008134137; migration 017) | [F-003](F-003-say-it-your-way.md) |
| F-004 | Gap list: questions no card answered | 2 | Planned (spec to write) | — |
| F-005 | Community console v1 | 2 | Planned (spec to write) | — |
| F-006 | Afribit GPU server and the box → GPU path (ADR 0016) | 2 | **Built and tested** 8 Oct 2026 (box, gate, tunnel, host checklist); goes live with the GPU in Kenya | [F-006](F-006-afribit-gpu-server.md) |
| F-007 | A chat channel where people already are (Telegram first), labelled honestly | 2 (experiment) | Planned (spec to write) | — |
| F-008 | "Ask anything" mode (ADR 0017) | 3 | Planned (spec to write) | — |
| F-009 | Language readiness kit | 3 | Planned (grows out of E-002) | — |
| F-010 | Shared Bitcoin core + community overlay packs | 3 | Planned (spec to write) | — |
| F-011 | Opt-in learner memory | Later | Planned | — |
| F-012 | Accounts by invitation only (authorized trainers) | 1 | **Live** 8 Oct 2026 (API release 20261008143525; migration 018) | [F-012](F-012-invitation-only-accounts.md) |
| F-013 | The public website tells today's story | 1 | **Built** 8 Oct 2026; waiting for the web deploy | [F-013](F-013-public-website-content.md) |

Specs are written just before their stage, so they use what the earlier stages taught us.

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
