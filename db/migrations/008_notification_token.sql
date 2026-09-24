-- Security fix (security-review, 2026-09-23): POST /api/v1/chat and
-- /chat/stream accepted a client-supplied installationId with no proof of
-- ownership and passed it straight to sendPushToInstallation() -- since
-- installationId is a non-secret crypto.randomUUID() stored in
-- localStorage (apps/web/src/lib/pwa.ts), anyone who learned or guessed
-- another user's installationId could make the server push a notification
-- to that victim's device on demand. Fixes by replacing the trigger value
-- with a server-generated secret only ever returned to the subscribing
-- client itself (PUT /api/v1/notifications/subscription's response),
-- never derivable from the installationId.

ALTER TABLE notification_subscriptions
  ADD COLUMN notify_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX idx_notification_subscriptions_notify_token
  ON notification_subscriptions(notify_token)
  WHERE enabled = true;
