# F-011 — Opt-in, inspectable personal memory

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P2 · **Date:** 26 October 2026.

Members can explicitly save, inspect, edit and delete short notes for their own assistant. Memory is off
by default and never extracted from chat automatically. Enabling it is separate from chat retention,
training consent and sharing with a community. Guests have no persistent account memory.

## Contract

Migration 022 adds per-account/per-pack settings and notes. Limit: 20 notes, 500 characters each. Every
lookup and mutation includes verified account and community scope. Administrators and reviewers have no
private-memory read override. Notes default to local-only. A member may explicitly allow one note in remote
answers; that permission does not authorize training, sharing, publishing or host-confidential claims.

Local-only notes are used only in node mode with a configured on-machine/container model endpoint. Each
model attempt checks that policy, including fallbacks, and local requests cannot follow HTTP redirects.
This trusts the local application/OS/model operator; it is not hardware attestation or proof that an
operator cannot proxy elsewhere. Hybrid/cloud/remote node deployments omit local-only notes. Notes never
enter query-rewriting, retrieval embeddings, the chef or the gap labeller. They enter only the final
answer prompt as labelled, untrusted user context, never as system policy or approved community facts.

Disabling memory stops future memory lookups and preserves notes for inspection. Deleting all notes also
disables memory. Deletion covers the live memory store; backups follow their retention policy. Existing
chats, running requests and explicitly shared copies need separate handling and cannot be recalled.
Conversations that have used a local-only note remain restricted to local inference, even after memory
is disabled or deleted, because their history could quote it. Start a new conversation for remote answers.
Account deletion cascades private notes/settings. CHAT_RETENTION=none does not silently disable explicitly
saved memory: the UI explains that distinction before the member opts in.

## API and user experience

- `GET /api/v1/me/memory`: own settings/notes and whether local-only context is available.
- `PATCH /api/v1/me/memory`: enable/disable, requiring an explicit boolean.
- `POST /api/v1/me/memory/items`: save a note after enabling memory; `allowRemote` defaults false.
- `PATCH /api/v1/me/memory/items/:id`: edit text/remote permission with the current version.
- `DELETE /api/v1/me/memory/items/:id` and `DELETE /api/v1/me/memory`: owner-scoped erasure.

The learner account panel links to a memory panel. It keeps note text in component memory, clears on
identity changes and rejects late results from another account. No private memory text is put in browser
localStorage. Known secrets are refused before persistence. Concurrent edits fail with 409 rather than
silently overwrite a newer version. Unknown/foreign IDs are indistinguishable 404s.

Account safety flags or a thumbs-down must not expose stored personal answers in the reviewer console.
For account reports, only text explicitly attached by the member may be shown. Aggregate metrics remain.

## Acceptance

Prove defaults/consent, owner/pack isolation, CRUD/version conflicts, count/length limits, secret rejection,
disable/delete behavior and account deletion against PostgreSQL. Test actual final chat prompts for A/B
context separation, remote omission/permission, primary/fallback rejection and redirect rejection, without
external models. Verify full/compact/restaurant/stream paths keep context in the final answering stage.
Browser checks cover editing/remote permission/delete and an identity switch while requests are pending.

Approved community sharing is [F-016](F-016-memory-knowledge-promotion.md), a separate consent and review flow.
No model training, automatic memory extraction, private-document/team ACLs or TEE deployment is included.

See the [operator guide](../guides/personal-memory.md) for migration 022, the required backup/erasure
replay drill and remaining deployment gates. Memory controls await community translation review and
currently use English in all three locales.
