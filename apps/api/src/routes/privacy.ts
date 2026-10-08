import type { FastifyInstance } from "fastify";
import { isUuid } from "../pilot/rules.js";
import { PrivacyError, privacyStore, type PrivacyStore } from "../privacy/store.js";

/**
 * Deleting your data (docs/features/F-002-privacy-settings.md).
 *
 * - DELETE /api/v1/chat/:sessionId and POST /api/v1/chat/delete: holding a conversation's id is the
 *   permission, exactly as reading it is. Both always answer 204, whether the id existed or not, so they
 *   reveal nothing.
 * - DELETE /api/v1/me/conversations and DELETE /api/v1/me: signed in; the account comes from the verified
 *   token only, never from the request body.
 */
export const MAX_BULK_DELETE = 50;

export function registerPrivacyRoutes(app: FastifyInstance, store: PrivacyStore = privacyStore): void {
  const limit = { rateLimit: { max: 30, timeWindow: "1 minute" } };

  app.delete<{ Params: { sessionId: string } }>("/api/v1/chat/:sessionId", { config: limit }, async (request, reply) => {
    const id = request.params.sessionId;
    if (isUuid(id)) await store.deleteSessions([id]);
    return reply.status(204).send();
  });

  app.post<{ Body: { sessionIds?: unknown } }>("/api/v1/chat/delete", { config: limit }, async (request, reply) => {
    const ids = request.body?.sessionIds;
    if (!Array.isArray(ids)) return reply.status(400).send({ error: "sessionIds must be a list" });
    if (ids.length > MAX_BULK_DELETE) return reply.status(400).send({ error: `At most ${MAX_BULK_DELETE} conversations at a time` });
    const valid = [...new Set(ids.filter((v): v is string => typeof v === "string" && isUuid(v)))];
    await store.deleteSessions(valid);
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
