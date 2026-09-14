-- Afribit Dataset Lab (docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md)
--
-- Reuses the existing knowledge_entries table as the L00 canonical-fact
-- source (no separate canonical_concepts/canonical_facts tables — that
-- would duplicate what already exists) and the existing prompt_templates/
-- prompt_versions tables (001_init.sql) for prompt versioning. This
-- migration adds only what's genuinely new: campaign tracking, raw
-- generation retention, and two new provenance enum values for
-- Afribit-generated (not external) synthetic content.

ALTER TABLE language_entries
  DROP CONSTRAINT language_entries_corpus_layer_check,
  ADD CONSTRAINT language_entries_corpus_layer_check CHECK (corpus_layer IN (
    'L0_reference',
    'L1_licensed_external',
    'L1_synthetic_bootstrap',  -- Afribit-generated synthetic candidates, unreviewed — see doc §7-9
    'L2_community_collected',
    'L3_afribit_reviewed',
    'L4_gold'
  ));

ALTER TABLE language_entries
  DROP CONSTRAINT language_entries_source_type_check,
  ADD CONSTRAINT language_entries_source_type_check CHECK (source_type IN (
    'external_human', 'synthetic_external', 'afribit_microtask', 'afribit_authored',
    'synthetic_generated',  -- Afribit's own LLM-generated candidates (doc's Dataset Lab)
    'unknown'
  ));

CREATE TABLE dataset_campaigns (
  id TEXT PRIMARY KEY,                    -- e.g. 'pilot_2026_09_001'
  name TEXT NOT NULL,
  layer TEXT NOT NULL,                    -- L01..L14, per the architecture doc
  language TEXT,                          -- simple_en | swahili | sheng | mixed_ke | null (non-language layers)
  model_role TEXT NOT NULL CHECK (model_role IN ('generator', 'critic', 'judge')),
  model_profile TEXT NOT NULL,            -- resolves via apps/api/config/model-profiles.json
  prompt_version TEXT NOT NULL,
  examples_per_concept INTEGER NOT NULL DEFAULT 5,
  max_budget_usd NUMERIC(10, 4) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sample', 'approved', 'running', 'paused', 'completed', 'reviewed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Raw provider responses, retained separately from parsed candidates
-- (doc §18: "Do not delete raw provider responses... production chatbot
-- should never query this table").
CREATE TABLE dataset_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES dataset_campaigns(id) ON DELETE CASCADE,
  concept_knowledge_id TEXT REFERENCES knowledge_entries(id),  -- the L00 fact this generation grounds on
  model_role TEXT NOT NULL CHECK (model_role IN ('generator', 'critic', 'judge')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  raw_request JSONB NOT NULL,
  raw_response TEXT NOT NULL,
  parsed_candidate_count INTEGER NOT NULL DEFAULT 0,
  accepted_candidate_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'schema_invalid', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dataset_generations_campaign ON dataset_generations(campaign_id);

-- Links a promoted language_entries row back to the generation that
-- produced it, so "never erase provenance" (doc §38 rule 6) holds even
-- after a row is edited/reviewed/promoted.
ALTER TABLE language_entries
  ADD COLUMN generation_id UUID REFERENCES dataset_generations(id);
