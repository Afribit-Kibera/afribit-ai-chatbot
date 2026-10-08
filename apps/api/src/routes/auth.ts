import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { hashPassword, verifyPassword, isPasswordAcceptable } from "../auth/passwords.js";

/** Sign-ins last 30 days. A role change (a demotion, for one) reaches the older pages when the token is renewed. */
const TOKEN_LIFETIME = "30d";

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
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
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.post<{ Body: RegisterBody }>("/api/v1/auth/register", async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    const displayName = request.body?.displayName?.trim() || null;

    if (!email || !email.includes("@")) {
      return reply.status(400).send({ error: "A valid email is required" });
    }
    if (!password || !isPasswordAcceptable(password)) {
      return reply.status(400).send({ error: "Password must be at least 10 characters" });
    }

    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      // Deliberately vague (not "email already registered") to avoid
      // trivially confirming which emails have accounts.
      return reply.status(409).send({ error: "Could not register with these details" });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query<{ id: string; role: string }>(
      `INSERT INTO users (email, password_hash, display_name, role, created_via)
       VALUES ($1, $2, $3, 'contributor', 'registered')
       RETURNING id, role`,
      [email, passwordHash, displayName],
    );
    const user = rows[0];
    if (!user) throw new Error("Failed to create user");

    const token = app.jwt.sign({ id: user.id, role: user.role as "contributor" | "admin" }, { expiresIn: TOKEN_LIFETIME });
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
