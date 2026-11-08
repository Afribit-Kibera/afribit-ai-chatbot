# F-020 — Trial records and a scoped rental watchdog

**Status:** Built and tested locally; no account calls · **Roadmap:** Mesh proof P4 · **Date:** 26 October 2026.
The user requires every trial to be documented, including failed attempts. This slice extends the
authorized proof roadmap with automatic trial records and locally tested rental cleanup controls.

**27 October follow-up:** [F-027's four real model-session watchdogs](../evaluation/trials/2026-10-27-rented-model-worker.md)
terminated their disposable Pods and confirmed absence on completion/failure, without attention flags.
The rental suite now passes 17 cases, including fresh-scope recovery after a late monitoring failure.
Separate local processes were exercised; whole-host loss/deadline and arbitrary provider failures
remain unqualified. Model-session invoices remain pending. Earlier no-account wording describes the
original fixture-only slice.

Every showcase preview/execution and new rental-tool invocation creates a durable record before
validation or network work. Record purpose, commands, source/input fingerprints, phases, timestamps,
outcome, artifact links, cost status and limits. Raw secrets, prompts and provider error bodies stay out
of these records. A crash leaves a started record, never a fabricated success. Existing historical
results retain their original evidence; do not invent missing per-trial details retroactively.

A separate CLI defaults to preview. It can later watch only an explicitly named disposable RunPod Pod
using a fixed lease ID, creation timestamp, exact name and absolute deadline. Plan changes/restarts
cannot reset its lease clock. Require a quoted hourly ceiling, declared non-compute allowance, shutdown
grace and explicit disposable-data declaration. Reject foreign/mismatched/locked/cluster resources and
network/global mounts. Never create resources, restart pods, or delete independent storage.

Use current RunPod REST v2. Poll with bounded requests; stop on deadline, projected allowance, price
increase, completion marker or cancellation. Re-check ownership before termination, then verify absence;
an accepted DELETE, stopped status, auth error or first unverified 404 is not proof of cleanup or billing.
Persist state and retain uncertain locks for investigation. The watchdog is process-local: power loss,
control-plane failure or an operator bypass still needs independent supervision/upstream controls.

No actual pod/account call, paid inference, quote or rental is part of this implementation trial.
Acceptance uses localhost HTTP fixtures and fake time: documentation on success/failure; locked immutable
lease; exact ownership/storage checks; deadline across restarts/backward clocks; rate/timeout/error
handling; cancellation/completion; accepted-but-unconfirmed deletion; verified cleanup; secret-free
records. Real provider conformance, invoice reconciliation and deployment remain separate gates.
