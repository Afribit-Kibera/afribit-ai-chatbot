import fs from "node:fs";
import path from "node:path";
import { loadPack } from "./load.js";
import { overridesDirFromEnv } from "./overrides.js";
import type { CommunityPack } from "./types.js";

/**
 * The set of community packs one server process serves (ADR 0014). Pure functions over pack folders
 * and loaded packs, so it can be tested without a database or a running server.
 *
 *   COMMUNITY_PACK_DIR=<dir>      one pack, exactly as before (unset: the bundled Kibera pack)
 *   COMMUNITY_PACKS_DIR=<dir>     a folder whose subfolders are packs; each one with a pack.json is served (wins if COMMUNITY_PACK_DIR is also set)
 *   COMMUNITY_PACKS=a,b           optional: serve only these pack ids from COMMUNITY_PACKS_DIR
 *   DEFAULT_PACK=<id>             the pack a request gets when it names none (default: kibera-bitcoin if served, else the first by id)
 *   COMMUNITY_PACK_OVERRIDES_DIR  optional live wording edits that replace files of a pack (overrides.ts); unset: none
 *
 * Starting with any served pack invalid, two packs sharing an id, a retrieval domain or a card id, or
 * an unknown id in COMMUNITY_PACKS is an error that lists every problem.
 */

export interface PackRegistry {
  /** Served packs, sorted by id. */
  packs: CommunityPack[];
  default: CommunityPack;
  get(id: string): CommunityPack | undefined;
}

export interface RegistryReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  registry?: PackRegistry;
}

export interface RegistryOptions {
  /** Single-pack mode. */
  packDir?: string;
  /** Multi-pack mode: a folder of pack folders. */
  packsDir?: string;
  /** Multi-pack mode: serve only these ids. */
  only?: string[];
  defaultId?: string;
  /** Live wording edits (overrides.ts). Unset: the packs exactly as they are on disk. */
  overridesDir?: string;
}

/** What a server with nothing configured serves; the live Kibera service has always run this. */
export const PREFERRED_DEFAULT_PACK = "kibera-bitcoin";

export function optionsFromEnv(source: NodeJS.ProcessEnv, bundledPackDir: string): RegistryOptions & { errors: string[] } {
  const errors: string[] = [];
  const packsDir = source.COMMUNITY_PACKS_DIR?.trim();
  const packDir = source.COMMUNITY_PACK_DIR?.trim();
  const only = (source.COMMUNITY_PACKS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const defaultId = source.DEFAULT_PACK?.trim() || undefined;
  const overridesDir = overridesDirFromEnv(source);
  if (packsDir) return { packsDir: path.resolve(packsDir), only, defaultId, overridesDir, errors };
  return { packDir: path.resolve(packDir || bundledPackDir), overridesDir, errors };
}

/** Subfolders of a packs directory that hold a pack.json, sorted by name. */
export function listPackDirs(packsDir: string): string[] {
  if (!fs.existsSync(packsDir) || !fs.statSync(packsDir).isDirectory()) return [];
  return fs
    .readdirSync(packsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(packsDir, d.name, "pack.json")))
    .map((d) => path.join(packsDir, d.name))
    .sort();
}

/** The id a pack folder declares, without loading it (so COMMUNITY_PACKS can skip folders it was not asked for). */
function peekId(dir: string): string {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "pack.json"), "utf8")) as { id?: unknown };
    if (typeof manifest.id === "string" && manifest.id) return manifest.id;
  } catch {
    // an unreadable manifest is reported by loadPack
  }
  return path.basename(dir);
}

/** Checks a set of already loaded packs against each other and builds the registry. */
export function buildRegistry(loaded: CommunityPack[], defaultId?: string): RegistryReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (loaded.length === 0) return { ok: false, errors: ["no community pack to serve"], warnings };
  const packs = [...loaded].sort((a, b) => a.id.localeCompare(b.id));

  const byId = new Map<string, CommunityPack>();
  const domainOwner = new Map<string, string>();
  const cardOwner = new Map<string, string>();
  const topicOwner = new Map<string, string>();
  for (const p of packs) {
    const same = byId.get(p.id);
    if (same) errors.push(`two packs have the id "${p.id}" (${same.dir} and ${p.dir}); every served pack needs its own id`);
    else byId.set(p.id, p);
    for (const d of p.domain.retrievalDomains) {
      const owner = domainOwner.get(d);
      if (owner && owner !== p.id) errors.push(`packs "${owner}" and "${p.id}" both search the retrieval domain "${d}"; they would see each other's knowledge. Give each pack its own domain`);
      else domainOwner.set(d, p.id);
    }
    // knowledge_entries and knowledge_topics are keyed by id alone, so installing two packs with the same id would overwrite one.
    for (const c of p.knowledge.entries) {
      const owner = cardOwner.get(c.id);
      if (owner && owner !== p.id) errors.push(`card id "${c.id}" is in both "${owner}" and "${p.id}"; card ids must be unique across served packs`);
      else cardOwner.set(c.id, p.id);
    }
    for (const t of p.knowledge.topics) {
      const owner = topicOwner.get(t.id);
      if (owner && owner !== p.id) errors.push(`topic id "${t.id}" is in both "${owner}" and "${p.id}"; topic ids must be unique across served packs`);
      else topicOwner.set(t.id, p.id);
    }
  }

  let def: CommunityPack | undefined;
  if (defaultId) {
    def = byId.get(defaultId);
    if (!def) errors.push(`DEFAULT_PACK "${defaultId}" is not a served pack (serving: ${packs.map((p) => p.id).join(", ")})`);
  } else def = byId.get(PREFERRED_DEFAULT_PACK) ?? packs[0];
  if (errors.length > 0 || !def) return { ok: false, errors, warnings };
  if (packs.length > 1 && !defaultId && def.id !== PREFERRED_DEFAULT_PACK) warnings.push(`no DEFAULT_PACK set; requests that name no pack get "${def.id}"`);

  return { ok: true, errors, warnings, registry: { packs, default: def, get: (id) => byId.get(id) } };
}

