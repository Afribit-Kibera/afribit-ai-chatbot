-- Afribit AI — initial schema (PRD §25)
-- Design constraint (§25.1): production knowledge and raw community
-- submissions never share a status model that makes accidental
-- publication easy. Knowledge tables gate on an explicit `status` enum
-- that defaults to 'draft'; Microtask submission tables are entirely
-- separate tables with their own review pipeline and never write directly
-- into knowledge_entries.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Users & preferences ────────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id TEXT UNIQUE, -- null for anonymous sessions (PRD §43 Q1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language_mode TEXT NOT NULL DEFAULT 'mixed_ke'
    CHECK (language_mode IN ('simple_en', 'swahili', 'sheng', 'mixed_ke')),
  explanation_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (explanation_level IN ('simple', 'normal', 'deep')),
  learning_consent BOOLEAN NOT NULL DEFAULT false, -- PRD §22.3
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Chat ──────────────────────────────────────────────────────────────

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  language_mode TEXT NOT NULL
    CHECK (language_mode IN ('simple_en', 'swahili', 'sheng', 'mixed_ke')),
  explanation_level TEXT NOT NULL
    CHECK (explanation_level IN ('simple', 'normal', 'deep')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent_id TEXT,
  retrieval_confidence REAL,
  model_profile TEXT,
  provider TEXT,
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  safety_flag TEXT, -- e.g. 'secret_detected', null otherwise
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

CREATE TABLE message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  reason TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Knowledge (§11, §25) ──────────────────────────────────────────────

CREATE TABLE knowledge_topics (
  id TEXT PRIMARY KEY, -- e.g. 'wallet_recovery'
  domain TEXT NOT NULL DEFAULT 'bitcoin',
  title TEXT NOT NULL
);

CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY, -- e.g. 'btc.wallet.recovery.001'
  topic_id TEXT REFERENCES knowledge_topics(id),
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'bitcoin',
  canonical_answer TEXT NOT NULL,
  beginner_answer TEXT NOT NULL,
  safety_notes JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'needs_factual_review', 'needs_language_review',
                       'approved', 'published', 'deprecated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  expires_or_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only these statuses may ever be used as retrieval context (PRD §11.3).
CREATE INDEX idx_knowledge_entries_production
  ON knowledge_entries(topic_id)
  WHERE status IN ('approved', 'published');

CREATE TABLE knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (knowledge_id, version)
);

CREATE TABLE knowledge_sources (
  id TEXT PRIMARY KEY, -- e.g. 'src_001'
  title TEXT NOT NULL,
  url TEXT,
  license TEXT,
  notes TEXT
);

CREATE TABLE knowledge_entry_sources (
  knowledge_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  PRIMARY KEY (knowledge_id, source_id)
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id TEXT NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE knowledge_embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  embedding vector(1536), -- adjust to match the chosen embedding model's dimension
  embedding_model TEXT NOT NULL
);

CREATE INDEX idx_knowledge_embeddings_ivfflat
  ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── Language corpus (§12) ─────────────────────────────────────────────

CREATE TABLE language_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utterance TEXT NOT NULL,
  intent TEXT,
  meaning TEXT,
  style TEXT NOT NULL CHECK (style IN ('simple_en', 'swahili', 'sheng', 'mixed_ke')),
  source_context TEXT,
  naturalness_score REAL,
  review_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'rejected')),
  freshness TEXT NOT NULL DEFAULT 'current'
    CHECK (freshness IN ('current', 'still_understood', 'context_specific', 'outdated', 'rejected')),
  contributor_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ
);

CREATE TABLE language_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_entry_id UUID NOT NULL REFERENCES language_entries(id) ON DELETE CASCADE,
  variant_text TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE language_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_entry_id UUID NOT NULL REFERENCES language_entries(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'needs_changes')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE language_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_entry_id UUID NOT NULL REFERENCES language_entries(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  naturalness INTEGER NOT NULL CHECK (naturalness BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Intents ───────────────────────────────────────────────────────────

CREATE TABLE intents (
  id TEXT PRIMARY KEY, -- e.g. 'bitcoin_basics.what_is_bitcoin'
  description TEXT
);

CREATE TABLE intent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id TEXT NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  example_text TEXT NOT NULL,
  language_style TEXT
);

-- ── Microtasks (§14) — fully separate from production knowledge ────────

CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymized_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contributor_reputation (
  contributor_id UUID PRIMARY KEY REFERENCES contributors(id) ON DELETE CASCADE,
  accepted_submissions INTEGER NOT NULL DEFAULT 0,
  rejected_submissions INTEGER NOT NULL DEFAULT 0,
  reputation_score REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE microtask_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN (
    'naturalness_ranking', 'rewrite', 'meaning_validation', 'intent_classification',
    'phrase_freshness', 'simplicity_review', 'ai_response_review',
    'community_question_collection', 'example_generation'
  )),
  source_content_gap_id UUID, -- FK added below after content_gaps exists
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE microtask_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES microtask_jobs(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES contributors(id),
  submission_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'consensus_review', 'trusted_review',
                       'factual_review', 'admin_review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE microtask_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES microtask_submissions(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('peer', 'trusted_language', 'factual', 'admin')),
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'needs_changes')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Model / prompt configuration & runs (§16, §19, §20) ─────────────────

CREATE TABLE model_profiles (
  profile TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  fallback_profile TEXT REFERENCES model_profiles(profile),
  max_output_tokens INTEGER NOT NULL,
  temperature REAL NOT NULL,
  privacy_profile TEXT NOT NULL CHECK (privacy_profile IN ('strict', 'standard')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  profile TEXT,
  provider TEXT,
  model TEXT,
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  estimated_cost_usd NUMERIC(10, 6),
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'timeout', 'fallback')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY, -- e.g. 'chat_system_prompt'
  description TEXT
);

CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  owner TEXT,
  change_notes TEXT,
  evaluation_score REAL,
  rollout_percentage REAL NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);

-- ── Evaluation (§29) ──────────────────────────────────────────────────

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  expected_notes TEXT,
  dimension TEXT -- factuality | grounding | simplicity | naturalness | safety | relevance
);

CREATE TABLE evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  model_profile TEXT,
  prompt_version_id UUID REFERENCES prompt_versions(id),
  score REAL,
  hard_fail BOOLEAN NOT NULL DEFAULT false,
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Content gaps, safety events, audit (§10.7, §21, §36) ────────────────

CREATE TABLE content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'unknown_question', 'missing_concept', 'weak_sheng_phrasing',
    'outdated_wallet_guide', 'repeated_followup', 'misunderstood_intent'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE microtask_jobs
  ADD CONSTRAINT fk_microtask_jobs_content_gap
  FOREIGN KEY (source_content_gap_id) REFERENCES content_gaps(id) ON DELETE SET NULL;

CREATE TABLE safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL, -- e.g. 'seed_phrase_detected'
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
