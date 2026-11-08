import type { FastifyInstance } from "fastify";
import { getPack } from "../pack/active.js";
import { communityStore } from "./store.js";

const PUBLIC = new Set(["/api/v1/community/access", "/api/v1/community/join", "/api/v1/member/register",
  "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/me", "/api/v1/packs", "/api/v1/pack", "/api/v1/pack/brand/logo"]);

/** Register after pack binding and before protected routes. Policy errors fail closed. */
export function registerCommunityGuard(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0]!;
    if (request.method === "OPTIONS" || !path.startsWith("/api/v1/")) return;
    if (PUBLIC.has(path) || path.startsWith("/api/v1/admin/community/")) return;
    // Erasure remains available after membership revocation; the handlers still check resource ownership.
    if ((request.method === "DELETE" && (path.startsWith("/api/v1/chat/") || path.startsWith("/api/v1/me") || /^\/api\/v1\/notebooks\/[^/]+$/.test(path))) || path === "/api/v1/chat/delete") return;
    if (request.headers.authorization) {
      try { await request.jwtVerify(); }
      catch { return reply.status(401).send({ error: "Authentication required" }); }
    }
    reply.header("Cache-Control", "no-store");
    await communityStore.requireAccess(getPack().id, request.user?.id ?? null);
  });
}
