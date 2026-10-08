-- The gap list (docs/features/F-004-gap-list.md): what people ask that no card answers.
--
-- Topics, not questions. A gap event keeps the topic, the DAY (not the time), the language mode, the nearest
-- card and a rounded confidence. It has no column for question text and no link to a conversation, message,
-- user or address. Reviewers see a topic only once it has 5 or more questions.
CREATE TABLE IF NOT EXISTS gap_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 2 AND 60),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'card_written', 'out_of_scope')),
  card_id TEXT REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  note TEXT CHECK (note IS NULL OR length(note) <= 500),
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One topic per label per community, whatever the case or spacing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gap_topics_label ON gap_topics (pack_id, lower(label));

CREATE TABLE IF NOT EXISTS gap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  topic_id UUID REFERENCES gap_topics(id) ON DELETE SET NULL, -- NULL: unlabelled
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  language_mode TEXT,
  nearest_card TEXT REFERENCES knowledge_entries(id) ON DELETE SET NULL,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);
CREATE INDEX IF NOT EXISTS idx_gap_events_pack_day ON gap_events (pack_id, day);
CREATE INDEX IF NOT EXISTS idx_gap_events_topic ON gap_events (topic_id);
