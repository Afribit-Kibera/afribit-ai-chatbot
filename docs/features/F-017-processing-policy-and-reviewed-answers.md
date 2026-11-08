# F-017 — Processing policy before inference and reviewed-card answers

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P3 · **Date:** 26 October 2026.

A member can strengthen a conversation to `processingPolicy: "local-only"`. That choice and existing
local-memory restrictions are applied before query rewriting, embeddings, generation and background gap
labelling. It persists for subsequent turns. `configured` cannot downgrade an existing restriction.
Endpoint configuration and the local host remain trusted; this is application policy, not attestation.

`answerMode: "reviewed-only"` answers with an approved card or a clear no-card message, without any model
or embedding request. It also keeps the question local, including in later history. A new conversation
is required to return to remote processing. Defaults retain the deployment's existing behavior.

The backend captures prior history in the same database statement that reads/strengthens policy, before
inserting the new question. An earlier concurrent request cannot later load a newly local-only turn into
its remote prompt. The request policy uses AsyncLocalStorage to isolate simultaneous requests and follow
background work. Gateway/provider and embedding boundaries enforce it independently. Redirects on local
embedding requests are rejected too. A remote endpoint labelled `local` is insufficient permission.

For local-only generation, use the on-machine node profile without cloud fallback. A remote or failed
node, busy GPU or exhausted quota produces a reviewed-card fallback or the service-unavailable message;
no privacy downgrade is allowed. Reviewed-only answers are labelled separately from AI output and
outage fallback. Metadata communicates effective policy and answer source, including after reload.
Migration 023 stores answer-source metadata; the existing conversation privacy flag now also covers
explicit local-only and reviewed-only questions. New controls and the no-card message use English
pending community translation review. Direct card text retains its approved wording without translation.

Acceptance uses synthetic requests and real PostgreSQL policy/history queries, with transport traps for
remote calls: explicit and inherited restrictions, malformed requests, cloud/hybrid/remote-node settings,
embeddings, background work, redirects, concurrency, outages/429, direct and streaming paths, approved
card/no-card answers, secret detection and honest UI labels. No paid compute is required.

This slice does not implement document/team ACLs, attestation, provider/region allowlists, spending
budgets, semantic confidence-based routing or a real offline Mesh test. P3 remains in progress until
its remaining gates are met. A browser without internet still needs connectivity to its community box.
