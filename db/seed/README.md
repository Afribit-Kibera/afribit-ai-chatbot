# db/seed — public-dataset bootstrap imports

Plain-SQL scripts that import a small, verified sample from a public
language-data source into `language_entries`, as bootstrap material for
the Afribit community language corpus (PRD §13). Every row these scripts
insert is `status='draft'` and always will be — see
[`docs/dataset-register.md`](../../docs/dataset-register.md) for the full
license/provenance/quality review behind each source, and PRD §25.1 / ADR
0005 for why bootstrap rows must never be written as `approved`.

This is separate from `apps/api/src/db/seed.ts`, which seeds the starter
**knowledge** pack (PRD §39) — that's first-party Bitcoin content, not
public language data.

## Running

Requires the local dev Postgres to be up and migrated:

```bash
pnpm db:up        # starts Postgres (pgvector) + Redis, if not already running
pnpm db:migrate
```

Then, from the repo root:

```bash
node db/seed/run.mjs                          # run every *.sql file here
node db/seed/run.mjs 001_lughakonnect_sheng.sql   # run just one file
```

`run.mjs` shells out to `docker exec afribit-postgres psql ...` rather than
using the `pg` npm package directly, because `db/seed/` isn't part of the
pnpm workspace (`pnpm-workspace.yaml` only globs `apps/*` and `packages/*`)
— this keeps the importer dependency-free instead of pulling `db/seed` into
the workspace graph for one script. It needs Docker Desktop / the `docker`
CLI on `PATH`, which the project already requires for `pnpm db:up`. Each
script guards its own inserts with `WHERE NOT EXISTS (...)`, so re-running
`run.mjs` is safe and will not create duplicate rows.

## Current scripts

| File | Source | Rows | License |
|---|---|---|---|
| `001_lughakonnect_sheng.sql` | [LughaKonnect](https://lughakonnect.co.ke) | 40 | CC BY 4.0 (attribution required — see the script header) |
| `002_kencorpus_text.sql` | [KenCorpus](https://huggingface.co/datasets/Kencorpus/KenCorpus_text) | 28 | CC BY 4.0 (attribution required — see the script header) |

## Adding another source

1. Verify it first — license, provenance, a real sample you can actually
   see (not assumed from memory). Add/update its row in
   `docs/dataset-register.md` with what you actually found.
2. Write a new `NNN_<source>.sql` file here, following the header-comment
   format in `001_lughakonnect_sheng.sql` (source, license, attribution
   text, human/synthetic status, and an honest note on what the §13.6
   ingestion-rule steps did and didn't cover).
3. Insert with `status='draft'`, an honest `source_context` string like
   `'public_dataset:<source>'`, and `freshness='context_specific'` unless
   you have real evidence of something else.
4. Never set `status='approved'` — that's a human review-queue decision,
   not something a bootstrap import script gets to make.
