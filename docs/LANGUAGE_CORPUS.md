# Afribit Language Corpus — Layered Model

Defined 2026-09-14, refined from the initial public-dataset bootstrap pass
(`docs/dataset-register.md`). This is the durable architecture doc —
future sessions should read this before importing or querying
`language_entries`.

## Why layered, not one dataset

There is no single `sheng_dataset.csv` that solves this. The bootstrap
pass confirmed the PRD's own skepticism (§13): most public "Sheng
datasets" are either license-gated, undocumented, disclosed-synthetic, or
simply don't ship real data. Chasing dataset size (hundreds of thousands
of scraped/synthetic rows) would actively hurt the product — it would
teach the model a version of Sheng nobody actually speaks. A smaller,
defensible, provenance-tracked corpus is worth more than a large
unverifiable one.

## The five layers

Stored as `language_entries.corpus_layer` (see `db/migrations/002_language_provenance.sql`):

```text
L0 — Reference
  Dictionaries, linguistic research, terminology lists. Informational,
  not conversational. Example: raw KenCorpus text.

L1 — Licensed external human data
  Public datasets with a real, verified license and real content, not yet
  reviewed by Afribit. Example: LughaKonnect, KenCorpus. ("Liva," a
  Swahili-English conversational corpus once proposed for this layer,
  could not be located under that name in the 2026-09-14 round-2 dataset
  register recheck — see docs/dataset-register.md — and is not confirmed
  to exist; do not treat it as a real L1 source until someone supplies a
  verifiable URL/id.)

L2 — Afribit collected community data
  Raw Microtasks submissions, educator submissions, natural rewrites —
  unreviewed. This is the first-party pipeline in insats-engine
  (afribit_ai_microtask_submissions), not public data. See
  docs/adr/0005-microtasks-human-feedback-layer.md.

L3 — Afribit reviewed data
  Peer-, educator-, or language-reviewer-validated. Passed at least one
  Afribit-internal review pass (afribit_reviewed = true).

L4 — Afribit Gold Corpus
  Approved for production use: RAG context, few-shot examples, eventual
  fine-tuning. This is what status='approved' + afribit_reviewed=true +
  the relevant allowed_for_* flags actually gates.
```

L2 and L3 are the real product. External datasets (L0/L1) exist only to
give the corpus a running start — they are not Afribit's voice.

## Provenance fields on every row

Every `language_entries` row carries (beyond the original `status`/
`freshness` fields from `db/migrations/001_init.sql`, which remain the
production admin-approval gate):

| Field | Meaning |
|---|---|
| `corpus_layer` | L0–L4, see above. Required at insert, no default. |
| `source` | Short slug: `lughakonnect`, `afribit_microtasks`, etc. |
| `source_type` | `external_human` \| `synthetic_external` \| `afribit_microtask` \| `afribit_authored` \| `unknown` |
| `license` | e.g. `CC-BY-4.0`, `MIT`, `proprietary` |
| `human_authored` | Nullable boolean — unknown until checked |
| `synthetic` | Default false; true for anything LLM/rule-generated |
| `afribit_reviewed` | Has an **Afribit** reviewer actually looked at this row — independent of a source's own review process. A source saying "human-verified" (e.g. the unverified "Liva" corpus's claimed two review passes — see docs/dataset-register.md, this source could not actually be located) does not set this to true; only Afribit's own review does. |
| `quality_tier` | `unrated` \| `bronze` \| `silver` \| `gold` — informational signal about source trustworthiness, separate from `afribit_reviewed` |
| `allowed_for_rag` | Must be explicitly set true by a reviewer. Default false. |
| `allowed_for_training` | Must be explicitly set true by a reviewer. Default false. |
| `allowed_for_evaluation` | Default false; commonly true even for unreviewed licensed human data, since eval/stress-testing is lower-risk than shaping production responses — but still false for undocumented/no-provenance sources. |

**Update 2026-09-23:** `apps/api/src/knowledge/retrieveLanguageExamples.ts`
now reads `language_entries` for RAG context — the first application code
to do so. It filters on `status = 'approved' AND allowed_for_rag = true`
exactly as this section always required, and is wired into live chat via
`chatService.ts`'s `prepareChat()` for sheng/mixed_ke only. It is
lexical-only (no embeddings table exists for this content) and has no
domain/topic scoping — see the module's own doc comment and
`docs/COMMUNICATION_STYLE_EVAL.md` Finding 3 for the full story and a
known limitation found during verification. `allowed_for_training` and
`allowed_for_evaluation` still have no reader — any future feature that
selects for those purposes MUST filter on the relevant flag the same way,
never treat a row's mere presence as permission. Never `SELECT *` this
table into a training/export pipeline.

## Target shape, not raw row count

