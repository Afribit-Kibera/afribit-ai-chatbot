import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { hashPassword, verifyPassword, isPasswordAcceptable } from "../auth/passwords.js";
import { invitationStore, type InvitationStore } from "../auth/invitationStore.js";

/** Sign-ins last 30 days. A role change (a demotion, for one) reaches the older pages when the token is renewed. */
const TOKEN_LIFETIME = "30d";

/**
 * F-012: one answer for a missing, unknown, used, expired or revoked code AND for an email that already has an
 * account, so the form confirms neither which codes are live nor which emails are registered.
 */
export const REGISTER_REFUSED = "Could not create the account. Check the invitation code, or ask your administrator for a new one.";

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
  invitationCode?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "contributor" | "reviewer" | "admin";
  display_name: string | null;
}

/**
 * Registration/login for the two roles that actually need identity:
 * Microtasks contributors and admins (see db/migrations/009_auth.sql's
 * header comment for why the anonymous chat flow is deliberately
 * untouched by this). No email-verification step -- no email-sending
 * infra exists in this project yet (see .env.example: no SMTP/SES/etc
 * config), so this is a known, documented simplification, not an
 * oversight. No public "become an admin" path exists anywhere in this
 * file by design; see apps/api/src/db/promoteToAdmin.ts.
 *
 * F-012 (docs/features/F-012-invitation-only-accounts.md): by default (REGISTRATION=invite) an account needs
 * a single-use invitation code from an administrator, and gets the invitation's role.
 */
export function registerAuthRoutes(app: FastifyInstance, store: InvitationStore = invitationStore): void {
  // 10 tries per 15 minutes per address: a code has about 39.6 random bits, so guessing is hopeless anyway.
  const registerLimit = { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } };

  app.post<{ Body: RegisterBody }>("/api/v1/auth/register", registerLimit, async (request, reply) => {
    if (env.registration === "closed") {
      return reply.status(403).send({ error: "New accounts are not being created on this server. Ask your administrator." });
    }
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    const displayName = request.body?.displayName?.trim().slice(0, 100) || null;
    const code = typeof request.body?.invitationCode === "string" ? request.body.invitationCode.trim() : "";

    if (!email || !email.includes("@")) {
      return reply.status(400).send({ error: "A valid email is required" });
    }
    if (!password || !isPasswordAcceptable(password)) {
      return reply.status(400).send({ error: "Password must be at least 10 characters" });
    }

    // Hashed before any check, so a refusal takes as long as a success and its timing tells nothing either.
    const passwordHash = await hashPassword(password);
    if (await store.emailTaken(email)) {
      // Deliberately vague (not "email already registered") to avoid
      // trivially confirming which emails have accounts.
      return reply.status(409).send({ error: env.registration === "invite" ? REGISTER_REFUSED : "Could not register with these details" });
    }

    let user: { id: string; role: string } | null;
    if (env.registration === "invite") {
      if (!code) return reply.status(409).send({ error: REGISTER_REFUSED });
      try {
        user = await store.register({ code, email, passwordHash, displayName });
      } catch (err) {
        // The same email registered a moment ago, between the check above and here.
        if ((err as { code?: string }).code === "23505") return reply.status(409).send({ error: REGISTER_REFUSED });
        throw err;
      }
      if (!user) return reply.status(409).send({ error: REGISTER_REFUSED });
    } else {
      user = await store.registerOpen({ email, passwordHash, displayName });
    }

    const token = app.jwt.sign({ id: user.id, role: user.role as "contributor" | "reviewer" | "admin" }, { expiresIn: TOKEN_LIFETIME });
    return reply.status(201).send({ token, role: user.role });
  });

  app.post<{ Body: LoginBody }>("/api/v1/auth/login", async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    if (!email || !password) {
      return reply.status(400).send({ error: "email and password are required" });
    }

    const { rows } = await pool.query<UserRow>(
      `SELECT id, email, password_hash, role, display_name FROM users WHERE email = $1 AND created_via = 'registered'`,
      [email],
    );
    const user = rows[0];
    // Same generic error whether the email doesn't exist or the password
    // is wrong -- don't leak which case it was.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = app.jwt.sign({ id: user.id, role: user.role }, { expiresIn: TOKEN_LIFETIME });
    return reply.send({ token, role: user.role, displayName: user.display_name });
  });

  app.get("/api/v1/auth/me", { preHandler: app.requireAuth }, async (request, reply) => {
    const { rows } = await pool.query<{ id: string; email: string; role: string; display_name: string | null }>(
      `SELECT id, email, role, display_name FROM users WHERE id = $1`,
      [request.user.id],
    );
    const user = rows[0];
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send({ id: user.id, email: user.email, role: user.role, displayName: user.display_name });
  });
}
