import fs from "node:fs";
import path from "node:path";
import { pool } from "../db/pool.js";
import { backfillEmbeddings } from "../knowledge/embedBackfill.js";
import { DEFAULT_PACK_DIR } from "./active.js";
import { describeBranding } from "./branding.js";
import { loadPack } from "./load.js";
import { listPackDirs, loadRegistry, optionsFromEnv, type PackRegistry } from "./registry.js";
import { PACK_SCHEMA, type CommunityPack } from "./types.js";

/**
 * Community pack tools.
 *
 *   pnpm pack:validate [dir]                 check a pack and list every problem at once
 *   pnpm pack:list [packsDir]                check every pack in COMMUNITY_PACKS_DIR (or packsDir) and that they can be served together
 *   pnpm pack:init <dir> [--id ..]           scaffold a new pack
 *   pnpm pack:install [dir] [--no-embed]     load a pack's knowledge into the database
 *                                            (no dir, with COMMUNITY_PACKS_DIR set: installs every pack the server would serve)
 *   pnpm pack:export <outDir> [packDir]      write the database's approved cards back out as a pack
 *
 * With no dir, the bundled Kibera pack is used (or COMMUNITY_PACK_DIR). See docs/guides/community-pack-guide.md.
 */

function flags(argv: string[]): { positional: string[]; named: Record<string, string | true> } {
  const positional: string[] = [];
  const named: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        named[key] = next;
        i++;
      } else named[key] = true;
    } else positional.push(a);
  }
  return { positional, named };
}

function report(dir: string): ReturnType<typeof loadPack> {
  const r = loadPack(dir);
  const pack = r.pack;
  console.log(`\nPack folder: ${path.resolve(dir)}`);
  for (const w of r.warnings) console.log(`  warning: ${w}`);
  for (const e of r.errors) console.log(`  ERROR:   ${e}`);
  if (r.ok && pack) {
    const live = pack.knowledge.entries.filter((c) => c.status === "approved" || c.status === "published").length;
    console.log(`\n  ${pack.name} v${pack.version} for ${pack.community.name} (${pack.domain.label})`);
    console.log(`  modes: ${pack.modes.map((m) => m.id + (m.id === pack.defaultMode ? "*" : "")).join(", ")}   (* default)`);
    console.log(`  knowledge: ${pack.knowledge.topics.length} topics, ${pack.knowledge.entries.length} cards (${live} approved/published)`);
    console.log(`  branding: ${describeBranding(pack.branding)}`);
    console.log("\n  VALID");
  } else {
    console.log(`\n  NOT VALID (${r.errors.length} error${r.errors.length === 1 ? "" : "s"})`);
  }
  return r;
}

async function installCards(pack: CommunityPack): Promise<void> {
  const by = `pack:${pack.id}@${pack.version}`;
  let added = 0;
  let changed = 0;
  for (const t of pack.knowledge.topics) {
    await pool.query(`INSERT INTO knowledge_topics (id, domain, title) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`, [t.id, t.domain, t.title]);
  }
  for (const c of pack.knowledge.entries) {
    const live = c.status === "approved" || c.status === "published";
    const res = await pool.query<{ inserted: boolean }>(
      `INSERT INTO knowledge_entries AS ke (id, topic_id, title, domain, canonical_answer, beginner_answer, safety_notes, status, reviewed_by, reviewed_at, valid_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, ${live ? "now()" : "NULL"}, now())
       ON CONFLICT (id) DO UPDATE SET
         topic_id = EXCLUDED.topic_id, title = EXCLUDED.title, domain = EXCLUDED.domain,
         canonical_answer = EXCLUDED.canonical_answer, beginner_answer = EXCLUDED.beginner_answer,
         safety_notes = EXCLUDED.safety_notes, status = EXCLUDED.status,
         version = ke.version + 1, updated_at = now()
       WHERE (ke.topic_id, ke.title, ke.domain, ke.canonical_answer, ke.beginner_answer, ke.safety_notes::text, ke.status)
         IS DISTINCT FROM (EXCLUDED.topic_id, EXCLUDED.title, EXCLUDED.domain, EXCLUDED.canonical_answer, EXCLUDED.beginner_answer, EXCLUDED.safety_notes::text, EXCLUDED.status)
       RETURNING (xmax = 0) AS inserted`,
      [c.id, c.topic, c.title, c.domain, c.canonical_answer, c.beginner_answer, JSON.stringify(c.safety_notes), c.status, live ? by : null],
    );
    if (res.rows[0]) res.rows[0].inserted ? added++ : changed++;
  }
  console.log(`\nInstalled ${pack.id}: ${added} cards added, ${changed} updated, ${pack.knowledge.entries.length - added - changed} unchanged.`);
}

