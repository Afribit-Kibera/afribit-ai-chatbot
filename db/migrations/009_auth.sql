-- Real authentication (2026-09-24 production-readiness push). Previously
-- there was no auth anywhere: every endpoint, including admin knowledge
-- CRUD, was open to anyone who could reach the API (see README's "No
-- authentication anywhere" gap and docs/SECURITY_AUDIT_2026-09-23.md's
-- Vuln 2, where PUT /api/v1/notifications/subscription trusted a
-- client-supplied x-afribit-user-id header with zero verification).
--
-- Deliberately does NOT touch the anonymous chat flow: chatting with
-- Afribit AI still needs no account (PRD §43 Q1, matches the existing
-- `external_auth_id ... -- null for anonymous sessions` comment on
-- `users`). This adds real credentials only for the two things that
-- actually need identity: admin actions (knowledge management) and
-- Microtasks contribution (submitting/reviewing/voting on language
-- examples) -- see db/migrations/010_microtasks.sql.

ALTER TABLE users
  ADD COLUMN email TEXT UNIQUE,
  ADD COLUMN password_hash TEXT,
  ADD COLUMN display_name TEXT,
  ADD COLUMN role TEXT NOT NULL DEFAULT 'contributor'
    CHECK (role IN ('contributor', 'admin')),
  ADD COLUMN created_via TEXT NOT NULL DEFAULT 'anonymous'
    CHECK (created_via IN ('anonymous', 'registered'));

COMMENT ON COLUMN users.role IS
  'contributor: can submit/review/vote on Microtasks. admin: can also manage knowledge_entries. No public self-service path to admin -- see apps/api/src/db/promoteToAdmin.ts, an operator-run CLI script, matching this repo''s existing script-based admin-operations convention (seedCommunityManuals.ts, promoteCommunityManuals.ts).';
COMMENT ON COLUMN users.created_via IS
  'anonymous: pre-existing row from an anonymous chat session, no credentials. registered: created through POST /api/v1/auth/register. email/password_hash are NULL for anonymous rows.';
