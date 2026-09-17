-- Judge (Sol) adjudication, invoked sparingly -- only when the critic
-- (Terra) flags a candidate as anything other than 'natural', or flags
-- factual drift (Architecture doc §3.2/§9: "only when generator/critic
-- disagree or for difficult concepts"). Mirrors the critic_verdict columns
-- from 004_critic_verdict.sql exactly: advisory only, never changes a row's
-- status/afribit_reviewed -- same "AI must never certify its own output"
-- rule (docs/adr/0005, doc §38 rule 2).
ALTER TABLE language_entries
  ADD COLUMN judge_verdict TEXT CHECK (judge_verdict IN ('natural', 'awkward', 'unnatural', 'unsafe')),
  ADD COLUMN judge_naturalness_score REAL,
  ADD COLUMN judge_factual_drift BOOLEAN;

COMMENT ON COLUMN language_entries.judge_verdict IS
  'Second-opinion AI adjudication (Sol) -- only populated when the critic already flagged this row. Never auto-rejects.';

-- Live evaluation: generated Sheng questions (L05) run through the exact
-- retrieval + prompt + gateway path the production /api/v1/chat route
-- uses (see apps/api/src/dataset-lab/runEval.ts), then scored by the critic
-- model against the concept's canonical fact. Deliberately its own table,
-- not chat_sessions/chat_messages, so synthetic eval traffic never mixes
-- with real user conversations or skews product analytics.
CREATE TABLE chat_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES dataset_campaigns(id) ON DELETE CASCADE,
  language_entry_id UUID REFERENCES language_entries(id),
  concept_knowledge_id TEXT REFERENCES knowledge_entries(id),
  question TEXT NOT NULL,
  chat_response TEXT NOT NULL,
  model_profile TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  retrieval_confidence REAL,
  used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER,
  critic_verdict TEXT CHECK (critic_verdict IN ('natural', 'awkward', 'unnatural', 'unsafe')),
  critic_naturalness_score REAL,
  critic_factual_drift BOOLEAN,
  critic_notes TEXT,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_evaluations_campaign ON chat_evaluations(campaign_id);
