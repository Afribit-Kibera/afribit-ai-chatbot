# F-014 — Private conversation access

**Status:** Built and tested locally; not deployed · **Roadmap:** Mesh proof P1 · **Date:** 26 October 2026.
Implementation authorized in the planning session; this specification records that scope.

## Problem

Conversation IDs currently authorize continuation, reads and deletion. Feedback and suggestions can name
another member's messages. Preferences trust an unverified external-user header. These boundaries must be
fixed before personal memory is introduced.

## What people see

Guest chat remains available without registration. The browser keeps a separate secret capability for each
new guest conversation. Knowing or entering its ID alone does not recover it. Signed-in API callers can
access only their own account conversations; administrators receive no override. The current learner web
interface remains guest/device based, separate from contributor sign-in; an account-private learner UI and
shared-device account switching belong to the personal-memory milestone.

## How it works

New guest conversations receive a random 256-bit token, returned with the JSON response or stream metadata.
Only its SHA-256 hash is stored, with a 30-day absolute expiry. Clients send it in `x-chat-token`; bulk
deletion carries a per-session token map in the request body. Deleting a conversation revokes its token.
Account conversations require the verified account ID. A guest token never claims an account conversation
or silently attaches an existing guest conversation to a signed-in account.

Authorize before revealing the conversation's pack or opening a stream. Repeat authorization inside the
chat service before loading history or writing messages. An explicit wrong pack is refused. Without an
explicit pack, an authorized chat continuation can retain its original pack, preserving existing behavior.
Legacy NULL pack IDs mean the default pack, not every pack.

A deletion response deliberately does not reveal whether a row existed or was accessible. Lost/expired
guest credentials cannot authorize deletion; retention still applies, and an operator-managed erasure
procedure is needed for such records. Do not equate a 204 response with proof of physical data erasure.

Unknown, malformed, inaccessible, expired and legacy ownerless sessions return the same 404. Unknown
supplied session IDs no longer silently create new conversations. Bulk/single deletion remains a
non-enumerating 204 and only affects authorized rows. Existing ownerless sessions cannot be claimed by ID;
their local browser copies remain, but new server conversations need new capabilities. Deploy the migration
and API/client together. Do not downgrade to ID-only access to accommodate old clients.

## Permission and negative-test matrix

| Resource/action | Account conversation | Guest conversation | Wrong owner/token/pack |
|---|---|---|---|
| Read, continue, stream | Verified owner | Unexpired matching capability | 404 before content/model work |
| Feedback or linked suggestion | Same owner check on linked message/session | Same capability | 404; no insert |
| Delete one/bulk | Owner-filtered SQL | Capability-filtered SQL | 204; no mutation |
| Preferences | Verified account only, current public pack scope | Not an account operation | 401 without valid account auth |

An explicit pack selector is a namespace boundary, not private-community membership. Current public packs
remain public. Membership-gated enrollment, private-document ACLs, private memory and restricted teams
are separate features; this change must not be represented as a complete private tenancy system.

## Acceptance tests

- Account A cannot read, append, stream, report, link suggestions to, or delete B's known valid IDs.
- A correct guest capability works; an ID alone, wrong/expired capability, another session's capability,
  or a capability supplied against an account conversation fails. Legacy ownerless rows fail closed.
- Authorized implicit-pack continuation works; explicit cross-pack access and NULL-pack leakage fail.
- Mixed bulk deletion changes only authorized sessions and their shared suggestion text.
- Preferences ignore spoofed external/user IDs and use verified auth. Rejected chat calls make no model
  calls, including streaming and no-retention mode.
- Browser requests retain capabilities across reload, send them on follow-ups/read/feedback/suggestions,
  and remove them after successful deletion. Tokens are absent from URLs and server request logs.
- PostgreSQL tests apply migration 020 and exercise the actual authorization/deletion SQL and API routes.

## Data and privacy

Capability theft grants access to that guest conversation until expiry/deletion; use TLS and protect the
browser. Browser-local guest history is shared by people using the same browser profile. No raw capability
is stored server-side or sent to the model. Application authorization does not protect against host/root
administrators. No new retention of conversation text, remote provider, or paid model call is introduced.

## Depends on / outside this feature

Reuses F-002, F-003, multi-pack routing and existing account JWTs. No model download, rental, training,
personal-memory store, community enrollment, 4-of-7 administration or TEE deployment is included.
