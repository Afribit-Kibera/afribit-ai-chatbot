import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPack, getRegistry } from "../pack/active.js";
import { isKnownMode, modeErrorMessage } from "../pack/modes.js";
import { isUuid } from "../pilot/rules.js";
import { detectSecret } from "../safety/secretDetector.js";
import { DECISIONS, parseSuggestion, type Decision } from "../teach/rules.js";
import { TeachError, teachStore, type TeachStore } from "../teach/store.js";
import { actorOf, sessionAccess, SessionAccessError, type SessionAccess } from "../chat/access.js";

/**
 * "Say it your way" (docs/features/F-003-say-it-your-way.md).
 * - POST /api/v1/teach: anyone, no account needed; 5 an hour per address, 3 a day per conversation; a
 *   suggestion containing a secret is refused and not stored.
 * - GET /api/v1/teach/queue and POST /api/v1/teach/:id/decide: reviewers and admins (token AND database
 *   role, so demoting someone takes effect at once). Self-approval and a lone approval of a safety topic
 *   are refused (teach/rules.ts).
 */
export function registerTeachRoutes(app: FastifyInstance, store: TeachStore = teachStore, access: SessionAccess = sessionAccess): void {
  const reviewer = {
    preHandler: [
      app.requireReviewer,
      async (req: FastifyRequest, reply: FastifyReply) => {
        const role = await store.currentRole(req.user.id);
        if (role !== "reviewer" && role !== "admin") return reply.status(403).send({ error: "Reviewer access required" });
      },
    ],
  };
  const fail = (reply: FastifyReply, err: unknown) => {
    if (err instanceof TeachError) return reply.status(err.status).send({ error: err.message });
    throw err;
  };

  app.post("/api/v1/teach", { preHandler: app.optionalAuth, config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    const parsed = parseSuggestion(request.body);
    if (!parsed.ok) return reply.status(400).send({ error: parsed.error });
    const s = parsed.value;
    if (!isKnownMode(s.languageMode)) return reply.status(400).send({ error: modeErrorMessage("languageMode") });
    if ([s.suggestion, s.questionText, s.answerText].some((t) => t && detectSecret(t).detected)) {
      return reply.status(400).send({ error: getPack().prompts.secretWarning, secret: true });
    }
    try {
      const actor = actorOf(request);
      if (s.sessionId) await access.requireSession(s.sessionId, actor, getPack().id);
      if (s.messageId) {
        const session = await access.requireMessage(s.messageId, actor);
        if (s.sessionId && session.id !== s.sessionId) throw new SessionAccessError();
        s.sessionId = session.id;
      }
      const created = await store.create({ ...s, packId: getPack().id, createdBy: (request.user as { id?: string } | undefined)?.id ?? null });
      return reply.status(201).send({ ok: true, id: created.id });
    } catch (err) {
      return fail(reply, err);
    }
  });

  app.get<{ Querystring: { state?: string; limit?: string } }>("/api/v1/teach/queue", reviewer, async (request, reply) => {
    const state = request.query.state === "decided" ? "decided" : "pending";
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit ?? "50", 10) || 50, 1), 200);
    return reply.send(await store.queue({ state, limit, packId: getPack().id, defaultPackId: getRegistry().default.id }));
  });

  app.post<{ Params: { id: string }; Body: { decision?: unknown; text?: unknown; note?: unknown } }>("/api/v1/teach/:id/decide", reviewer, async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.status(404).send({ error: "Suggestion not found" });
    const decision = request.body?.decision;
    if (!(DECISIONS as readonly unknown[]).includes(decision)) return reply.status(400).send({ error: `decision must be one of ${DECISIONS.join(", ")}` });
    const text = typeof request.body?.text === "string" ? request.body.text.trim().slice(0, 1000) : null;
    if (text && detectSecret(text).detected) return reply.status(400).send({ error: "The edited text contains something that looks like a secret" });
    const note = typeof request.body?.note === "string" && request.body.note.trim() ? request.body.note.trim().slice(0, 1000) : null;
    try {
      return reply.send(await store.decide({ id: request.params.id, actor: request.user.id, decision: decision as Decision, text, note, packId: getPack().id, defaultPackId: getRegistry().default.id }));
    } catch (err) {
      return fail(reply, err);
    }
  });
}
