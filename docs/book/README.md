# The Afribit AI Book

One place to answer five questions about Afribit AI, with evidence:

1. **What is it?**
2. **How is it built, and why this way?**
3. **What does it depend on?** Software, models, data, services.
4. **How do we know it works?** Tests and evaluations, and when they were run.
5. **Can I check a claim myself?**

The Book doesn't repeat the other documents. It indexes them and adds the records nobody else keeps: the
dependency register and the test and evaluation log. Started 8 October 2026.

## Chapters

| # | Chapter | Where |
|---|---|---|
| 1 | What it is, for non-technical readers | [Concept](../concept/README.md) · [Program overview](../program/overview.md) |
| 2 | How it is built | [ARCHITECTURE.md](../../ARCHITECTURE.md) · [Community node](../program/community-node.md) · [Community packs](../guides/community-pack-guide.md) |
| 3 | Why it is built this way (decisions) | [Architecture decision records](../adr/README.md) |
| 4 | What it depends on | [Dependency register](dependency-register.md) |
| 5 | How we test and evaluate it | [Evidence summary](evidence.md) (for proposals) · [Test and evaluation log](test-and-evaluation-log.md) · [Evaluation method and results](../evaluation/methodology.md) |
| 6 | What happens to people's data | [Data stewardship](../governance/data-stewardship.md) · [Privacy notice (draft)](../governance/privacy-notice-draft.md) |
| 7 | Who decides | [Governance](../governance/governance.md) |
| 8 | What can go wrong | [Threat model](../security/threat-model.md) · [SECURITY.md](../../SECURITY.md) |
| 9 | How to run and operate it | [Node kit](../../deploy/community-node/README.md) · [guides](../guides/) |
| 10 | Where it is going | [ROADMAP.md](../../ROADMAP.md) |
| 11 | What changed, when | `git log` (each change is one commit with its reasons) and the logs in this Book |

## How to audit a claim

1. **Find the claim's evidence.** Every number in a public document should name its source: a log entry in
   this Book, a results file, or a test suite.
2. **Check the code it was measured on.** Each log entry records a commit. If the entry says "uncommitted
   working tree", the result cannot be reproduced from history, so treat it as weaker evidence.
3. **Re-run it.**
   - Standing tests need nothing but the repo: `pnpm install && pnpm test`.
   - Live evaluations need a model endpoint and cost money; their commands are in the
     [evaluation method](../evaluation/methodology.md#reproducing).
4. **Compare.** Results from live models vary between runs, so look at the direction and the individual judge
   notes, not only the totals. A difference of one or two cases out of 15 is noise.
5. **Report what you find.** Open an issue, or use the [security policy](../../SECURITY.md) for anything
   sensitive.

## Status words

These follow the convention in [docs/README.md](../README.md):

- **Built**: the code exists.
- **Tested**: we measured it.
- **Planned**: not built yet.
- **Research**: an open question.

A claim may only use the strongest word its evidence supports.

## Keeping the Book true: what to update, when

A change isn't done until its records are updated in the same change. Reviewers should check this table
when approving a pull request.

| When you… | Update |
|---|---|
| add, remove or upgrade a package | [Dependency register](dependency-register.md): regenerate the licence summary; note any new licence type |
| change a model, a model profile, or an embedding model | Dependency register (models table) **and** run the communication eval and the retrieval benchmark, then log the results |
| add or change a hosted service, container image or platform version | Dependency register (platforms and services) |
| import or remove a dataset | Dependency register (data), the dataset register, and `NOTICE` if attribution is needed |
| run a live evaluation, benchmark, blind review or load test | [Test and evaluation log](test-and-evaluation-log.md): a new entry from the template |
| add or remove a test suite, or change what it checks | Test and evaluation log (standing suites table) |
| prepare a release or deploy | A test-and-evaluation-log entry: `pnpm test` result and commit, plus any live checks |
| make a significant design decision | A new [ADR](../adr/README.md). Don't silently edit an accepted one |
| change how data is stored, kept, shared or deleted | [Data stewardship](../governance/data-stewardship.md) and the threat model |
| change what users see or are told | The matching guide and the privacy notice |
| meet a roadmap exit test | Log the evidence here, then tick it in [ROADMAP.md](../../ROADMAP.md) |

## Where tests actually run

**GitHub Actions is not running for this repository**: the GitHub billing is not accepted. The workflow in
`.github/workflows/ci.yml` stays correct for when it runs again. Until then:

- **The release script is the gate.** It runs `pnpm typecheck`, `pnpm test` (every suite, including the
  real-database check) and the build, and refuses to ship if any of them fail.
- **Run `pnpm test` before every commit** that changes code.
- **Each release is logged** in the [test and evaluation log](test-and-evaluation-log.md) with its commit.

## Known gaps in this Book (8 October 2026)

- Raw logs from earlier runs are kept in the maintainers' working files, not in the public repository. New
  entries should store results under a path that will be published, or name where they can be requested.
- The current work is on a branch with many uncommitted changes. Until it is committed, today's baseline
  can't be tied to a single commit.
- Model versions are recorded by name, not by digest (see the dependency register).
