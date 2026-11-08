-- Community-owned learning releases are immutable snapshots; personal state never becomes shared content.
CREATE TABLE studio_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('path','language','source')),
  mode TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','changes','published')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tested_revision INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX studio_drafts_pack ON studio_drafts(pack_id,updated_at DESC);
CREATE TABLE studio_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES studio_drafts(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  actor UUID REFERENCES users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  baseline TEXT NOT NULL,
  candidate TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE learning_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES studio_drafts(id) ON DELETE RESTRICT,
  pack_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('path','language','source')),
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  body JSONB NOT NULL,
  revision INTEGER NOT NULL,
  author UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  UNIQUE(draft_id,revision)
);
CREATE INDEX learning_releases_pack ON learning_releases(pack_id,kind,published_at DESC);
CREATE TABLE learning_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  release_id UUID NOT NULL REFERENCES learning_releases(id) ON DELETE RESTRICT,
  step_index INTEGER NOT NULL DEFAULT 0 CHECK (step_index >= 0),
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,pack_id,release_id)
);
CREATE TABLE learning_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX learning_notes_owner ON learning_notes(user_id,pack_id,created_at DESC);
