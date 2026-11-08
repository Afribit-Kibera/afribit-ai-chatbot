import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { isPasswordAcceptable, hashPassword } from "../auth/passwords.js";
import { getPack, getRegistry } from "../pack/active.js";
import { isUuid } from "../pilot/rules.js";
import { communityStore } from "../community/store.js";

export function registerCommunityRoutes(app: FastifyInstance) {
  const strictOptional = async (request: Parameters<typeof app.optionalAuth>[0], reply: Parameters<typeof app.optionalAuth>[1]) => {
    if (request.headers.authorization) await app.requireAuth(request, reply);
  };
  const admin = { preHandler: [app.requireAuth, async (req: Parameters<typeof app.requireAuth>[0]) => communityStore.requireAdmin(req.user.id)] };
  app.get("/api/v1/community/access", { preHandler: strictOptional }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return communityStore.state(getPack().id, req.user?.id ?? null);
  });
  app.put<{ Body: { membersOnly?: unknown } }>("/api/v1/admin/community/access", admin, async (req, reply) => {
    if (typeof req.body?.membersOnly !== "boolean") return reply.status(400).send({ error: "membersOnly must be a boolean" });
    await communityStore.setPolicy(getPack().id, req.body.membersOnly, req.user.id);
    return { membersOnly: req.body.membersOnly };
  });
  app.post("/api/v1/admin/community/invitations", admin, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return reply.status(201).send(await communityStore.invite(getPack().id, req.user.id));
  });
  app.delete<{ Params: { userId: string } }>("/api/v1/admin/community/members/:userId", admin, async (req, reply) => {
    if (isUuid(req.params.userId)) await communityStore.revoke(getPack().id, req.params.userId, req.user.id);
    return reply.status(204).send();
  });
  app.delete<{ Params: { id: string } }>("/api/v1/admin/community/invitations/:id", admin, async (req, reply) => {
    if (isUuid(req.params.id)) await communityStore.revokeInvite(getPack().id,req.params.id,req.user.id);
    return reply.status(204).send();
  });
  app.post<{ Body: { invitationCode?: unknown } }>("/api/v1/community/join", { preHandler: app.requireAuth, config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (req, reply) => {
    const code = req.body?.invitationCode;
    if (typeof code !== "string" || code.length > 100) return reply.status(400).send({ error: "A community invitation is required" });
    await communityStore.redeem(getPack().id, code, { userId: req.user.id });
    return { joined: true };
  });
  app.post<{ Body: { email?: unknown; password?: unknown; displayName?: unknown; invitationCode?: unknown } }>("/api/v1/member/register", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (env.registration === "closed") return reply.status(403).send({ error: "Account registration is closed" });
    const { email, password, displayName, invitationCode } = req.body ?? {};
    if (typeof email !== "string" || !email.includes("@") || email.length > 254 || typeof password !== "string" || !isPasswordAcceptable(password)
      || typeof invitationCode !== "string" || invitationCode.length > 100) return reply.status(400).send({ error: "Email, a password of at least 10 characters and a community invitation are required" });
    const user = await communityStore.redeem(getPack().id, invitationCode, { email: email.trim().toLowerCase(), passwordHash: await hashPassword(password), displayName: typeof displayName === "string" ? displayName.trim().slice(0,100) || null : null });
    return reply.status(201).send({ token: app.jwt.sign(user, { expiresIn: "30d" }), role: user.role });
  });
  app.get("/api/v1/me/conversations", { preHandler: app.requireAuth }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    await communityStore.requireAccess(getPack().id, req.user.id);
    const { rows } = await pool.query<{ id: string; title: string | null; last_message_at: Date; study_notebook_id:string|null }>(`SELECT s.id,s.last_message_at,s.study_notebook_id,
      (SELECT left(m.content,80) FROM chat_messages m WHERE m.session_id=s.id AND m.role='user' AND m.content_deleted_at IS NULL AND m.content<>'' ORDER BY m.created_at,m.id LIMIT 1) AS title
      FROM chat_sessions s WHERE s.user_id=$1 AND COALESCE(s.pack_id,$3)=$2 ORDER BY s.last_message_at DESC,s.id LIMIT 30`, [req.user.id,getPack().id,getRegistry().default.id]);
    return { conversations: rows.map((r) => ({ sessionId: r.id, notebookId:r.study_notebook_id, title: r.title ?? "Conversation", updatedAt: r.last_message_at.getTime() })) };
  });
}