Preferred example shape (a complete utterance with context), not bare
dictionary entries:

```json
{
  "user": "Maze hii Bitcoin naipata aje?",
  "meaning": "How do I get Bitcoin?",
  "style": "sheng",
  "context": "casual",
  "naturalness": 5,
  "human_authored": true
}
```

Or, once paired with a reviewed response (higher value — usable as a
few-shot example or future fine-tuning pair):

```json
{
  "question": "Maze hii Bitcoin naipata aje?",
  "response": "Unaeza earn, ubuy, ama mtu akutumie...",
  "intent": "acquire_bitcoin",
  "language": "sheng",
  "bitcoin_fact_checked": true,
  "language_checked": true,
  "reviewers": 3
}
```

The current `language_entries` schema stores single utterances
(`utterance`/`intent`/`meaning`); question-response pairs belong in
`intent_examples` (linked to `intents`) or a future dedicated table once
that need is concrete — not speculatively built now.

## v0.1 corpus targets (not yet met — tracking only)

Rough target composition for a first defensible corpus, prioritizing L2/L3
(Afribit-collected, human-authored) over L1 (external bootstrap):

| Category | Target | Status as of 2026-09-17 |
|---|---|---|
| External verified seeds (L0/L1) | 500–2,000 | 68 (40 LughaKonnect, L1; 28 KenCorpus, L0) — unchanged since 2026-09-14; Batch 003 only added synthetic (L1_synthetic_bootstrap), not external, seeds |
| Synthetic bootstrap (L1_synthetic_bootstrap, AI-generated, unreviewed) | not targeted in the original table, tracked here since it's now the largest slice | 308 (30 pilot + 37 Batch 002 + 241 Batch 003) — see docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md's implementation-status log. All still `status='draft'`, `afribit_reviewed=false`; none are `allowed_for_rag`/`allowed_for_training`. |
| Afribit Microtasks — natural questions | ~1,500 | Pilot live in insats-engine (`AAI-PILOT-001`), submission count unknown from this repo |
| Afribit Microtasks — human-written responses | ~1,500 | Same pilot |
| Translation/rewriting pairs | ~2,000 | Same pilot (`natural_rewrite` task type) |
| Naturalness rankings | ~5,000 judgements | Same pilot (`naturalness_ranking` task type) |
| Bitcoin safety scenarios | ~500 | Same pilot (`unsafe_response_detection`, `misleading_guarantee_detection`) |
| Evaluation set | ~500 prompts | Not started in this repo |
| Afribit-authored teaching manuals (L3, community-approved) | n/a — not a target, tracked here since it's a new first-party source | 271 rows added 2026-09-22 from two manuals (`Bitcoin_Basics_in_Kenyan_Sheng_Afribit_AI.docx`, `Basic_Communication_Skills_in_Kenyan_Sheng_Afribit_AI.docx`, repo root) via `apps/api/src/db/seedCommunityManuals.ts`: 37 glossary rows (Bitcoin Basics) + 105 per-chapter phrase rows + 64 phrase-bank rows + 65 glossary rows (Communication Skills). Landed at `corpus_layer='L2_community_collected'`, `source_type='afribit_authored'`, `human_authored=true`, all `allowed_for_*` flags false. The same two manuals also seeded 62 `knowledge_entries` rows (37 Bitcoin Basics chapters/FAQ/practice flows, 25 Communication Skills chapters/role-plays) at `status='needs_language_review'`. **Update 2026-09-23:** both manuals were presented to and approved by community reviewers as their Version 1.0, first community-approved version (source `.docx` front matter updated to record this). `apps/api/src/db/promoteCommunityManuals.ts` promoted all 271 `language_entries` rows to `corpus_layer='L3_afribit_reviewed'`, `afribit_reviewed=true`, `status='approved'`, `allowed_for_rag=true`, `allowed_for_evaluation=true` — and all 62 `knowledge_entries` rows to `status='published'`. `allowed_for_training` deliberately left `false` on every row: community approval covered chat/model use, not fine-tuning or redistribution, which stays a separate, unaddressed decision. **Update 2026-09-23 (later):** `retrieveLanguageExamples.ts` now reads these rows for real — see this doc's own note above and `docs/COMMUNICATION_STYLE_EVAL.md` Finding 3 for the full story. |

The Microtasks pilot counts above are unknown from `afribit-ai` — querying
them means reaching `insats-engine`'s production database, which per
[[insats-production-infrastructure]] requires explicit authorization each
time, not an assumption from this doc.

## See also

- `docs/dataset-register.md` — per-source license/provenance findings.
- `db/seed/README.md` — how to run bootstrap imports.
- `docs/adr/0005-microtasks-human-feedback-layer.md` — why L2 submissions
  can never auto-promote to L3/L4.
