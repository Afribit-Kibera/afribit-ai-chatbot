-- One server can serve several community packs (ADR 0014). Every table that holds something a
-- pack's community owns learns which pack it belongs to. NULL always means "the server's default
-- pack", so every row written before this migration keeps its meaning and a single-pack
-- deployment needs no data change.

-- A conversation stays with the pack it started in (a later message that names another pack is refused).
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pack_id TEXT;

-- Usage and cost can be reported per pack (usage:report --pack).
ALTER TABLE model_runs ADD COLUMN IF NOT EXISTS pack_id TEXT;
CREATE INDEX IF NOT EXISTS idx_model_runs_pack ON model_runs (pack_id, created_at DESC);

-- Reviewed community vocabulary and microtask submissions belong to one community's language.
ALTER TABLE language_entries ADD COLUMN IF NOT EXISTS pack_id TEXT;

-- A learner's language and level are per pack: "sheng" means nothing in a library guide. The
-- existing user_preferences rows stay as they are and are the default pack's.
CREATE TABLE IF NOT EXISTS user_pack_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  language_mode TEXT NOT NULL,
  explanation_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (explanation_level IN ('simple', 'normal', 'deep')),
  learning_consent BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pack_id)
);
