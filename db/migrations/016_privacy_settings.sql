-- Privacy settings (docs/features/F-002-privacy-settings.md).
--
-- 1. Retention. With CHAT_RETENTION=<N>d an hourly job empties the text of messages older than N days and
--    records when; with CHAT_RETENTION=none the text is never written. The row itself stays, holding only
--    metadata (role, time, tokens, card ids, safety flag), so aggregate counts keep working.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS content_deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_chat_messages_retention ON chat_messages (created_at) WHERE content_deleted_at IS NULL;

-- 2. A report can carry the question and answer the learner chose to share with it. This is how reviewers
--    see a reported answer when the server stores no chats. Cleared 30 days after the report is resolved.
ALTER TABLE message_feedback
  ADD COLUMN IF NOT EXISTS question_text TEXT CHECK (question_text IS NULL OR length(question_text) <= 4000),
  ADD COLUMN IF NOT EXISTS answer_text TEXT CHECK (answer_text IS NULL OR length(answer_text) <= 4000);
