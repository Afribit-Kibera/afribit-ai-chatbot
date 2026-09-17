import webpush, { type PushSubscription } from "web-push";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export function isPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}

function configureWebPush(): void {
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
}

function toPushSubscription(row: StoredSubscription): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

async function disableSubscription(endpoint: string): Promise<void> {
  await pool.query(
    `UPDATE notification_subscriptions
     SET enabled = false, updated_at = now()
     WHERE endpoint = $1`,
    [endpoint],
  );
}

export async function sendPushToInstallation(installationId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  configureWebPush();

  const { rows } = await pool.query<StoredSubscription>(
    `SELECT endpoint, p256dh, auth
     FROM notification_subscriptions
     WHERE installation_id = $1 AND enabled = true`,
    [installationId],
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(toPushSubscription(row), JSON.stringify(payload));
        sent += 1;
      } catch (err) {
        failed += 1;
        const statusCode = typeof err === "object" && err && "statusCode" in err ? Number(err.statusCode) : null;
        if (statusCode === 404 || statusCode === 410) {
          await disableSubscription(row.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
}
