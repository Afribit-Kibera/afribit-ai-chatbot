# F-012 — Accounts by invitation only

**Status:** Draft · **Roadmap stage:** 1 · **Related:** [governance](../governance/governance.md), [threat model](../security/threat-model.md)

## Problem

Accounts exist for the people who teach and check the assistant: contributors (trainers), reviewers and
administrators. Members do not need an account to chat or to suggest wording ([F-003](F-003-say-it-your-way.md)).

But today `POST /api/v1/auth/register` is **open to anyone**. Every new account becomes a *contributor*, who
can submit phrases and vote. Contributors cannot approve anything; approval needs a reviewer. Even so:

- open sign-up invites fake accounts that game votes and flood the review queue;
- the threat model lists exactly this ("create fake accounts");
- the program wants accounts only for **authorized trainers**.

## What people see

- **On the sign-in page,** "Create an account" asks for an **invitation code**. Without a valid code there is
  no account.
- **Administrators,** in the console's Team section (and with an operator command), create invitations:
  - which role (contributor or reviewer, never administrator);
  - who it is for (a note);
  - when it expires (default 7 days);
  - single use.

  They can see which invitations were used, by whom and when, and can revoke unused ones.
- **Members** see no change: chat and "say it your way" stay open, without an account.

## How it works

- **A new setting, `REGISTRATION`:**
  - `invite` — the default: a valid code is required;
  - `closed` — no new accounts at all;
  - `open` — today's behaviour; for development only, and the server logs a warning if it is used outside
    development.
- **A new table, `invitations`:**
  - `id`;
  - `code_hash` (the code itself is shown once, when created, and never stored in plain text);
  - `role`, `note`, `created_by`, `expires_at`;
  - `used_by`, `used_at`, `revoked_at`.
- **Registration in `invite` mode** checks the code in one transaction: it exists, is unused, not expired and
  not revoked. It then creates the user **with the invitation's role** and marks the invitation used.
- **New endpoints, administrators only:**
  - `POST /api/v1/admin/invitations` (create; the response contains the code, once);
  - `GET /api/v1/admin/invitations` (list, never showing codes);
  - `POST /api/v1/admin/invitations/:id/revoke`.
- **Audit log:** creating, using and revoking invitations are recorded.
- **An operator command,** `pnpm --filter @afribit/api invite:create --role reviewer --note "…"`, prints a code,
  for nodes without the console.
- **Existing accounts keep working.** An administrator can downgrade or remove any account through the existing
  team tools.

## Data and privacy

Stores a hashed code, who created it and who used it. No personal data beyond what accounts already hold.

## Acceptance tests

1. In `invite` mode, registering without a code, or with an unknown, used, expired or revoked code, fails with
   the same generic error.
2. A valid reviewer invitation creates a reviewer, once. A second use fails.
3. Only administrators can create, list or revoke invitations. The list never contains codes. Codes are stored
   only as hashes.
4. `closed` refuses all registration. `open` behaves as today and logs a warning.
5. The web sign-up form asks for the code and shows a clear message for a bad one (Vitest).
6. Creating, using and revoking each write an audit-log entry.

## Not in this feature

- Email invitations (no email service exists yet). The administrator passes the code on themselves.
- Self-service password reset (separately on the roadmap).

## Decisions needed

1. **Default `invite` everywhere,** including the public demo. Recommended: yes.
2. **What to do about accounts created by open sign-up so far.** Recommended: an administrator reviews the
   list and downgrades or removes any they don't recognise. The team tools for this exist.

## Depends on

Nothing external. Build it with F-002, which already touches the account routes.
