# F-019 — Reproducible synthetic showcase evaluation

**Status:** Built and tested locally; no paid evaluation · **Roadmap:** Mesh proof P4 · **Date:** 26 October 2026.
Implementation continues the user's authorized proof roadmap. No rental or paid invocation is part of
this slice. Existing E-002 still needs community-written questions and independent human reviewers.

**27 October follow-up:** the [authenticated rental trial](../evaluation/trials/2026-10-27-rented-model-worker.md)
now exercised this runner with 16 real GPU transport completions. Four answers ended early at the
4096-token context limit. This does not approve the model or replace E-002. Earlier no-paid-work
wording describes the original implementation slice; use the dated report for the current result.

The operator needs a reproducible comparison before spending on training. A new CLI defaults to dry-run:
freeze a synthetic benchmark, pack and at most two candidate model configurations; compare a fair bare
instruction with the product prompt plus supplied context at the same temperature/output ceiling. Use
existing gateway/provider transports with scoped, fallback-free profiles and compute policy. Supplied
passages isolate generation quality; this is not a measurement of retrieval selection or personal memory.

An exclusive experiment ledger persists reservations before dispatch across restarts and invocations.
It binds the budget and non-model charge allowance to the plan/benchmark/pack fingerprint. It never
refunds failures, cancellation or missing usage reports. Attempts and elapsed execution are bounded.
Duplicate processes fail closed, crashes leave a lock for operator investigation, and cost overruns stop
later calls. No provider credentials, private notes or application database content enter the ledger.

The maximum first-experiment envelope is USD 10, with at least USD 2 held aside and separately declared
non-model charges. This is an application allowance, not an upstream invoice guarantee. Execution with
remote routes requires operator-recorded upstream-limit evidence and configured authentication. No
RunPod creation/shutdown/watchdog or provider account modification is included; a rented GPU still needs
an independently verified shutdown mechanism before use. Dry-run never contacts models or the database.

Save revision/dirty status, configuration and input hashes, per-attempt status, first-token/full times,
usage and reported costs. Keep anonymous, randomly ordered review sheets separate from operator model/
variant mappings. Human scores remain empty; no automatic judge, training, p95 claim or quality winner.

Acceptance: persistent caps and immutable fingerprints; crash lock and concurrent-process rejection;
same settings for paired variants; scoped profiles cannot affect normal traffic; API compute enforcement
cannot be replaced by CLI scope; malformed/oversized fixtures and unapproved routes fail before dispatch;
real localhost streaming, missing cost, overrun, timeout, interruption and cancellation; blind files omit
candidate identity; default CLI dry-run works without external model or database access.

See the [operator guide](../guides/showcase-evaluation.md) for execution gates and artifact limits.