/** Builds the search index for every approved card in the database (pack-agnostic: it covers all installed packs). */
async function buildIndex(embed: boolean): Promise<void> {
  if (embed) {
    const out = await backfillEmbeddings();
    console.log(`Search index ready (${out.chunksCreated} chunks, ${out.embeddingsCreated} embeddings created).`);
  } else console.log("Skipped the search index (--no-embed). Run: pnpm knowledge:embed");
}

async function install(dir: string, embed: boolean): Promise<void> {
  const r = report(dir);
  if (!r.ok || !r.pack) process.exit(1);
  await installCards(r.pack);
  await buildIndex(embed);
  console.log(`\nStart the API with COMMUNITY_PACK_DIR=${r.pack.dir} to serve this pack.`);
}

/** Loads and cross-checks the packs the environment asks the server to serve; exits 1 listing every problem. */
function checkServed(packsDir?: string): PackRegistry {
  const opts = optionsFromEnv(packsDir ? { ...process.env, COMMUNITY_PACKS_DIR: packsDir, COMMUNITY_PACK_DIR: "" } : process.env, DEFAULT_PACK_DIR);
  const found = opts.errors.length > 0 ? { ok: false, errors: opts.errors, warnings: [] as string[], registry: undefined } : loadRegistry(opts);
  for (const w of found.warnings) console.log(`  warning: ${w}`);
  if (!found.ok || !found.registry) {
    for (const e of found.errors) console.log(`  ERROR:   ${e}`);
    console.log(`\n  NOT VALID (${found.errors.length} error${found.errors.length === 1 ? "" : "s"})`);
    process.exit(1);
  }
  return found.registry;
}

/** Every pack the server would serve (COMMUNITY_PACKS_DIR, COMMUNITY_PACKS), checked together first. */
async function installServed(embed: boolean): Promise<void> {
  const registry = checkServed();
  for (const pack of registry.packs) await installCards(pack);
  await buildIndex(embed);
}

function list(packsDir?: string): void {
  const dir = packsDir ?? process.env.COMMUNITY_PACKS_DIR;
  if (!dir) throw new Error("usage: pack:list [packsDir]   (or set COMMUNITY_PACKS_DIR)");
  const dirs = listPackDirs(path.resolve(dir));
  if (dirs.length === 0) throw new Error(`${path.resolve(dir)} has no subfolder containing a pack.json`);
  for (const d of dirs) report(d);
  const registry = checkServed(dir);
  console.log(`\n  ${registry.packs.length} pack(s) can be served together: ${registry.packs.map((p) => p.id + (p.id === registry.default.id ? "*" : "")).join(", ")}   (* default)`);
  console.log("  VALID");
}

