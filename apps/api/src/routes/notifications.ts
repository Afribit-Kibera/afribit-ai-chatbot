import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { isPushConfigured, sendPushToInstallation } from "../notifications/pushService.js";

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

  app.put<{ Body: PushSubscriptionBody }>("/api/v1/notifications/subscription", async (request, reply) => {
    const endpoint = request.body?.subscription?.endpoint;
    const p256dh = request.body?.subscription?.keys?.p256dh;
    const auth = request.body?.subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return reply.status(400).send({ error: "subscription endpoint, p256dh, and auth are required" });
    }

    if (!endpoint.startsWith("https://")) {
      return reply.status(400).send({ error: "subscription endpoint must be https" });
    }

    const userId = await resolveOptionalUserId(getExternalUserId(request.headers as Record<string, unknown>));
    const userAgent = request.headers["user-agent"];

    await pool.query(
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
        last_seen_at = now()`,
      [
        userId,
        request.body.installationId ?? null,
        endpoint,
        p256dh,
        auth,
        typeof userAgent === "string" ? userAgent.slice(0, 500) : null,
      ],
    );

    return reply.send({ ok: true });
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

  app.post<{ Body: { installationId?: string } }>("/api/v1/notifications/test", async (request, reply) => {
    if (!isPushConfigured()) {
      return reply.status(503).send({ error: "push notifications are not configured" });
    }
    if (!request.body?.installationId) {
      return reply.status(400).send({ error: "installationId is required" });
    }

    const result = await sendPushToInstallation(request.body.installationId, {
      title: "Afribit AI",
      body: "Notifications ziko sawa. Afribit can reach this device.",
      url: "/",
      tag: "afribit-test",
    });

    return reply.send({ ok: true, ...result });
  });
}
