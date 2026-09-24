# Authentication, Microtasks, Rate Limiting, and CI/CD — 2026-09-24

Closes the three biggest items from the README's former "Not yet ready"
gap list (no auth, no rate limiting, no CI/no tests beyond the prompt
suite) and builds the first real version of the Microtasks pipeline
ADR 0005 describes. Delegated the rate-limiting piece to a sub-agent;
built auth, Microtasks, and CI/CD directly.

## Authentication

**Deliberately does not touch anonymous chat.** Chatting with Afribit AI
still needs no account (PRD §43 Q1) — auth exists only for the two things
that actually need identity: admin knowledge management, and Microtasks
contribution.

- `db/migrations/009_auth.sql` adds `email`, `password_hash`,
  `display_name`, `role` (`contributor` default / `admin`), and
  `created_via` (`anonymous` / `registered`) to the existing `users` table.
- JWT-based (`@fastify/jwt`), password hashing via `bcryptjs` (pure JS, no
  native build toolchain needed — matters for the actual VPS deploy
  target and for contributors without one set up locally).
- `apps/api/src/auth/plugin.ts` provides three preHandlers used across
  routes: `requireAuth` (any signed-in user), `requireAdmin` (role check),
  `optionalAuth` (verifies a token if present, never rejects if absent —
  used where a route must stay usable anonymously but should prefer a
  real identity when available).
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
  `GET /api/v1/auth/me`.
- **No public path to admin, anywhere.** `apps/api/src/db/promoteToAdmin.ts`
  is an operator-run CLI (`pnpm --filter @afribit/api db:promote:admin <email>`),
  matching this repo's existing convention for admin-only DB operations
  (`seedCommunityManuals.ts`, `promoteCommunityManuals.ts`).
- `routes/knowledge.ts`'s three admin endpoints now require `requireAdmin`
  — this was the exact unauthenticated scaffold PRD §36 flagged as unsafe
  to run anywhere but localhost. The publish endpoint's `reviewedBy` field
  is no longer a client-supplied string (anyone could claim to be any
  reviewer); it's the verified JWT user id.
- **Vuln 2 from `docs/SECURITY_AUDIT_2026-09-23.md` is now actually fixed,
  not just warned about.** `PUT /api/v1/notifications/subscription` uses
  `optionalAuth` and prefers `request.user.id` from a verified JWT over
  the old unverified `x-afribit-user-id` header, falling back to that
  header's best-effort linking only for callers with no account at all.

Verified with real HTTP requests against a running server (not just
typecheck): register → login → `/me` → admin route denied as contributor
(403) → denied with no token (401) → promoted via CLI → fresh login shows
`role: admin` → admin route now succeeds. Full transcript-style trace is
in this session's history; not duplicated here.

## Microtasks (ADR 0005's human-feedback pipeline, first real version)

The DB schema (`language_entries`, `language_reviews`, `language_votes`)
has existed since `001_init.sql`, but nothing had ever read or written it
over HTTP — every row so far came from internal seed scripts. This is the
first real contribution surface.

- `POST /api/v1/microtasks/language-entries` — submit a phrase (`utterance`,
  optional `meaning`/`intent`, required `style`). Lands as
  `status='draft'`, `corpus_layer='L2_community_collected'`,
  `source_type='afribit_microtask'`, every `allowed_for_*` flag `false` —
  conservative-by-default, matching `docs/LANGUAGE_CORPUS.md`'s rule.
- `GET /api/v1/microtasks/queue` — other contributors' unreviewed
  submissions (excludes your own).
- `GET /api/v1/microtasks/mine` — your own submission history.
- `POST /api/v1/microtasks/language-entries/:id/review` — record a
  decision (`approve`/`reject`/`needs_changes`) + notes. **Self-review is
  blocked (403)** — the same "no one certifies their own output" rule
  ADR 0005 states for AI applies to a human reviewing their own
  submission.
- `POST /api/v1/microtasks/language-entries/:id/vote` — naturalness
  1-5.
- **Promotion to a usable status is deliberately NOT built here.** A
  review being recorded does not flip `status`/`allowed_for_rag` —
  matching `knowledge_entries`' own existing submit-then-separately-publish
  pattern. Building a responsible promotion flow (needs a real review
  queue/consensus rule, not a bare endpoint) is a follow-up, not a
  same-day addition.

Verified with real HTTP requests: two real registered users, one submits,
the other sees it in their queue, self-review correctly blocked, review
and vote both recorded with the real reviewer/voter's UUID (not a
free-text field anyone could fill with anything), confirmed directly in
the database afterward, then cleaned up.

**Minimal web UI added** (`apps/web/src/components/SettingsScreen.tsx`,
new `lib/auth.ts` and `lib/microtasks.ts`): a "Contributor account"
section — sign in/register, then a short "Contribute a phrase" form once
signed in. Typechecked and built cleanly; **not visually verified in an
actual browser** in this pass (no browser-automation tool available) —
the backend it calls was verified directly instead. Worth a manual click-through
before calling this UI done.

## Rate limiting (delegated)

`@fastify/rate-limit`: 100 req/min/IP global default, 15 req/min/IP on the
three chat endpoints specifically (the only ones calling the paid
OpenRouter model). 15/min was a deliberate choice, not a copy-pasted
SaaS default — this product is meant to be usable from a shared
classroom/kiosk device or one community wifi hotspot, so an aggressive
per-IP limit could break legitimate concurrent use. `trustProxy: true`
added to the Fastify instance, since `infra/LUNANODE.md`'s deploy puts a
reverse proxy in front of this process — without it, per-IP limiting
would silently collapse onto the proxy's single IP for everyone. See the
dated comments in `server.ts` and `routes/chat.ts` for the sub-agent's
full reasoning.

## CI/CD

`.github/workflows/ci.yml`, two jobs, on every push/PR:
- **typecheck-test-build**: `pnpm typecheck`, `pnpm test` (the
  prompt-construction golden-case suite — no DB/API key needed),
  `pnpm build`.
- **migrations**: spins up the exact `pgvector/pgvector:pg16` image
  `infra/docker-compose.yml` uses locally as a service container, runs
  `pnpm db:migrate` against a genuinely fresh database. Verified locally
  before committing to it in CI (see this session's history) — all 9
  migrations apply cleanly in order.

Deliberately does NOT run the live-model eval scripts
(`dataset:communication-eval`, etc.) in CI — those cost real money and
need a real `OPENROUTER_API_KEY`; they stay a manual/local check per
`docs/COMMUNICATION_STYLE_EVAL.md`.

## What's still not done

- Admin console (a web UI for knowledge management) — the API is now
  properly auth-gated, but there's no frontend for it yet.
- Microtasks promotion flow (draft → approved) — see above.
- Microtasks web UI is submission-only for now; no review/vote UI yet
  (those endpoints exist and work, just not wired into `apps/web`).
- No password reset / email verification flow (no email-sending
  infrastructure exists in this project yet).
- Rate limiting's in-memory store is single-process only; a
  multi-instance deployment would need the plugin's Redis-store option
  (Redis is already a project dependency).
- The new Settings UI was not visually verified in a real browser.
