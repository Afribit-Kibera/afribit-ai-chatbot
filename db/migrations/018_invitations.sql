-- Accounts by invitation only (docs/features/F-012-invitation-only-accounts.md).
--
-- Accounts are for the people who teach and check the assistant (contributors and reviewers). An
-- administrator creates a single-use invitation for a role; the code is shown once and only its hash is
-- kept. Members need no account to chat or to suggest wording.
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('contributor', 'reviewer')),
  note TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL: created with the operator command
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_created ON invitations (created_at DESC);
