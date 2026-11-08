-- Old ownerless conversations intentionally remain inaccessible: knowing an ID cannot claim them.
ALTER TABLE chat_sessions
  ADD COLUMN guest_access_hash TEXT CHECK (guest_access_hash ~ '^[0-9a-f]{64}$'),
  ADD COLUMN guest_access_expires_at TIMESTAMPTZ;

ALTER TABLE chat_sessions ADD CONSTRAINT chat_session_guest_access
  CHECK ((guest_access_hash IS NULL AND guest_access_expires_at IS NULL)
      OR (user_id IS NULL AND guest_access_hash IS NOT NULL AND guest_access_expires_at IS NOT NULL));
