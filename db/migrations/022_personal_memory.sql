ALTER TABLE chat_sessions ADD COLUMN personal_local_context BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE knowledge_entries ADD COLUMN community_pack_id TEXT;
CREATE TABLE personal_memory_settings (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_id)
);
CREATE TABLE personal_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  allow_remote BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_personal_memory_owner ON personal_memory_items (user_id,pack_id,updated_at DESC);
CREATE TABLE community_knowledge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pack_id TEXT NOT NULL,
  memory_id UUID REFERENCES personal_memory_items(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  first_approval_by UUID REFERENCES users(id) ON DELETE SET NULL,
  knowledge_id TEXT REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX idx_community_knowledge_submissions_scope ON community_knowledge_submissions (pack_id,status,created_at);
