import type { PackRegistry } from "./registry.js";
import type { CommunityPack } from "./types.js";

/**
 * Which pack a request is for: the `x-pack` header, else the `pack` query parameter, else the server's
 * default. No database and no Fastify here, so it is unit-tested directly (registryCases.ts).
 */

export type PackSelection =
  | { ok: true; pack: CommunityPack; /** True when the request named a pack (so a session pinned to another pack is a conflict). */ explicit: boolean }
  | { ok: false; status: 400 | 404; error: string; packs: string[] };

function one(v: unknown): string | undefined {
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === "string" && first.trim() ? first.trim() : undefined;
}

export function selectPack(registry: PackRegistry, headers: Record<string, unknown>, query: Record<string, unknown> | undefined): PackSelection {
  const ids = registry.packs.map((p) => p.id);
  const fromHeader = one(headers["x-pack"]);
  const fromQuery = one(query?.pack);
  if (fromHeader && fromQuery && fromHeader !== fromQuery) {
    return { ok: false, status: 400, error: "The x-pack header and the pack query parameter name different packs; send one", packs: ids };
  }
  const wanted = fromHeader ?? fromQuery;
  if (wanted === undefined) return { ok: true, pack: registry.default, explicit: false };
  // Keep the echoed id short and plain: it goes back into an error message.
  const pack = wanted.length <= 64 ? registry.get(wanted) : undefined;
  if (!pack) return { ok: false, status: 404, error: `Unknown pack "${wanted.slice(0, 64).replace(/[^\w.-]/g, "?")}". This server serves: ${ids.join(", ")}`, packs: ids };
  return { ok: true, pack, explicit: true };
}
