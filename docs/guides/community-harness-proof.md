# Exercise community retrieval, account memory and remote routing together

**Acceptance follow-up:** [F-031](../evaluation/trials/2026-10-28-review-and-network-acceptance.md)
adds a28th integrated check with a real member HTTP listener and actual owned compute-socket loss/
restoration. Current runs export request timing and persisted message metadata before DB shutdown;
unknown fields remain null. This is fixture transport evidence; the physical LAN kit remains pending.

**28 October integration:** [F-029's runbook](community-rental-live-run.md) extends this harness with
`showcase:community-rental`: the nine original checks plus18 worker/native/live-hook checks, all
offline. The actual rental-worker gate is used, model replies/readiness simulated, and a real live
connector remains disabled by default. Current full tests cover both commands. The historical hosted
mode/ledger below remains separate; do not reset it to fund the new live subset.

F-023 continues P1–P4 through the normal HTTP chat routes. It creates an isolated in-memory PostgreSQL
database, applies current migrations, seeds two fictional member-only communities with two members each,
and closes the app/database/loopback servers afterwards. It does not connect to the configured application
database. All requests and canaries are synthetic; the bundled public pack supplies baseline prompts.

```powershell
pnpm --filter @afribit/api test:community-harness
```

This is also part of `pnpm test`. It uses real authentication, membership, ownership, lexical SQL
retrieval, prompt construction, provider transports, output handling and persistence. The local and
simulated remote inference endpoints are loopback fixtures, not language models. Embeddings and
auxiliary model calls are disabled. No model download or external request occurs in the default run.

Nine checks cover:

1. Four concurrent members retrieve only their community's approved card/language hints and their own
   account notes. Another pack's note for the same user remains excluded.
2. Parallel continuations use only their own stored history.
3. Known foreign conversation IDs cannot read, append or stream; no inference is triggered.
4. Membership checks stop unauthorized requests before knowledge retrieval or inference.
5. Reviewed-only answering uses actual retrieval with zero inference calls.
6. Local-only endpoint failure returns approved text, with no remote escalation.
7. Deleted private notes disappear from later prompts.
8. Configured remote requests omit local-only and other owners' notes.
9. An existing local-only conversation cannot be downgraded by a later configured request.

Personal memory is still untrusted, final-answer-only user context. It now shares the final user message
with the question, preserving the role sequence expected by stricter model chat templates. It is not
promoted to a system instruction or added to stored chat history. The loopback fixture rejects adjacent
user turns so this integration case is exercised by the standing checks.

## Bounded hosted subset

```powershell
pnpm --filter @afribit/api showcase:community --hosted
```

This mode first runs the nine local checks, then attempts four synthetic member requests through the
same API and the pinned `google/gemma-3-27b-it` / `parasail/fp8` endpoint. A live quote must show the
endpoint available at no more than $0.08/$0.45 per million input/output tokens. It requests ZDR,
`data_collection: deny`, required parameters, explicit price ceilings, no upstream/model fallback and
at most 640 output tokens / 32 KiB input. A second check rejects private/unapproved or foreign-owner
canaries and unexpected destinations before hosted dispatch. Only the owner's explicitly remote-
permitted synthetic note is eligible.

The permanent `output/community-harness/hosted-parasail-normalized-ledger.json` reserves $0.005 before
each of at most four attempts and retains $1.485 of earlier allowances plus $2 held aside. Four
attempts have already consumed that attempt allowance; the last failed with HTTP 429. **Re-running
does not create four more paid attempts. Do not delete/reset ledgers to force another run.** A different
frozen experiment needs separate explicit cumulative accounting. The current cumulative request
allowance is $1.505, plus the unchanged $2 held aside within the original $10 authorization.

The model-generation check fails when the application returns a reviewed fallback; it never labels a
fallback a model completion. No automatic retry or privacy downgrade occurs. Application allowances
and observed provider usage are not a provider-enforced key cap or a final invoice.

Each invocation retains a UUID trial under `output/trials` and synthetic artifacts under
`output/community-harness/<UUID>`: per-check outcomes, prompts sent to fixtures/hosted compute,
usage, ledgers and any partial hosted answers. Trial events record source identity, HTTP status and
resource cleanup. On failure, inspect partial artifacts; `summary.json` is produced only on success.
Raw credential headers are never saved. Preserve these local artifacts with the report.

## Current result and limits

[The actual report](../evaluation/trials/2026-10-27-community-harness.md) records **9/9 local checks**
on final source and **three real hosted model answers plus one rate-limited reviewed fallback**.
Native-speaker review is pending; generated time-of-day wording was incorrect/conflicting. The hosted
trial remains failed/partial, and no model was promoted.

This exercises lexical search in PGlite, with vector column types substituted. It does not benchmark
pgvector/embeddings, arbitrary private documents/team ACLs, a running local LLM, an external rented
serving stack, Mesh connectivity, GPU capacity or TEE confidentiality. These synthetic schedule probes
also do not represent heavy reasoning or a real community's workload distribution.
