import type { FastifyInstance } from "fastify";
import type { ExplanationLevel, LanguageModeId } from "@afribit/shared";
import { getPack, getRegistry } from "../pack/active.js";
import { isKnownMode, modeErrorMessage } from "../pack/modes.js";
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

/**
 * A learner's settings are per pack: the default pack's stay in user_preferences, exactly where they
 * always were; every other pack's are in user_pack_preferences (migration 014).
 */
function isDefaultPack(): boolean {
  return getPack().id === getRegistry().default.id;
}

export function registerPreferenceRoutes(app: FastifyInstance): void {
  app.get("/api/v1/me/preferences", async (request, reply) => {
    const userId = await resolveUserId(request as never, reply as never);
    if (!userId) return;
    const { rows } = isDefaultPack()
      ? await pool.query(`SELECT language_mode, explanation_level, learning_consent FROM user_preferences WHERE user_id = $1`, [userId])
      : await pool.query(`SELECT language_mode, explanation_level, learning_consent FROM user_pack_preferences WHERE user_id = $1 AND pack_id = $2`, [userId, getPack().id]);
    return reply.send(rows[0] ?? { language_mode: getPack().defaultMode, explanation_level: "normal", learning_consent: false });
  });

  app.patch<{ Body: { languageMode?: LanguageModeId; explanationLevel?: ExplanationLevel; learningConsent?: boolean } }>(
    "/api/v1/me/preferences",
    async (request, reply) => {
      const userId = await resolveUserId(request as never, reply as never);
      if (!userId) return;
      const { languageMode, explanationLevel, learningConsent } = request.body;
      if (languageMode && !isKnownMode(languageMode)) return reply.status(400).send({ error: modeErrorMessage("languageMode") });
      if (isDefaultPack()) {
        await pool.query(
          `INSERT INTO user_preferences (user_id, language_mode, explanation_level, learning_consent)
           VALUES ($1, COALESCE($2, $5), COALESCE($3, 'normal'), COALESCE($4, false))
           ON CONFLICT (user_id) DO UPDATE SET
             language_mode = COALESCE($2, user_preferences.language_mode),
             explanation_level = COALESCE($3, user_preferences.explanation_level),
             learning_consent = COALESCE($4, user_preferences.learning_consent),
             updated_at = now()`,
          [userId, languageMode ?? null, explanationLevel ?? null, learningConsent ?? null, getPack().defaultMode],
        );
      } else {
        await pool.query(
          `INSERT INTO user_pack_preferences (user_id, pack_id, language_mode, explanation_level, learning_consent)
           VALUES ($1, $6, COALESCE($2, $5), COALESCE($3, 'normal'), COALESCE($4, false))
           ON CONFLICT (user_id, pack_id) DO UPDATE SET
             language_mode = COALESCE($2, user_pack_preferences.language_mode),
             explanation_level = COALESCE($3, user_pack_preferences.explanation_level),
             learning_consent = COALESCE($4, user_pack_preferences.learning_consent),
             updated_at = now()`,
          [userId, languageMode ?? null, explanationLevel ?? null, learningConsent ?? null, getPack().defaultMode, getPack().id],
        );
      }
      return reply.send({ ok: true });
    },
  );
}
