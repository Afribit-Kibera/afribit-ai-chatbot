import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPack, getRegistry } from "../pack/active.js";
import { checkResolve, dailyCsv, isUuid, parseWhole, TtlCache } from "../pilot/rules.js";
import { parseSourceFilter } from "../pilot/source.js";
import { PilotError, pilotStore, type PilotStore } from "../pilot/store.js";
import type { PilotStats } from "../pilot/stats.js";

/**
 * The pilot console: live numbers for the people running the pilot, the queue of answers learners
 * reported, the team list, and the small web page that uses them (apps/api/public/pilot: plain files, no
 * build, no inline script, so it works under a strict Content-Security-Policy). Guide:
 * docs/guides/pilot-console-guide.md.
 *
 * Privacy, in one place:
 *   - Stats and the export are aggregates. Question and answer text appears ONLY in /api/v1/pilot/queue,
 *     only for reviewer and admin roles, and never in the export.
 *   - The export (admin) hides every count under 5 (rules.ts).
 *   - Anonymous chat has no identity; `source` is a channel label from a link, not a person.
 *
 * Roles are checked twice: the token must say reviewer/admin, and the database must still agree, so
 * demoting someone takes effect on the console straight away, not when their token expires.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/routes and apps/api/dist/routes are the same depth below apps/api.
const publicDir = path.resolve(here, "..", "..", "public", "pilot");

function page(file: string): string {
  return readFileSync(path.join(publicDir, file), "utf8").replaceAll("{{PACK_NAME}}", getPack().name.replace(/[<>&"]/g, ""));
}

export const STATS_CACHE_MS = 30_000;

export function registerPilotRoutes(app: FastifyInstance, store: PilotStore = pilotStore, now: () => number = Date.now): void {
  const staticHeaders = (reply: FastifyReply, type: string) =>
    reply
      .header("content-type", type)
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

  app.get("/pilot", async (_req, reply) => staticHeaders(reply, "text/html; charset=utf-8").send(page("index.html")));
  app.get("/pilot/app.js", async (_req, reply) => staticHeaders(reply, "text/javascript; charset=utf-8").send(page("app.js")));
  app.get("/pilot/qr.js", async (_req, reply) => staticHeaders(reply, "text/javascript; charset=utf-8").send(page("qr.js")));
  app.get("/pilot/style.css", async (_req, reply) => staticHeaders(reply, "text/css; charset=utf-8").send(page("style.css")));

  /** Token check, then a check that the database still gives this person the role. */
  const guard = (level: "reviewer" | "admin") => {
    const fromToken = level === "admin" ? app.requireAdmin : app.requireReviewer;
    return {
      preHandler: [
        fromToken,
        async (req: FastifyRequest, reply: FastifyReply) => {
          const role = await store.currentRole(req.user.id);
          const allowed = level === "admin" ? role === "admin" : role === "admin" || role === "reviewer";
          if (!allowed) return reply.status(403).send({ error: level === "admin" ? "Admin access required" : "Reviewer access required" });
        },
      ],
    };
  };
  const reviewer = guard("reviewer");
  const admin = guard("admin");

  const scope = () => ({ packId: getPack().id, defaultPackId: getRegistry().default.id });
  const bad = (reply: FastifyReply, error: string) => reply.status(400).send({ error });
  const fail = (reply: FastifyReply, err: unknown) => {
    if (err instanceof PilotError) return reply.status(err.httpStatus).send({ error: err.message });
    throw err;
  };

  // ── Numbers ───────────────────────────────────────────────────────────────────────────────────
  const statsCache = new TtlCache<PilotStats>(STATS_CACHE_MS, now);

  app.get<{ Querystring: { days?: string; source?: string } }>("/api/v1/pilot/stats", reviewer, async (req, reply) => {
    const days = parseWhole(req.query.days, 7);
    if (days === null) return bad(reply, "days must be a whole number from 1 to 365");
    const sourceParam = req.query.source;
    const source = sourceParam === undefined || sourceParam === "" ? null : parseSourceFilter(sourceParam);
    if (sourceParam !== undefined && sourceParam !== "" && source === null) return bad(reply, "source must be a channel label like kibera-hub, or _none");
    const s = scope();
    const key = `${s.packId}|${days}|${source ?? ""}`;
    let stats = statsCache.get(key);
    if (!stats) {
      stats = await store.stats({ days, source, ...s });
      statsCache.set(key, stats);
    }
    return reply.header("cache-control", "no-store").send(stats);
  });

  app.get<{ Querystring: { days?: string } }>("/api/v1/pilot/export.csv", admin, async (req, reply) => {
    const days = parseWhole(req.query.days, 30);
    if (days === null) return bad(reply, "days must be a whole number from 1 to 365");
    const s = scope();
    const csv = dailyCsv(await store.daily({ days, ...s }));
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="pilot-daily-${s.packId}-${days}d.csv"`)
      .header("cache-control", "no-store")
      .header("x-content-type-options", "nosniff")
      .send(csv);
  });

  // ── The answer review queue ───────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { state?: string; limit?: string } }>("/api/v1/pilot/queue", reviewer, async (req, reply) => {
    const state = req.query.state ?? "open";
    if (state !== "open" && state !== "resolved") return bad(reply, "state must be open or resolved");
    const limit = parseWhole(req.query.limit, 25, 100);
    if (limit === null) return bad(reply, "limit must be a whole number from 1 to 100");
    return reply.header("cache-control", "no-store").send(await store.queue({ state, limit, ...scope() }));
  });

  app.post<{ Params: { feedbackId: string }; Body: { resolution?: unknown; note?: unknown } }>("/api/v1/pilot/queue/:feedbackId/resolve", reviewer, async (req, reply) => {
    if (!isUuid(req.params.feedbackId)) return reply.status(404).send({ error: "No such report" });
    const checked = checkResolve(req.body);
    if (!checked.ok) return bad(reply, checked.error);
    try {
      const item = await store.resolve({ feedbackId: req.params.feedbackId, actorId: req.user.id, resolution: checked.resolution, note: checked.note, ...scope() });
      statsCache.clear(); // the open/resolved numbers just changed
      return { item };
    } catch (err) {
      return fail(reply, err);
    }
  });

  // ── Team (admin) ──────────────────────────────────────────────────────────────────────────────
  app.get<{ Querystring: { q?: string; limit?: string; offset?: string } }>("/api/v1/admin/users", admin, async (req, reply) => {
    const limit = parseWhole(req.query.limit, 25, 100);
    if (limit === null) return bad(reply, "limit must be a whole number from 1 to 100");
    const offsetRaw = req.query.offset;
    const offset = offsetRaw === undefined || offsetRaw === "" ? 0 : /^\d{1,6}$/.test(offsetRaw) ? Number(offsetRaw) : -1;
    if (offset < 0) return bad(reply, "offset must be a whole number");
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    return reply.header("cache-control", "no-store").send({ ...(await store.listUsers({ q: q || null, limit, offset })), limit, offset });
  });

  app.put<{ Params: { id: string }; Body: { role?: unknown } }>("/api/v1/admin/users/:id/role", admin, async (req, reply) => {
    if (!isUuid(req.params.id)) return reply.status(404).send({ error: "No such team member" });
    try {
      return await store.setRole({ actorId: req.user.id, targetId: req.params.id, role: req.body?.role });
    } catch (err) {
      return fail(reply, err);
    }
  });
}
