# F-012 — Accounts by invitation only

**Status:** Live since 8 Oct 2026 (API release 20261008143525) · **Roadmap stage:** 1 · **Related:** [governance](../governance/governance.md), [threat model](../security/threat-model.md)

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

## Decisions (agreed 8 Oct 2026)

1. **Default `invite` everywhere,** including the public service. Agreed.
2. **Accounts created by open sign-up so far:** an administrator reviews the list in the console's Team tab and
   downgrades or removes any they don't recognise. Agreed. On 8 Oct 2026 the public service had one
   administrator and one contributor.

## Depends on

Nothing external.

## As built

| Part | Where |
|---|---|
| Table `invitations` | `db/migrations/018_invitations.sql` |
| Codes, the setting, input checks | `apps/api/src/auth/invitations.ts` |
| Storage (one transaction per sign-up, `SELECT … FOR UPDATE`) | `apps/api/src/auth/invitationStore.ts` |
| Sign-up | `apps/api/src/routes/auth.ts` |
| Administrator endpoints | `apps/api/src/routes/invitations.ts` |
| Operator command | `apps/api/src/auth/inviteCli.ts` (`invite:create`) |
| Console | Team tab → **Invitations** (`apps/api/public/pilot/app.js`) |
| Web form | `apps/web/src/components/ContributorScreen.tsx`, `apps/web/src/lib/auth.ts` |
| Node kit | `REGISTRATION` in `deploy/community-node/`; `first-run.sh` prints how to make the first administrator |

Details worth knowing:

- **Codes** look like `AFB-7K4M-Q9TX`: 8 characters from 31 that cannot be confused when read aloud (no 0/O,
  1/I/L), about 2^39.6 possibilities. Case, spaces and dashes do not matter. Only a SHA-256 hash is stored.
- **One answer for every refusal.** A missing, unknown, used, expired or revoked code, and an email that already
  has an account, all get HTTP 409 with the same message. The password is hashed before any check, so the time
  taken does not tell them apart either. An email that is taken does not use up the code.
- **Sign-up is rate-limited** to 10 tries per 15 minutes per address.
- **Administrators are never made by invitation.** Invite as a reviewer, then change the role in the Team list.
  On a new node, `first-run.sh` prints the three steps for the first administrator.
- **Admin checks** use the token **and** the database's current role, as the other admin routes do.
- **The smoke test** now checks that sign-up without a code is refused; `--auth --invite <code>` tests a real
  sign-up.

Tests: `test:invitations` (13 checks, no database), `test:db` (5 more checks against real PostgreSQL), and
`apps/web/src/lib/auth.test.ts` (4). See the [test log](../book/test-and-evaluation-log.md).
