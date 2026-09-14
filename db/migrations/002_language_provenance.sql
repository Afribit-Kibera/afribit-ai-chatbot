-- Layered language corpus + provenance model (docs/LANGUAGE_CORPUS.md).
--
-- `status` (draft/approved/rejected) remains the production admin-approval
-- gate from 001_init.sql — unchanged, still governed by PRD §25.1 / ADR
-- 0005. Everything added here is additional provenance/quality metadata
-- that sits alongside it, so that six months from now nobody can
-- `SELECT *` this table into a training run without every row explicitly
-- having said it's allowed.
--
-- New rows must set corpus_layer explicitly (no default) — every import
-- script has to consciously classify what it's writing.

ALTER TABLE language_entries
  ADD COLUMN corpus_layer TEXT NOT NULL DEFAULT 'L1_licensed_external'
    CHECK (corpus_layer IN (
      'L0_reference',            -- dictionaries, linguistic research, terminology
      'L1_licensed_external',    -- licensed public datasets (LughaKonnect, KenCorpus, Liva, ...)
      'L2_community_collected',  -- raw Afribit Microtasks / educator submissions, not yet reviewed
      'L3_afribit_reviewed',     -- peer/educator/language-reviewer validated
      'L4_gold'                  -- approved for production use as Afribit's own corpus
    )),
  ADD COLUMN source TEXT,                         -- short slug, e.g. 'lughakonnect', 'afribit_microtasks'
  ADD COLUMN source_type TEXT
    CHECK (source_type IN ('external_human', 'synthetic_external', 'afribit_microtask', 'afribit_authored', 'unknown')),
  ADD COLUMN license TEXT,                         -- e.g. 'CC-BY-4.0', 'MIT', 'proprietary'
  ADD COLUMN human_authored BOOLEAN,                -- nullable: unknown until checked
  ADD COLUMN synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN afribit_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN quality_tier TEXT NOT NULL DEFAULT 'unrated'
    CHECK (quality_tier IN ('unrated', 'bronze', 'silver', 'gold')),
  -- Explicit, conservative-by-default usage gates. Application code that
  -- selects language_entries for RAG context, fine-tuning export, or
  -- evaluation sets MUST filter on the relevant flag — the mere presence
  -- of a row here is not permission to use it for anything.
  ADD COLUMN allowed_for_rag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN allowed_for_training BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN allowed_for_evaluation BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE language_entries ALTER COLUMN corpus_layer DROP DEFAULT;

COMMENT ON COLUMN language_entries.afribit_reviewed IS
  'Whether an Afribit reviewer has actually looked at this row — independent of status. A source''s own review process (e.g. Liva''s two human passes) does not set this; only Afribit''s own review does.';
COMMENT ON COLUMN language_entries.allowed_for_rag IS
  'Must be explicitly set true by a reviewer before this row can be used as retrieval context. Never default true, regardless of source quality.';
