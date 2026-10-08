import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

export interface AuthedUser {
  id: string;
  role: "contributor" | "reviewer" | "admin";
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthedUser;
    user: AuthedUser;
  }
}

/**
 * Three auth levels, used across routes/knowledge.ts, routes/microtasks.ts,
 * and routes/notifications.ts:
 * - requireAuth: any signed-in user (contributor or admin). Microtasks.
 * - requireAdmin: role='admin' only. Knowledge management.
 * - requireReviewer: role 'reviewer' or 'admin'. The review workflow for knowledge cards.
 * - optionalAuth: verifies a token if present, but never rejects the
 *   request if absent/invalid -- for routes that stay usable anonymously
 *   but should use the real user id when one is available (fixes
 *   notifications.ts's Vuln 2: an unverified client-supplied header was
 *   trusted at face value; a verified JWT, when present, replaces that
 *   trust instead of just adding a warning comment next to it).
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: env.jwtSecret });

  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Authentication required" });
    }
  });

  app.decorate("requireAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Authentication required" });
    }
    if (request.user.role !== "admin") {
      return reply.status(403).send({ error: "Admin access required" });
    }
  });

  app.decorate("requireReviewer", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Authentication required" });
    }
    if (request.user.role !== "admin" && request.user.role !== "reviewer") {
      return reply.status(403).send({ error: "Reviewer access required" });
    }
  });

  app.decorate("optionalAuth", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      // No token, or an invalid one -- proceed unauthenticated. Never
      // reject here; that's the whole point of "optional".
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireReviewer: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
