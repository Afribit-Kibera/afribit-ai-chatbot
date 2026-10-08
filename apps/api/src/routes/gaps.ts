import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPack } from "../pack/active.js";
import { isUuid } from "../pilot/rules.js";
import { MIN_SHOWN, parseDecision, summarise } from "../gaps/rules.js";
import { GapError, gapStore, type GapStore } from "../gaps/store.js";

/**
 * The gap list (docs/features/F-004-gap-list.md). Reviewers and administrators only (token AND database role).
 * - GET /api/v1/gaps?days=7|30|90: topics with MIN_SHOWN or more questions; smaller ones only as a sum.
 * - POST /api/v1/gaps/:id/decide {status, cardId?, note?}: card written / out of scope / reopen. Audited.
 */
export function registerGapRoutes(app: FastifyInstance, store: GapStore = gapStore): void {
  const reviewer = {
    preHandler: [
      app.requireReviewer,
      async (req: FastifyRequest, reply: FastifyReply) => {
        const role = await store.currentRole(req.user.id);
        if (role !== "reviewer" && role !== "admin") return reply.status(403).send({ error: "Reviewer access required" });
      },
    ],
  };

  app.get<{ Querystring: { days?: string } }>("/api/v1/gaps", reviewer, async (request, reply) => {
    const days = [7, 30, 90].includes(Number(request.query.days)) ? Number(request.query.days) : 30;
    const rows = await store.rows({ packId: getPack().id, days });
    return reply.send({ days, minShown: MIN_SHOWN, ...summarise(rows) });
  });

  app.post<{ Params: { id: string } }>("/api/v1/gaps/:id/decide", reviewer, async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.status(404).send({ error: "Topic not found" });
    const d = parseDecision(request.body);
    if (!d.ok) return reply.status(400).send({ error: d.error });
    try {
      return reply.send(await store.decide({ id: request.params.id, packId: getPack().id, actor: request.user.id, status: d.status, cardId: d.cardId, note: d.note }));
    } catch (err) {
      if (err instanceof GapError) return reply.status(err.status).send({ error: err.message });
      throw err;
    }
  });
}
