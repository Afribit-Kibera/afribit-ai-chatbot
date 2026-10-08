import { getPack } from "../pack/active.js";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { isPushConfigured, sendPushByToken } from "../notifications/pushService.js";

interface PushSubscriptionBody {
  installationId?: string;
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
}

/**
 * SECURITY (updated 2026-09-24, real auth now exists): this header is
 * entirely client-supplied and unverified -- any caller can claim any
 * external_auth_id (security-review finding, 2026-09-23). Real auth
 * landing doesn't retroactively make this header trustworthy; it makes it
 * OBSOLETE for anyone who actually has an account. registerNotificationRoutes()
 * below now prefers `request.user.id` from a verified JWT (via
 * app.optionalAuth) whenever one is present, and only falls back to this
 * header's best-effort, unverified linking for genuinely anonymous
 * callers -- matching the anonymous-chat product model this whole app
 * uses elsewhere. Still never use this header's result to gate anything
 * sensitive. Notification delivery itself is protected separately via
 * notify_token (see pushService.ts's sendPushByToken()), which does NOT
 * depend on either path.
 */
function getExternalUserId(headers: Record<string, unknown>): string | null {
  const value = headers["x-afribit-user-id"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function resolveOptionalUserId(externalId: string | null): Promise<string | null> {
  if (!externalId) return null;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (external_auth_id) VALUES ($1)
     ON CONFLICT (external_auth_id) DO UPDATE SET external_auth_id = EXCLUDED.external_auth_id
     RETURNING id`,
    [externalId],
  );
  return rows[0]?.id ?? null;
}

export function registerNotificationRoutes(app: FastifyInstance): void {
  app.get("/api/v1/notifications/vapid-public-key", async (_request, reply) => {
    return reply.send({
      enabled: isPushConfigured(),
      publicKey: env.vapidPublicKey || null,
    });
  });

  app.put<{ Body: PushSubscriptionBody }>(
    "/api/v1/notifications/subscription",
    { preHandler: app.optionalAuth },
    async (request, reply) => {
    const endpoint = request.body?.subscription?.endpoint;
    const p256dh = request.body?.subscription?.keys?.p256dh;
    const auth = request.body?.subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return reply.status(400).send({ error: "subscription endpoint, p256dh, and auth are required" });
    }

    if (!endpoint.startsWith("https://")) {
      return reply.status(400).send({ error: "subscription endpoint must be https" });
    }

    // Prefer the verified JWT user id; only fall back to the unverified
    // header for callers with no account at all (see getExternalUserId's
    // updated doc comment above).
    const userId = request.user?.id ?? (await resolveOptionalUserId(getExternalUserId(request.headers as Record<string, unknown>)));
    const userAgent = request.headers["user-agent"];

    // RETURNING notify_token -- this is the only response that ever
    // reveals this row's token, and only to the client that just proved
    // it controls this exact push endpoint by registering it. Never log
    // or echo it anywhere else.
    const { rows } = await pool.query<{ notify_token: string }>(
      `INSERT INTO notification_subscriptions
        (user_id, installation_id, endpoint, p256dh, auth, user_agent, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (endpoint) DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, notification_subscriptions.user_id),
        installation_id = COALESCE(EXCLUDED.installation_id, notification_subscriptions.installation_id),
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        enabled = true,
        updated_at = now(),
        last_seen_at = now()
       RETURNING notify_token`,
      [
        userId,
        request.body.installationId ?? null,
        endpoint,
        p256dh,
        auth,
        typeof userAgent === "string" ? userAgent.slice(0, 500) : null,
      ],
    );

    return reply.send({ ok: true, notifyToken: rows[0]?.notify_token ?? null });
  });

  app.delete<{ Body: { endpoint?: string } }>("/api/v1/notifications/subscription", async (request, reply) => {
    if (!request.body?.endpoint) {
      return reply.status(400).send({ error: "endpoint is required" });
    }

    await pool.query(
      `UPDATE notification_subscriptions
       SET enabled = false, updated_at = now()
       WHERE endpoint = $1`,
      [request.body.endpoint],
    );

    return reply.send({ ok: true });
  });

  app.post<{ Body: { notifyToken?: string } }>("/api/v1/notifications/test", async (request, reply) => {
    if (env.nodeEnv === "production") {
      return reply.status(404).send({ error: "not found" });
    }
    if (!isPushConfigured()) {
      return reply.status(503).send({ error: "push notifications are not configured" });
    }
    if (!request.body?.notifyToken) {
      return reply.status(400).send({ error: "notifyToken is required" });
    }

    const result = await sendPushByToken(request.body.notifyToken, {
      title: getPack().prompts.notificationTitle,
      body: `${getPack().name} can reach this device.`,
      url: "/",
      tag: "afribit-test",
    });

    return reply.send({ ok: true, ...result });
  });
}
