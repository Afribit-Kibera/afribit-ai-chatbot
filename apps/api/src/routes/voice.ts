import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExplanationLevel } from "@afribit/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { getPack } from "../pack/active.js";
import { overridesDirFromEnv } from "../pack/overrides.js";
import {
  describeFiles,
  draftPack,
  historyOf,
  reloadServedPacks,
  restoreVersion,
  revertOverride,
  saveOverride,
  voiceDescriptions,
  VoiceError,
  type VoiceActor,
  type VoiceContext,
} from "../pack/voice.js";
import { LEVELS, PREVIEW_MAX_MESSAGE, previewAnswer, type PreviewInput } from "../pack/voicePreview.js";

/**
 * The Voice Lab: reviewers edit the community pack's wording and try answers straight away, without a
 * code change or a redeploy (docs/guides/voice-guide.md). The rules live in pack/voice.ts; this file is
 * login, audit rows, rate limits and the small web page (apps/api/public/voice, plain files, strict CSP,
 * the same shape as the review page). The React source lives in apps/api/voice and is built into
 * public/voice/dist; the original plain files remain a fallback for an unbuilt development checkout.
 *
 * Switched on by COMMUNITY_PACK_OVERRIDES_DIR. Unset, none of these routes exist.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/routes and apps/api/dist/routes are the same depth below apps/api.
const publicDir = path.resolve(here, "..", "..", "public", "voice");

function page(file: string): string {
  return readFileSync(path.join(publicDir, file), "utf8").replaceAll("{{PACK_NAME}}", getPack().name.replace(/[<>&"]/g, ""));
}

const PREVIEW_PER_MINUTE = 10;
const MAX_DRAFTS = 30;
const MAX_DRAFT_TOTAL = 200 * 1024;

/** Sliding one-minute window per user for the Try-it button, because every press can be a paid model call. */
const previewTimes = new Map<string, number[]>();
function previewAllowed(userId: string, now = Date.now()): boolean {
  const recent = (previewTimes.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= PREVIEW_PER_MINUTE) {
    previewTimes.set(userId, recent);
    return false;
  }
  recent.push(now);
  previewTimes.set(userId, recent);
  if (previewTimes.size > 500) for (const [k, v] of previewTimes) if (v.every((t) => now - t >= 60_000)) previewTimes.delete(k);
  return true;
}

function fail(reply: FastifyReply, err: unknown) {
  if (err instanceof VoiceError) return reply.status(err.httpStatus).send({ error: err.message, ...(err.errors.length > 0 ? { errors: err.errors } : {}) });
  throw err;
}

