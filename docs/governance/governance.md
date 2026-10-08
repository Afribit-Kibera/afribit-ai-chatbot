# Governance

How decisions are made, who can approve what, and how a community takes part. **Status: proposed.** This is the structure we intend to operate; it is ratified with the community's language and safety reviewers before the pilot begins, and changes go through the same process.

## Principles

- **The community owns its language and its questions.** Reviewers, not maintainers, decide what the AI is allowed to teach in their language.
- **No one approves their own work** — not a contributor, not a model, not a maintainer.
- **Decisions and money are visible.** Decisions are recorded (ADRs for technical choices, a decision log for program choices); node funding and costs are published.
- **Safety beats speed.** A change that could hand a learner an unsafe answer waits.

## Roles

| Role | Does | Cannot |
|---|---|---|
| **Maintainers** | Code, releases, infrastructure, security fixes | Approve language or knowledge content on their own |
| **Language reviewers** (Sheng, Kiswahili, English) | Approve or reject wording; maintain the style guide; own corrections | Approve Bitcoin facts or code |
| **Bitcoin/safety reviewers** | Check factual accuracy and the safety floor; sign off scam-related content | Approve wording on their own |
| **Node stewards** | Run a node: power, uptime, updates, access; first contact for their community | Change knowledge or language content |
| **Contributors** | Submit phrases and corrections; review others' work | Review their own submissions |
| **Members** | Ask; report answers; suggest how to say things ("say it your way"); opt in or out of learner memory | Change what others hear without a reviewer |
| **Afribit Local operators** | Run Afribit's GPU servers and the box software for communities that choose Afribit Local | Read a community's data; access is only with the community's written approval, time-limited and logged |

One person may hold several roles, but never both author and approver for the same change.

## How content gets approved

1. A contribution enters as a **draft**: not retrievable, not used.
2. It needs approval from **at least two** reviewers of the right type (language, and Bitcoin/safety where facts or advice are involved). *(Quorum rule proposed; today's tooling records reviews and votes but does not yet enforce a quorum or perform the promotion — that is on the roadmap.)*
3. Approved content is published as a **new reviewed version**, never a silent edit, and the version is recorded.
4. Any reviewer can **withdraw** content they believe is wrong or unsafe; withdrawal is immediate and discussed afterwards.

## Decisions

- **Technical:** an ADR in `docs/adr/`, open for comment before it is accepted.
- **Program** (scope, partners, funding, a new node): maintainers propose; the reviewers and the host community's steward must agree. Disagreements are recorded with reasons.
- **Safety:** any reviewer or maintainer can stop a release.
- **Model releases** ([ADR 0015](../adr/0015-how-the-assistant-learns.md)): a new model or adapter for a community ships only after it passes that community's test set and safety suite and its reviewers vote to accept it. Any reviewer can roll it back.
- **"Ask anything" mode** ([ADR 0017](../adr/0017-ask-anything-mode.md)): a community switches it on or off only when its steward and its reviewers agree; the change is recorded.

## Nodes

- A node belongs to its community, not to Afribit. Afribit provides the software, guidance and, where funded, hardware.
- A community may instead use **Afribit Local** ([ADR 0016](../adr/0016-afribit-local-community-box.md)): its data stays on its own box and Afribit's GPU server in Kenya answers the questions without storing them, for a monthly fee under a data processing agreement. The community can leave at any time and keep everything on its box.
- Each node has a named steward and publishes: what it costs to run, how it is funded, and which mode it runs in (`node`, `node` with Afribit's GPU, or `hybrid`).
- Nodes may use the Afribit name and logo only while they follow the program's privacy and safety rules; the marks are not licensed under the open-source licences.

## Money

- Grants and donations that fund nodes are published (amount, source, purpose) at least quarterly.
- Reviewer and contributor rewards, when introduced, are paid transparently and never contingent on approving content.
- No token, no custody of users' funds, no selling of data.

## Conflicts and conduct

Everyone follows the [Code of Conduct](../../CODE_OF_CONDUCT.md). Conflicts of interest (for example a reviewer with a commercial tie to a Bitcoin service named in content) are declared and that reviewer steps aside for the item.

## Changing this document

By pull request, with agreement from the reviewers and maintainers. Material changes are announced to node stewards.
