-- Pilot console (docs/guides/pilot-console-guide.md).
--
-- 1. Channel attribution. A learner link looks like https://<service>/app?ref=kibera-hub. The app keeps the
--    `ref` slug in the browser and sends it as `source` when a conversation starts. It is a label for
--    WHERE a link was shared, never WHO the learner is: a short lowercase slug, written once when the
--    conversation is created and never changed. Nothing else about the person is collected.
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS source TEXT
  CHECK (source IS NULL OR source ~ '^[a-z0-9][a-z0-9-]{0,31}$');
CREATE INDEX IF NOT EXISTS idx_chat_sessions_source ON chat_sessions (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions (created_at DESC);

-- 2. Which knowledge cards were handed to the model for an answer, so a reviewer looking at a reported
--    answer can see (and open) the cards behind it. Card ids only; the text stays in the card.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS retrieved_ids TEXT[];

-- 3. The answer review queue: a reported or thumbs-down answer is "open" until a reviewer resolves it.
ALTER TABLE message_feedback
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution TEXT
    CHECK (resolution IS NULL OR resolution IN ('answer_ok', 'card_fixed', 'new_card_needed', 'wrong_report', 'language_fix', 'other')),
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
CREATE INDEX IF NOT EXISTS idx_message_feedback_open ON message_feedback (created_at DESC) WHERE reviewed_at IS NULL AND rating = 'not_helpful';
CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON message_feedback (created_at DESC);
