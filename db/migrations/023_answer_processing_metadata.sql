-- personal_local_context now also records an explicit local-only question/reviewed-only request.
-- It is monotonic for the conversation; later history must not downgrade it.
COMMENT ON COLUMN chat_sessions.personal_local_context IS
  'Conversation requires local processing: explicit question policy or prior local-only personal context';
ALTER TABLE chat_messages ADD COLUMN answer_source TEXT
  CHECK (answer_source IN ('model','reviewed-card','reviewed-fallback','unavailable'));
