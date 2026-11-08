import type { FastifyInstance } from "fastify";
import { communityStore } from "../community/store.js";
import { getPack } from "../pack/active.js";
import { isUuid } from "../pilot/rules.js";
import { pool } from "../db/pool.js";
import { memoryStore } from "../memory/store.js";
import { canReview, promotionStore } from "../memory/promotion.js";
import { MemoryError } from "../memory/db.js";
import { localMemoryAvailable } from "../privacy/contextPolicy.js";

export function registerMemoryRoutes(app: FastifyInstance) {
  const auth = { preHandler: app.requireAuth };
  const scope = async (user: string) => { const pack = getPack().id; await communityStore.requireAccess(pack, user); return pack; };
  const uuid = (id: string) => { if (!isUuid(id)) throw new MemoryError(404, "Item not found"); return id; };
  app.get("/api/v1/me/memory", auth, async (req, reply) => {
    reply.header("Cache-Control", "no-store"); const pack = await scope(req.user.id);
    return { ...await memoryStore.list(req.user.id, pack), localAvailable: localMemoryAvailable(), canReview: await canReview(pool, req.user.id, pack) };
  });
  app.patch<{ Body: { enabled: boolean } }>("/api/v1/me/memory", auth, async (req) => {
    await memoryStore.enable(req.user.id, await scope(req.user.id), req.body?.enabled); return { ok: true };
  });
  app.post<{ Body: { content: string; allowRemote?: boolean } }>("/api/v1/me/memory/items", auth, async (req, reply) => {
    const item = await memoryStore.create(req.user.id, await scope(req.user.id), req.body?.content, req.body?.allowRemote ?? false);
    reply.header("Cache-Control", "no-store"); return reply.status(201).send(item);
  });
  app.patch<{ Params: { id: string }; Body: { content: string; allowRemote: boolean; version: number } }>("/api/v1/me/memory/items/:id", auth, async (req, reply) => {
    reply.header("Cache-Control", "no-store"); const pack = await scope(req.user.id); const b = req.body;
    return memoryStore.update(req.user.id, pack, uuid(req.params.id), b?.version, b?.content, b?.allowRemote);
  });
  // Erasure remains possible after membership revocation; ownership and selected pack still apply.
  app.delete("/api/v1/me/memory", auth, async (req, reply) => { await memoryStore.remove(req.user.id, getPack().id); return reply.status(204).send(); });
  app.delete<{ Params: { id: string } }>("/api/v1/me/memory/items/:id", auth, async (req, reply) => { await memoryStore.remove(req.user.id, getPack().id, uuid(req.params.id)); return reply.status(204).send(); });
  app.post<{ Params: { id: string }; Body: { version: number; consentToReview: boolean } }>("/api/v1/me/memory/items/:id/submit", auth, async (req, reply) => {
    const pack = await scope(req.user.id); return reply.status(201).send(await promotionStore.submit(req.user.id, pack, uuid(req.params.id), req.body?.version, req.body?.consentToReview));
  });
  app.get("/api/v1/me/memory/submissions", auth, async (req, reply) => {
    reply.header("Cache-Control", "no-store"); return { submissions: await promotionStore.own(req.user.id, await scope(req.user.id)) };
  });
  app.delete<{ Params: { id: string } }>("/api/v1/me/memory/submissions/:id", auth, async (req, reply) => {
    await promotionStore.withdraw(req.user.id, getPack().id, uuid(req.params.id)); return reply.status(204).send();
  });
  app.get("/api/v1/community/knowledge-submissions", auth, async (req, reply) => {
    reply.header("Cache-Control", "no-store"); return { submissions: await promotionStore.queue(req.user.id, await scope(req.user.id)) };
  });
  app.post<{ Params: { id: string }; Body: { decision: "approve" | "reject" } }>("/api/v1/community/knowledge-submissions/:id/decide", auth, async (req) => {
    return promotionStore.decide(req.user.id, await scope(req.user.id), uuid(req.params.id), req.body?.decision);
  });
}
