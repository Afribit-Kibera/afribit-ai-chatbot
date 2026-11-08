import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isUuid } from "../pilot/rules.js";
import { parseInviteInput } from "../auth/invitations.js";
import { invitationStore, type InvitationStore } from "../auth/invitationStore.js";

/**
 * Administrators create, list and revoke invitations (docs/features/F-012-invitation-only-accounts.md).
 * Admin by token AND by the database's current role. The code is in the create response once; the list
 * never contains codes (only their hashes are stored).
 */
export function registerInvitationRoutes(app: FastifyInstance, store: InvitationStore = invitationStore): void {
  const admin = {
    preHandler: [
      app.requireAdmin,
      async (req: FastifyRequest, reply: FastifyReply) => {
        if ((await store.currentRole(req.user.id)) !== "admin") return reply.status(403).send({ error: "Admin access required" });
      },
    ],
  };

  app.post("/api/v1/admin/invitations", admin, async (request, reply) => {
    const input = parseInviteInput(request.body);
    if (!input.ok) return reply.status(400).send({ error: input.error });
    const created = await store.create({ role: input.role, note: input.note, days: input.days, createdBy: request.user.id });
    return reply.status(201).send({ ...created, role: input.role, note: input.note });
  });

  app.get<{ Querystring: { limit?: string } }>("/api/v1/admin/invitations", admin, async (request, reply) => {
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit ?? "50", 10) || 50, 1), 200);
    return reply.send({ invitations: await store.list(limit) });
  });

  app.post<{ Params: { id: string } }>("/api/v1/admin/invitations/:id/revoke", admin, async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.status(404).send({ error: "Invitation not found" });
    const revoked = await store.revoke(request.params.id, request.user.id);
    if (!revoked) return reply.status(409).send({ error: "Only an unused, unrevoked invitation can be revoked" });
    return reply.send({ revoked: true });
  });
}
