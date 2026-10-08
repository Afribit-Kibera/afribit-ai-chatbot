# Documentation

Afribit AI is a community-owned Bitcoin education assistant. These documents explain the program, how it is built and run, how it is governed, and how we measure it. The code is documented in the repository's [README](../README.md), [ARCHITECTURE](../ARCHITECTURE.md) and [CONTRIBUTING](../CONTRIBUTING.md).

| If you want to know… | Read |
|---|---|
| What the program is, and what exists today | [Program overview](program/overview.md) |
| The idea: a community's own AI from an open engine and a pack | [Concept](concept/README.md) · [Developer gateway (draft)](concept/developer-gateway.md) |
| The two ways to have it: self-hosted (free) or Afribit Local (a community box with Afribit's GPU in Kenya) | [Concept](concept/README.md#two-ways-to-have-it) · [ADR 0016](adr/0016-afribit-local-community-box.md) · [Community node](program/community-node.md#without-a-gpu-afribit-local-a-box-plus-afribits-gpu) |
| How the assistant learns, and the "Learn" and "Ask anything" modes | [ADR 0015](adr/0015-how-the-assistant-learns.md) · [ADR 0017](adr/0017-ask-anything-mode.md) |
| How to give the engine your own language, voice and knowledge | [Community pack guide](guides/community-pack-guide.md) |
| How to run it under your own name, colour and logo, with a "Powered by Afribit AI" line | [White-label guide](guides/white-label-guide.md) · [Branding policy](BRANDING.md) |
| How reviewers check what the assistant may say | [Reviewer guide](guides/reviewer-guide.md) |
| How to change how the assistant talks, and try answers straight away | [Voice Lab guide](guides/voice-guide.md) |
| How to watch the pilot live, work the queue of reported answers, make learner links, and quote numbers honestly | [Pilot console guide](guides/pilot-console-guide.md) |
| How a community node works, and how to run one | [Community node specification](program/community-node.md) · [deployment kit](../deploy/community-node/README.md) |
| How we will test it with real people | [Pilot plan](program/pilot-plan.md) · [Assisted sessions: reaching people without a phone, and measuring change](program/assisted-sessions.md) |
| Who decides what | [Governance](governance/governance.md) |
| What happens to people's data | [Data stewardship](governance/data-stewardship.md) |
| What can go wrong, and what we do about it | [Threat model](security/threat-model.md) |
| How good it is, honestly | [Evaluation](evaluation/methodology.md) |
| Why it is built this way | [Architecture decisions](adr/README.md) |
| What it depends on, how it is tested, and how to check a claim yourself | [The Afribit AI Book](book/README.md): [dependency register](book/dependency-register.md) · [test and evaluation log](book/test-and-evaluation-log.md) |
| Where it is going | [Roadmap](../ROADMAP.md) |
| What each roadmap feature will do, before it is built | [Feature specs](features/README.md) |

## How to read the status labels

Throughout these documents we separate **built** (code exists), **tested** (we measured it), **planned** and **open research**. If a document describes something as planned, it is not a claim that it works.
