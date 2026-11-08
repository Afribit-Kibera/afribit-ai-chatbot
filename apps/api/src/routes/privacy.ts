import type { FastifyInstance } from "fastify";
import { isUuid } from "../pilot/rules.js";
import { PrivacyError, privacyStore, type PrivacyStore } from "../privacy/store.js";
import { actorOf } from "../chat/access.js";

/**
 * Deleting your data (docs/features/F-002-privacy-settings.md).
 *
 * - Single/bulk deletion requires account ownership or a guest capability. Always answer 204, whether
 *   the conversation was missing, inaccessible or deleted, without exposing another member's IDs.
 * - DELETE /api/v1/me/conversations and DELETE /api/v1/me: signed in; the account comes from the verified
 *   token only, never from the request body.
 */
export const MAX_BULK_DELETE = 50;

export function registerPrivacyRoutes(app: FastifyInstance, store: PrivacyStore = privacyStore): void {
  const limit = { rateLimit: { max: 30, timeWindow: "1 minute" } };

  app.delete<{ Params: { sessionId: string } }>("/api/v1/chat/:sessionId", { config: limit, preHandler: app.optionalAuth }, async (request, reply) => {
    const id = request.params.sessionId;
    if (isUuid(id)) await store.deleteSessions([id], actorOf(request));
    return reply.status(204).send();
  });

  app.post<{ Body: { sessionIds?: unknown; sessionTokens?: unknown } }>("/api/v1/chat/delete", { config: limit, preHandler: app.optionalAuth }, async (request, reply) => {
    const ids = request.body?.sessionIds;
    if (!Array.isArray(ids)) return reply.status(400).send({ error: "sessionIds must be a list" });
    if (ids.length > MAX_BULK_DELETE) return reply.status(400).send({ error: `At most ${MAX_BULK_DELETE} conversations at a time` });
    const valid = [...new Set(ids.filter((v): v is string => typeof v === "string" && isUuid(v)))];
    const supplied = request.body?.sessionTokens;
    const tokens = supplied && typeof supplied === "object" && !Array.isArray(supplied) ? supplied as Record<string, unknown> : {};
    const guestTokens = Object.fromEntries(valid.filter((id) => typeof tokens[id] === "string").map((id) => [id, tokens[id] as string]));
    await store.deleteSessions(valid, actorOf(request), guestTokens);
    return reply.status(204).send();
  });

  app.delete("/api/v1/me/conversations", { preHandler: app.requireAuth, config: limit }, async (request, reply) => {
    const deleted = await store.deleteUserConversations(request.user.id);
    return reply.send({ deleted });
  });

  app.delete<{ Body: { contributions?: unknown } }>("/api/v1/me", { preHandler: app.requireAuth, config: limit }, async (request, reply) => {
    const choice = request.body?.contributions ?? "keep";
    if (choice !== "keep" && choice !== "delete") return reply.status(400).send({ error: 'contributions must be "keep" or "delete"' });
    try {
      const result = await store.deleteAccount(request.user.id, choice);
      return reply.send({ deleted: true, ...result });
    } catch (err) {
      if (err instanceof PrivacyError) return reply.status(err.status).send({ error: err.message });
      throw err;
    }
  });
}
