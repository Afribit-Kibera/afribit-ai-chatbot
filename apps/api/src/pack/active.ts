import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegistry, loadRegistry, optionsFromEnv, type PackRegistry } from "./registry.js";
import type { CommunityPack } from "./types.js";

/**
 * The packs this server runs and which one the current request is for.
 *
 * Start-up loads the registry (see registry.ts for COMMUNITY_PACK_DIR / COMMUNITY_PACKS_DIR); a broken
 * pack stops the server with every problem listed, rather than serving a half-configured assistant.
 * With nothing configured the bundled Kibera pack is the only pack, which is what the live service has
 * always run.
 *
 * getPack() is the one question the rest of the code asks. It answers with the pack bound to the
 * current async context (runWithPack, set per request by routes/pack.ts), else the default pack, so a
 * single-pack server behaves as it always did and no function needs a pack parameter threaded through it.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/pack and apps/api/dist/pack are the same depth below the repo root.
export const DEFAULT_PACK_DIR = path.resolve(here, "..", "..", "..", "..", "packs", "kibera-bitcoin");

let registry: PackRegistry | null = null;
const scope = new AsyncLocalStorage<CommunityPack>();

export function getRegistry(): PackRegistry {
  if (registry) return registry;
  const opts = optionsFromEnv(process.env, DEFAULT_PACK_DIR);
  const report = opts.errors.length > 0 ? { ok: false, errors: opts.errors, warnings: [] as string[], registry: undefined } : loadRegistry(opts);
  if (!report.ok || !report.registry) {
    const where = opts.packsDir ?? opts.packDir;
    throw new Error(`Community pack${opts.packsDir ? "s" : ""} at ${where ?? "(not set)"} ${opts.packsDir ? "are" : "is"} not valid:\n${report.errors.map((e) => `  - ${e}`).join("\n")}\nRun: pnpm pack:list  (or pnpm pack:validate <dir>)`);
  }
  registry = report.registry;
  return registry;
}

/** The pack the current request is for (see runWithPack), else the default pack. */
export function getPack(): CommunityPack {
  return scope.getStore() ?? getRegistry().default;
}

/** Runs fn, and everything it awaits, with `pack` as the answer to getPack(). */
export function runWithPack<T>(pack: CommunityPack, fn: () => T): T {
  return scope.run(pack, fn);
}

/** For tests and CLIs: serve exactly these packs (or reset with null). */
export function setRegistry(r: PackRegistry | null): void {
  registry = r;
}

/** For tests: run code against another single pack without touching the process-wide one. */
export function setActivePack(pack: CommunityPack | null): void {
  registry = pack ? (buildRegistry([pack]).registry ?? null) : null;
}