/** Loads every pack the options ask for and builds the registry. Never throws; problems come back listed. */
export function loadRegistry(opts: RegistryOptions): RegistryReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const loaded: CommunityPack[] = [];
  const take = (dir: string): void => {
    let r = loadPack(dir, { overridesDir: opts.overridesDir });
    // A hand-edited override must never stop the service from starting: fall back to the reviewed pack and say so.
    if (!r.ok && r.overridden.length > 0) {
      const base = loadPack(dir);
      if (base.ok) {
        warnings.push(`${path.basename(dir)}: the overrides in ${opts.overridesDir} make this pack invalid, so they are IGNORED and the reviewed pack is served (${r.errors.join("; ")})`);
        r = base;
      }
    }
    warnings.push(...r.warnings.map((w) => `${path.basename(dir)}: ${w}`));
    if (r.ok && r.pack) loaded.push(r.pack);
    else errors.push(...r.errors.map((e) => `${path.basename(dir)}: ${e}`));
  };

  if (opts.packsDir) {
    const dirs = listPackDirs(opts.packsDir);
    if (dirs.length === 0) return { ok: false, errors: [`COMMUNITY_PACKS_DIR ${opts.packsDir} has no subfolder containing a pack.json`], warnings };
    const only = opts.only ?? [];
    const known = dirs.map(peekId);
    for (const id of only) if (!known.includes(id)) errors.push(`COMMUNITY_PACKS names "${id}", which is not in ${opts.packsDir} (found: ${known.join(", ")})`);
    for (const dir of dirs) if (only.length === 0 || only.includes(peekId(dir))) take(dir);
  } else if (opts.packDir) take(opts.packDir);
  else errors.push("no pack directory configured");

  if (errors.length > 0) return { ok: false, errors, warnings };
  const built = buildRegistry(loaded, opts.defaultId);
  return { ...built, warnings: [...warnings, ...built.warnings] };
}

export interface ReloadReport {
  /** True when every pack asked for was re-read and is valid. */
  ok: boolean;
  /** Problems per pack id that was NOT swapped; the old version keeps serving it. */
  errors: Record<string, string[]>;
  warnings: string[];
  /** Ids that now serve the freshly read version. */
  reloaded: string[];
  /** The registry to serve from now on (the same object when nothing changed). */
  registry: PackRegistry;
}

/**
 * Re-reads packs from disk (their folder plus the overrides folder) and returns a registry that serves
 * the new versions. A pack that no longer validates, or that would clash with another served pack,
 * is left as it was and its problems are returned; nothing is half-applied. Pure: the caller swaps
 * the result in (active.ts setRegistry), and requests already running keep the pack they started with.
 */
export function reloadRegistry(current: PackRegistry, overridesDir: string | undefined, ids?: string[]): ReloadReport {
  const errors: Record<string, string[]> = {};
  const warnings: string[] = [];
  const targets = current.packs.filter((p) => !ids || ids.includes(p.id));
  for (const id of ids ?? []) if (!current.get(id)) errors[id] = [`"${id}" is not a served pack`];
  const fresh = new Map<string, CommunityPack>();
  for (const p of targets) {
    const r = loadPack(p.dir, { overridesDir });
    warnings.push(...r.warnings.map((w) => `${p.id}: ${w}`));
    if (!r.ok || !r.pack) errors[p.id] = r.errors;
    else if (r.pack.id !== p.id) errors[p.id] = [`pack.json now declares id "${r.pack.id}", not "${p.id}"; restart the server to change a pack's id`];
    else fresh.set(p.id, r.pack);
  }
  if (fresh.size === 0) return { ok: Object.keys(errors).length === 0, errors, warnings, reloaded: [], registry: current };
  const built = buildRegistry(
    current.packs.map((p) => fresh.get(p.id) ?? p),
    current.default.id,
  );
  if (!built.ok || !built.registry) {
    for (const id of fresh.keys()) errors[id] = built.errors;
    return { ok: false, errors, warnings, reloaded: [], registry: current };
  }
  return { ok: Object.keys(errors).length === 0, errors, warnings, reloaded: [...fresh.keys()], registry: built.registry };
}
