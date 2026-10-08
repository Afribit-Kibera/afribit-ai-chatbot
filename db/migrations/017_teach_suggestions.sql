-- "Say it your way" (docs/features/F-003-say-it-your-way.md, ADR 0015).
--
-- A member rewrites an answer the way they would say it. The suggestion waits here until a reviewer
-- decides. Nothing in this table is ever used by the assistant: only an APPROVED suggestion becomes a
-- language_entries row, and its use flags are the member's consent AND the reviewer's approval.
CREATE TABLE IF NOT EXISTS teach_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT,
  -- Where it came from. Deleting the conversation clears the link and the shared text (privacy/store.ts);
  -- the suggestion itself was given with consent and stays.
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  question_text TEXT CHECK (question_text IS NULL OR length(question_text) <= 4000),
  answer_text TEXT CHECK (answer_text IS NULL OR length(answer_text) <= 4000),
  suggestion TEXT NOT NULL CHECK (length(suggestion) BETWEEN 3 AND 1000),
  language_mode TEXT NOT NULL,
  reason TEXT CHECK (reason IS NULL OR reason IN ('too_formal', 'wrong_words', 'wrong_facts', 'other')),
  -- The member's own choices, kept separately from any use flag.
  consent_answers BOOLEAN NOT NULL DEFAULT false,
  consent_testing BOOLEAN NOT NULL DEFAULT false,
  consent_training BOOLEAN NOT NULL DEFAULT false,
  -- Suggestions about seed phrases, scams or sending money need a second reviewer.
  safety_topic BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- only when a signed-in person suggested it
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'card_fix')),
  first_approval_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT CHECK (decision_note IS NULL OR length(decision_note) <= 1000),
  language_entry_id UUID REFERENCES language_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teach_suggestions_queue ON teach_suggestions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teach_suggestions_session ON teach_suggestions (session_id, created_at DESC);