export function registerVoiceRoutes(app: FastifyInstance, gateway: AfribitAIGateway): void {
  const overridesDir = overridesDirFromEnv(process.env);
  if (!overridesDir) {
    app.log.info("Voice Lab is off (set COMMUNITY_PACK_OVERRIDES_DIR to switch it on)");
    return;
  }
  app.log.info(`Voice Lab is on: wording edits are kept in ${overridesDir}`);

  const staticHeaders = (reply: FastifyReply, type: string) =>
    reply
      .header("content-type", type)
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .header("content-security-policy", "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

  for (const route of ["/voice", "/voice/"]) {
    app.get(route, async (_req, reply) => staticHeaders(reply, "text/html; charset=utf-8")
      .send(page(existsSync(path.join(publicDir, "dist", "index.html")) ? "dist/index.html" : "index.html")));
  }
  app.get<{ Params: { asset: string } }>("/voice/assets/:asset", async (req, reply) => {
    const asset = req.params.asset;
    // A single generated filename, never an arbitrary path or a caller-selected directory.
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(js|css|woff2?|png|svg)$/.test(asset)) return reply.code(404).send();
    const file = path.join(publicDir, "dist", "assets", asset);
    if (!existsSync(file)) return reply.code(404).send();
    const types: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
      ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".svg": "image/svg+xml" };
    return staticHeaders(reply, types[path.extname(asset)]!)
      .header("cache-control", "public, max-age=31536000, immutable").send(readFileSync(file));
  });
  app.get("/voice/app.js", async (_req, reply) => staticHeaders(reply, "text/javascript; charset=utf-8").send(page("app.js")));
  app.get("/voice/style.css", async (_req, reply) => staticHeaders(reply, "text/css; charset=utf-8").send(page("style.css")));

  const auth = { preHandler: app.requireReviewer };
  const actorOf = (req: { user: { id: string; role: string } }): VoiceActor => ({ id: req.user.id, role: req.user.role });
  const contextOf = (actor: VoiceActor): VoiceContext => ({
    pack: getPack(),
    overridesDir,
    // Fail closed: if the audit row cannot be written the change is not made.
    audit: async (entry) => {
      await pool.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, $2, 'pack_file', $3, $4)`, [actor.id, entry.action, entry.path, JSON.stringify(entry.details)]);
    },
  });

  /** Names for user ids, so a history line says who, not a number. */
  async function names(ids: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const clean = [...new Set(ids)].filter((i) => /^[0-9a-f]{32}$/.test(i));
    if (clean.length === 0) return out;
    const dashed = clean.map((i) => `${i.slice(0, 8)}-${i.slice(8, 12)}-${i.slice(12, 16)}-${i.slice(16, 20)}-${i.slice(20)}`);
    try {
      const { rows } = await pool.query<{ id: string; display_name: string | null; email: string }>(`SELECT id, display_name, email FROM users WHERE id = ANY($1::uuid[])`, [dashed]);
      for (const r of rows) out.set(r.id.replaceAll("-", ""), r.display_name?.trim() || r.email.split("@")[0] || "a reviewer");
    } catch {
      // names are a convenience
    }
    return out;
  }

  app.get("/api/v1/voice/files", auth, async (req) => {
    const pack = getPack();
    const actor = actorOf(req);
    const files = describeFiles(pack, overridesDir, actor);
    const who = await names(files.flatMap((f) => (f.lastEdit ? [f.lastEdit.userId] : [])));
    return {
      pack: { id: pack.id, name: pack.name, community: pack.community.name, defaultMode: pack.defaultMode, modes: pack.modes.map((m) => ({ id: m.id, label: m.label })) },
      role: actor.role,
      // The live service uses the full prompt unless the operator set PROMPT_MODE=compact.
      promptMode: env.promptMode,
      chatPipeline: env.chatPipeline,
      groups: voiceDescriptions().groups,
      maxBytes: 20 * 1024,
      levels: LEVELS,
      files: files.map((f) => ({ ...f, lastEdit: f.lastEdit ? { at: f.lastEdit.at, by: who.get(f.lastEdit.userId) ?? "a reviewer" } : null })),
    };
  });

  const rateLimited = { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };

  app.put<{ Body: { path?: unknown; text?: unknown } }>("/api/v1/voice/files", { ...auth, ...rateLimited }, async (req, reply) => {
    try {
      const actor = actorOf(req);
      return await saveOverride(contextOf(actor), actor, req.body?.path, req.body?.text);
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.delete<{ Querystring: { path?: string } }>("/api/v1/voice/files", { ...auth, ...rateLimited }, async (req, reply) => {
    try {
      const actor = actorOf(req);
      return await revertOverride(contextOf(actor), actor, req.query.path);
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.get<{ Querystring: { path?: string } }>("/api/v1/voice/history", auth, async (req, reply) => {
    try {
      const versions = historyOf(contextOf(actorOf(req)), req.query.path);
      const who = await names(versions.map((v) => v.userId));
      return { path: req.query.path, versions: versions.map((v) => ({ id: v.id, at: v.at, by: who.get(v.userId) ?? "a reviewer", removed: v.removed, bytes: v.bytes })) };
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.post<{ Body: { path?: unknown; version?: unknown } }>("/api/v1/voice/restore", { ...auth, ...rateLimited }, async (req, reply) => {
    try {
      const actor = actorOf(req);
      return await restoreVersion(contextOf(actor), actor, req.body?.path, req.body?.version);
    } catch (err) {
      return fail(reply, err);
    }
  });

  // Operator convenience: re-read every pack, e.g. after copying override files into the folder by hand.
  app.post("/api/v1/voice/reload", { preHandler: app.requireAdmin }, async (_req, reply) => {
    const report = reloadServedPacks(overridesDir);
    return reply.status(report.ok ? 200 : 422).send({ ok: report.ok, reloaded: report.reloaded, errors: report.errors });
  });

  app.post<{ Body: { message?: unknown; mode?: unknown; level?: unknown; promptMode?: unknown; drafts?: unknown; compare?: unknown } }>(
    "/api/v1/voice/preview",
    auth,
    async (req, reply) => {
      try {
        const actor = actorOf(req);
        const pack = getPack();
        const body = req.body ?? {};
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (!message) throw new VoiceError(400, "Type a question to try.");
        if (message.length > PREVIEW_MAX_MESSAGE) throw new VoiceError(400, `Keep the question under ${PREVIEW_MAX_MESSAGE} characters.`);
        const mode = typeof body.mode === "string" ? body.mode : pack.defaultMode;
        if (!pack.modes.some((m) => m.id === mode)) throw new VoiceError(400, `mode must be one of: ${pack.modes.map((m) => m.id).join(", ")}`);
        const level = (typeof body.level === "string" ? body.level : "normal") as ExplanationLevel;
        if (!LEVELS.includes(level)) throw new VoiceError(400, `level must be one of: ${LEVELS.join(", ")}`);
        const promptMode = body.promptMode === undefined ? env.promptMode : body.promptMode;
        if (promptMode !== "full" && promptMode !== "compact") throw new VoiceError(400, 'promptMode must be "full" or "compact"');

        const drafts = body.drafts === undefined ? {} : body.drafts;
        if (typeof drafts !== "object" || drafts === null || Array.isArray(drafts)) throw new VoiceError(400, "drafts must be an object of path: text");
        const entries = Object.entries(drafts as Record<string, unknown>);
        if (entries.length > MAX_DRAFTS) throw new VoiceError(400, `At most ${MAX_DRAFTS} drafts at a time.`);
        if (entries.reduce((n, [, t]) => n + (typeof t === "string" ? t.length : 0), 0) > MAX_DRAFT_TOTAL) throw new VoiceError(413, "The drafts are too large.");
        const compare = body.compare === true;

        if (!previewAllowed(actor.id)) return reply.status(429).send({ error: `Slow down: ${PREVIEW_PER_MINUTE} tries a minute is the limit.` });

        const input: PreviewInput = { message, mode, level, promptMode };
        const draft = entries.length > 0 ? draftPack(pack, overridesDir, actor, drafts as Record<string, unknown>) : pack;
        if (!compare) return { ...(await previewAnswer(gateway, draft, input)), saved: null };
        const [mine, saved] = await Promise.all([previewAnswer(gateway, draft, input), previewAnswer(gateway, pack, input)]);
        return { ...mine, saved };
      } catch (err) {
        return fail(reply, err);
      }
    },
  );
}
