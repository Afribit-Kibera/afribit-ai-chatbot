-- Bootstrap import: LughaKonnect Sheng vocabulary (PRD §13.2, §13.6)
--
-- Source:        https://lughakonnect.co.ke (public, community-contributed
--                 Kenyan language corpus; entries pulled from the public
--                 /explore?language=<sheng-id> browse pages and individual
--                 /entry/<uuid> pages on 2026-09-14).
-- License:       CC BY 4.0, per the site's own statement: "Everything here
--                 is licensed CC BY 4.0, so anyone can build with it as
--                 long as they credit the people it came from."
-- Attribution:    "Word/translation data from LughaKonnect
--                 (https://lughakonnect.co.ke), CC BY 4.0" — carry this
--                 attribution wherever any of these rows (or derivatives)
--                 are published outside this internal draft queue.
-- Human/Synthetic: Community-contributed / source-derived (per site's own
--                 "About" description); each source entry we pulled shows
--                 provenance as "Seeded from a published source" rather
--                 than a live speaker recording, so these are NOT yet
--                 confirmed as natural Kibera-context Sheng usage.
--
-- PRD §13.6 ingestion-rule status for THIS bootstrap batch:
--   1. License review        — done (CC BY 4.0, confirmed above).
--   2. Provenance review     — done (single-word dictionary entries, not
--                               full utterances/conversation pairs; PRD
--                               §12.2 calls out this exact format as the
--                               "weak" format — acceptable only as a
--                               vocabulary/provenance bootstrap source,
--                               per PRD §13.2, not as example utterances).
--   3. Sampling/quality      — PARTIAL. A manual skim of this batch found
--                               that many entries tagged "Sheng" on the
--                               source site are actually plain/formal
--                               Kiswahili words also common to Sheng
--                               (e.g. "Chumvi"/salt, "Hospitali"/hospital,
--                               "Babu"/grandfather) rather than distinctive
--                               slang — reviewers should judge Sheng-
--                               distinctiveness per entry, not assume the
--                               source's language tag alone is sufficient.
--                               One likely source error was also spotted:
--                               "Damu" (blood) is glossed here with the
--                               Kiswahili word "mkwaju" (tamarind), which
--                               looks like a mistranslation in the
--                               original site data, not our transcription.
--   4. Bias/context review   — not done; this is exactly what the `draft`
--                               status + human review queue is for.
--   5. Duplication check     — not run against existing language_entries;
--                               the WHERE NOT EXISTS guard below only
--                               prevents duplicate re-inserts of this same
--                               batch on repeated script runs.
--   6. PII check             — n/a (single common-noun/verb vocabulary
--                               entries, no personal data).
--   7. Afribit approval      — NOT granted. Every row below is inserted
--                               with status='draft'. Nothing here may be
--                               treated as approved/production language
--                               data (PRD §25.1, ADR 0005).
--
-- Safe to re-run: the anti-join on (utterance, source_context) skips rows
-- already inserted by a previous run of this script.
--
-- Provenance/quality-tier fields (docs/LANGUAGE_CORPUS.md): LughaKonnect
-- itself flags that its Sheng entries currently have no verified reviewer,
-- so afribit_reviewed stays false and allowed_for_rag/allowed_for_training
-- stay false until an Afribit reviewer actually validates each entry —
-- only allowed_for_evaluation is true, since licensed human-sourced
-- vocabulary is reasonable to use as an eval/test signal even unreviewed.

INSERT INTO language_entries (
  utterance, intent, meaning, style, source_context,
  naturalness_score, status, freshness, contributor_key,
  corpus_layer, source, source_type, license,
  human_authored, synthetic, afribit_reviewed, quality_tier,
  allowed_for_rag, allowed_for_training, allowed_for_evaluation
)
SELECT
  v.utterance,
  NULL,
  v.meaning,
  'sheng',
  'public_dataset:lughakonnect',
  NULL,
  'draft',
  'context_specific',
  NULL,
  'L1_licensed_external',
  'lughakonnect',
  'external_human',
  'CC-BY-4.0',
  TRUE,
  FALSE,
  FALSE,
  'unrated',
  FALSE,
  FALSE,
  TRUE
FROM (VALUES
  ('Amka',           'wake / wake up'),
  ('Asali',          'honey'),
  ('baadaye',        'Later; Goodbye'),
  ('Babe/Dado',      'husband'),
  ('Babu',           'grandfather'),
  ('Baridi',         'cold'),
  ('Bibi/Dem',       'wife'),
  ('Buda/Bro',       'brother'),
  ('Buluu',          'blue'),
  ('chapaa',         'money'),
  ('Chumvi',         'salt'),
  ('Daktari/Daktare','doctor'),
  ('Damu',           'blood'),
  ('Dawa',           'medicine'),
  ('dem',            'girl; young woman'),
  ('Dhahabu',        'gold'),
  ('Fanya kazi',     'work'),
  ('fiti',           'fine; good'),
  ('freshi',         'Fine; Cool'),
  ('Gauni',          'dress'),
  ('Grey',           'gray'),
  ('Haraka',         'fast'),
  ('Hospitali',      'hospital'),
  ('Jaketi',         'jacket'),
  ('Jirani',         'neighbor'),
  ('Kahawia',        'brown'),
  ('Kamba',          'rope'),
  ('Karai',          'pan'),
  ('keja',           'home; house'),
  ('Keti',           'sit'),
  ('Kiatu/Shoe',     'shoe'),
  ('Kichwa/Dome',    'head'),
  ('Kijani',         'green'),
  ('Kijiko',         'spoon'),
  ('Kikombe',        'cup'),
  ('Kimbia',         'run'),
  ('Kisu',           'knife'),
  ('Kitambaa',       'scarf'),
  ('Kofia',          'hat'),
  ('Kondoo',         'sheep')
) AS v(utterance, meaning)
WHERE NOT EXISTS (
  SELECT 1 FROM language_entries le
  WHERE le.utterance = v.utterance
    AND le.source_context = 'public_dataset:lughakonnect'
);
