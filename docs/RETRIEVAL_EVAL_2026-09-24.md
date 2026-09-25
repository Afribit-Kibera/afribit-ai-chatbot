# Retrieval Golden-Eval: First Run Findings (2026-09-24)

Built following an external audit of this project's approach against
industry practice (see the commit history around this date): "no
automated retrieval-quality evaluation, just spot-checks" was named as a
real, cheap-to-close gap. `apps/api/src/knowledge/runRetrievalEval.ts` +
`retrievalGoldenCases.ts` (40 real user-style questions, mixed
English/Sheng/Kiswahili, mapped to the concept card(s) that should be
retrieved) call the real `retrieveKnowledge()` — same hybrid
lexical+semantic path production chat uses — and report recall@1/@3/@5.

This is a genuinely useful tool: it found a real production bug on its
very first run, not a theoretical gap.

## Bug found and fixed: cross-domain retrieval pollution

**Before**: production recall@5 was 30% (12/40). The pattern was not
random — `"Bitcoin ni nini?"` returned **zero** Bitcoin content in its
top 5; all five results were Basic Communication Skills manual chapters
(greetings, active listening, personal boundaries). Several other basic
Bitcoin questions showed the same failure.

**Root cause**: `seedCommunityManuals.ts` correctly computes
`domain='bitcoin'` vs. `domain='communication'` per topic on
`knowledge_topics`, but its `knowledge_entries` INSERT never included the
`domain` column, so every row silently took the table's `'bitcoin'`
default regardless of source. That put the communication manual's
general chapters — register/tone guidance, not Bitcoin facts, already
served separately by `COMMUNICATION_STYLE_GUIDE` in the prompt layer —
into the exact same searchable pool as real Bitcoin content, where they
measurably won retrieval for short/common-word Bitcoin questions.

**Fix**: `seedCommunityManuals.ts` now looks up each entry's own topic
domain instead of relying on the column default; `retrieval.ts` filters
both the lexical and semantic queries to `domain = 'bitcoin'` explicitly,
so this is enforced rather than incidentally true. Already-seeded data
(both local dev and production) corrected with:

```sql
UPDATE knowledge_entries ke
SET domain = kt.domain
FROM knowledge_topics kt
WHERE ke.topic_id = kt.id AND ke.domain IS DISTINCT FROM kt.domain;
```

25 rows corrected in both environments (61 bitcoin / 25 communication
locally at the time; 37 bitcoin / 25 communication in production, since
production never had the original 24-concept starter pack seeded — see
below).

**After**: production recall@5 improved to 37.5% (15/40), and — more
importantly than the raw number — cross-domain pollution is completely
eliminated. Every result across all 40 cases is now a `btc*`/`btcman*`
Bitcoin entry; zero `commman.*` chapters appear anywhere in any result
set post-fix.

## Separate, not-yet-fixed finding: a few chapters over-rank broadly

37.5% recall@5 is still not good. Reading the post-fix misses, this
isn't random noise either: `btcman.ch15.on_chain_and_lightning_payments`
and `btcman.ch08.how_a_bitcoin_transaction_moves` appear in the top-5 for
a large fraction of *unrelated* queries (R01, R02, R03, R06, R07, R18,
R20, R32, R37, R39 — basics, government restriction, paying a merchant,
receiving, halving, buying a whole coin, offline use). That breadth
suggests these two chapters are scoring artificially high on generic
term/semantic overlap regardless of actual relevance — possibly a
chunking issue (if these chapters produce unusually large or
generic-vocabulary chunks) or an embedding-quality issue specific to
these two entries. Not investigated further in this pass — flagged here
as the next concrete lead rather than guessed at.

## Separate, unrelated finding: production is missing the original 24-concept starter pack

Local dev has 86 knowledge_entries (24 original starter-pack concepts +
62 manual-derived); production has only 62 (manual-derived only). The
original `btc.basics.*`/`btc.wallets.*`/`btc.safety.*`/etc. starter-pack
concepts were apparently never seeded into production during deployment
(`docs/44-...md` in the Insats ops workspace covers the deploy itself;
`pnpm db:seed`, as opposed to `db:seed:manuals`, was not run there).
Most golden cases accept either the starter-pack ID or the manual's
equivalent chapter as correct, so this alone doesn't explain the low
recall number, but it's worth a decision: either seed the original 24
into production too (more redundant coverage, e.g. more concise
canonical answers alongside the manual's longer chapters), or formally
retire that content in favor of the manual now that it's the
community-approved source. Not decided in this pass.

## Local-only, separate finding: stale embeddings

Local dev's `knowledge_embeddings` table only had 24 rows (matching the
original starter pack) against 86 `knowledge_entries` — the 62
manual-derived entries were seeded locally at some point without a
corresponding `pnpm knowledge:embed` run. This made the *first* local eval
run (25% recall@5, before the domain fix) look worse than production's
real state at the time (30%). Not a code bug — just a reminder that
`knowledge:embed` needs re-running after any local re-seed. Run it before
trusting a local eval number.

## How to run this eval

```bash
pnpm --filter @afribit/api knowledge:eval-retrieval
```

Needs a real Postgres connection (lexical half) and a working
`OPENROUTER_API_KEY` (semantic half calls the real embeddings endpoint —
real but tiny cost, a few cents at most for 40 short queries). Exits
non-zero if any golden case isn't found within the top 5, so it's usable
as a CI gate later if desired — not wired into CI yet, matching this
project's existing pattern of keeping paid/live checks manual
(`docs/COMMUNICATION_STYLE_EVAL.md` follows the same convention).
