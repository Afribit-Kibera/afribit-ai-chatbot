-- Afribit owns account/community authorization; Open Notebook is a private source engine.
CREATE TABLE study_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  upstream_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX study_notebooks_owner ON study_notebooks(user_id, pack_id);
ALTER TABLE chat_sessions ADD COLUMN study_notebook_id UUID REFERENCES study_notebooks(id) ON DELETE SET NULL;
