#!/usr/bin/env node
// Runs the plain-SQL bootstrap import scripts in this directory against the
// local dev Postgres container started by `pnpm db:up`
// (infra/docker-compose.yml → service `postgres`, container
// `afribit-postgres`). See db/seed/README.md for what these scripts are and
// why they only ever insert status='draft' rows.
//
// Deliberately shells out to `docker exec ... psql` instead of depending on
// the `pg` npm package: db/seed/ is not part of the pnpm workspace (see
// pnpm-workspace.yaml), so a bare `import "pg"` here can't resolve without
// either adding this folder to the workspace or vendoring a dependency —
// more moving parts than a one-off bootstrap importer needs. Requires
// Docker Desktop / docker CLI on PATH, which the project already requires
// for `pnpm db:up`.
//
// Usage (from repo root, after `pnpm db:up` and `pnpm db:migrate`):
//   node db/seed/run.mjs
//   node db/seed/run.mjs 001_lughakonnect_sheng.sql   # run just one file

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CONTAINER = process.env.AFRIBIT_PG_CONTAINER ?? "afribit-postgres";
const PGUSER = process.env.AFRIBIT_PG_USER ?? "afribit";
const PGDATABASE = process.env.AFRIBIT_PG_DATABASE ?? "afribit";

const here = path.dirname(fileURLToPath(import.meta.url));
const requested = process.argv[2];

const files = readdirSync(here)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => !requested || f === requested)
  .sort();

if (files.length === 0) {
  console.error(requested ? `No such seed file: ${requested}` : "No .sql seed files found.");
  process.exit(1);
}

function psql(args, input) {
  return spawnSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", PGUSER, "-d", PGDATABASE, "-v", "ON_ERROR_STOP=1", ...args],
    { input, encoding: "utf-8" },
  );
}

function countLanguageEntries() {
  const res = psql(["-t", "-A", "-c", "SELECT count(*) FROM language_entries;"]);
  if (res.status !== 0) {
    throw new Error(`count query failed: ${res.stderr}`);
  }
  return Number(res.stdout.trim());
}

let hadError = false;
for (const file of files) {
  const sql = readFileSync(path.join(here, file), "utf-8");
  const before = countLanguageEntries();
  console.log(`applying ${file} ...`);
  const res = psql([], sql);
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    hadError = true;
    continue;
  }
  const after = countLanguageEntries();
  console.log(`  language_entries: ${before} -> ${after} (+${after - before} new draft rows)`);
}

process.exitCode = hadError ? 1 : 0;