async function exportPack(out: string, dir: string): Promise<void> {
  const r = loadPack(dir);
  if (!r.ok || !r.pack) {
    report(dir);
    process.exit(1);
  }
  const pack = r.pack;
  const dest = path.resolve(out);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new Error(`${dest} already exists and is not empty`);
  fs.cpSync(pack.dir, dest, { recursive: true });
  const { rows: topics } = await pool.query(`SELECT id, title, domain FROM knowledge_topics WHERE domain = ANY($1::text[]) ORDER BY id`, [pack.domain.retrievalDomains]);
  const { rows: entries } = await pool.query(
    `SELECT id, topic_id AS topic, title, domain, canonical_answer, beginner_answer, safety_notes, status
     FROM knowledge_entries WHERE status IN ('approved', 'published') AND community_pack_id IS NULL AND domain = ANY($1::text[]) ORDER BY id`,
    [pack.domain.retrievalDomains],
  );
  fs.rmSync(path.join(dest, "knowledge"), { recursive: true, force: true });
  fs.mkdirSync(path.join(dest, "knowledge"), { recursive: true });
  fs.writeFileSync(path.join(dest, "knowledge", "cards.json"), JSON.stringify({ topics, entries }, null, 2) + "\n");
  const manifestFile = path.join(dest, "pack.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as { knowledge: { files: string[] } };
  manifest.knowledge.files = ["knowledge/cards.json"];
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Exported ${entries.length} approved/published cards (${topics.length} topics) to ${dest}`);
  report(dest);
}

function init(dir: string, named: Record<string, string | true>): void {
  const str = (k: string, d: string): string => (typeof named[k] === "string" ? (named[k] as string) : d);
  const dest = path.resolve(dir);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new Error(`${dest} already exists and is not empty`);
  const id = str("id", path.basename(dest).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^[^a-z]+/, "") || "my-community");
  const modeIds = str("modes", "plain_en").split(",").map((m) => m.trim()).filter(Boolean);
  const modes = modeIds.map((m) => ({ id: m, label: m, description: `Describe how people in your community speak in "${m}" mode.`, codeSwitched: false }));
  const manifest = {
    schema: PACK_SCHEMA,
    id,
    name: str("name", "Community Learning Assistant"),
    version: "0.1.0",
    description: str("description", "A community learning assistant built and reviewed by its own community."),
    license: "CC-BY-SA-4.0",
    maintainers: [{ name: str("maintainer", "Your organisation"), contact: str("contact", "you@example.org") }],
    community: { name: str("community", "Your community"), country: str("country", "") || undefined },
    domain: { id: str("domain", "learning"), label: str("label", "learning"), retrievalDomains: [str("domain", "learning")] },
    defaultMode: modeIds[0],
    modes,
    knowledge: { files: ["knowledge/cards.json"] },
    safety: { secretDetection: true },
    knowledgeLabel: str("name", "Community Learning Assistant"),
    // White-label look (docs/guides/white-label-guide.md). Add "accentColor": "#rrggbb" and "logo": "brand/logo.svg" when you have them.
    branding: { shortName: str("short-name", str("name", "Community Learning Assistant").slice(0, 24).trim()), poweredBy: { show: true } },
    disclaimers: ["AI can be wrong. Check important things with a person you trust."],
  };
  fs.mkdirSync(path.join(dest, "knowledge"), { recursive: true });
  fs.mkdirSync(path.join(dest, "language"), { recursive: true });
  fs.mkdirSync(path.join(dest, "prompts"), { recursive: true });
  fs.mkdirSync(path.join(dest, "brand"), { recursive: true });
  fs.writeFileSync(
    path.join(dest, "brand", "README.md"),
    "Put your logo here as logo.svg, logo.png or logo.webp (200 KB at most; an SVG must be a plain picture with no scripts), then add \"logo\": \"brand/logo.svg\" to \"branding\" in pack.json.\nSee docs/guides/white-label-guide.md.\n",
  );
  fs.writeFileSync(path.join(dest, "pack.json"), JSON.stringify(manifest, null, 2) + "\n");
  const domainId = manifest.domain.id;
  const cards = {
    topics: [{ id: `${domainId}.basics`, title: "Basics", domain: domainId }],
    entries: [
      {
        id: `${domainId}.basics.example.001`,
        topic: `${domainId}.basics`,
        title: "Example card: replace me",
        domain: domainId,
        canonical_answer: "The complete, accurate answer, written for a reviewer to check. The assistant answers only from cards like this one.",
        beginner_answer: "The same answer in the simplest possible words.",
        safety_notes: [],
        status: "draft",
      },
    ],
  };
  fs.writeFileSync(path.join(dest, "knowledge", "cards.json"), JSON.stringify(cards, null, 2) + "\n");
  for (const m of modes) {
    fs.writeFileSync(path.join(dest, "language", `${m.id}.full.md`), `Language mode: ${m.label}.\nWrite how your community really speaks. Describe the register, words to prefer, words to avoid.\n`);
    fs.writeFileSync(path.join(dest, "language", `${m.id}.compact.md`), `Write in ${m.label}: one or two lines of the most important rules.\n`);
  }
  fs.writeFileSync(
    path.join(dest, "README.md"),
    `# ${manifest.name}\n\nA community pack for the Afribit AI engine. Edit pack.json, language/, prompts/ and knowledge/, then:\n\n    pnpm pack:validate ${dir}\n    pnpm pack:install ${dir}\n\nCards stay "draft" until your reviewers mark them "approved" or "published"; the assistant never answers from drafts.\n`,
  );
  console.log(`Created ${dest}\nNext: edit the files, then run pnpm pack:validate ${dir}`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, named } = flags(rest);
  const packDir = positional[0] ?? process.env.COMMUNITY_PACK_DIR ?? DEFAULT_PACK_DIR;
  switch (cmd) {
    case "validate": {
      const r = report(packDir);
      process.exitCode = r.ok ? 0 : 1;
      return;
    }
    case "init": {
      if (!positional[0]) throw new Error("usage: pack:init <dir> [--id x --name x --short-name x --community x --domain x --label x --modes a,b --contact x]");
      init(positional[0], named);
      return;
    }
    case "list":
      list(positional[0]);
      return;
    case "install":
      if (!positional[0] && process.env.COMMUNITY_PACKS_DIR) await installServed(named["no-embed"] !== true);
      else await install(packDir, named["no-embed"] !== true);
      return;
    case "export": {
      if (!positional[0]) throw new Error("usage: pack:export <outDir> [packDir]");
      await exportPack(positional[0], positional[1] ?? process.env.COMMUNITY_PACK_DIR ?? DEFAULT_PACK_DIR);
      return;
    }
    default:
      console.log("usage: pack:validate [dir] | pack:list [packsDir] | pack:init <dir> | pack:install [dir] [--no-embed] | pack:export <outDir> [packDir]");
      process.exitCode = cmd ? 1 : 0;
  }
}

main()
  .catch((err) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => pool.end().catch(() => {}));
