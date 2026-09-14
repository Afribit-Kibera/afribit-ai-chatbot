import type { FastifyInstance } from "fastify";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { pool } from "../db/pool.js";

/**
 * PRD §43 Q1 leaves accounts vs anonymous sessions open. For now the caller
 * supplies an opaque external ID directly (header) — replace with real auth
 * in Phase 2+. Resolves (upserting if needed) to the internal `users.id`
 * UUID that `user_preferences` actually keys on, so the header does not
 * need to be a UUID itself.
 */
async function resolveUserId(
  request: { headers: Record<string, unknown> },
  reply: { status: (n: number) => { send: (b: unknown) => unknown } },
): Promise<string | null> {
  const externalId = request.headers["x-afribit-user-id"];
  if (typeof externalId !== "string" || !externalId) {
    reply.status(400).send({ error: "x-afribit-user-id header is required" });
    return null;
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (external_auth_id) VALUES ($1)
     ON CONFLICT (external_auth_id) DO UPDATE SET external_auth_id = EXCLUDED.external_auth_id
     RETURNING id`,
    [externalId],
  );
  return rows[0]?.id ?? null;
}

export function registerPreferenceRoutes(app: FastifyInstance): void {
  app.get("/api/v1/me/preferences", async (request, reply) => {
    const userId = await resolveUserId(request as never, reply as never);
    if (!userId) return;
    const { rows } = await pool.query(
      `SELECT language_mode, explanation_level, learning_consent FROM user_preferences WHERE user_id = $1`,
      [userId],
    );
    return reply.send(rows[0] ?? { language_mode: "mixed_ke", explanation_level: "normal", learning_consent: false });
  });

  app.patch<{ Body: { languageMode?: LanguageMode; explanationLevel?: ExplanationLevel; learningConsent?: boolean } }>(
    "/api/v1/me/preferences",
    async (request, reply) => {
      const userId = await resolveUserId(request as never, reply as never);
      if (!userId) return;
      const { languageMode, explanationLevel, learningConsent } = request.body;
      await pool.query(
        `INSERT INTO user_preferences (user_id, language_mode, explanation_level, learning_consent)
         VALUES ($1, COALESCE($2, 'mixed_ke'), COALESCE($3, 'normal'), COALESCE($4, false))
         ON CONFLICT (user_id) DO UPDATE SET
           language_mode = COALESCE($2, user_preferences.language_mode),
           explanation_level = COALESCE($3, user_preferences.explanation_level),
           learning_consent = COALESCE($4, user_preferences.learning_consent),
           updated_at = now()`,
        [userId, languageMode ?? null, explanationLevel ?? null, learningConsent ?? null],
      );
      return reply.send({ ok: true });
    },
  );
}
