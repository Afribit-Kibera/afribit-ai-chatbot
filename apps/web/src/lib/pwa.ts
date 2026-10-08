import {
  deletePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
  sendTestNotification,
} from "./api.js";

const INSTALLATION_ID_KEY = "afribit.installationId";
// SECURITY: this token, not installationId, is what actually authorizes a
// push to this device (server-issued by PUT /notifications/subscription,
// never derivable from installationId -- see db/migrations/008 and
// pushService.ts's sendPushByToken()). installationId itself is not a
// secret and must never be used to trigger a notification.
const NOTIFY_TOKEN_KEY = "afribit.notifyToken";

export type NotificationState =
  | "unsupported"
  | "not_configured"
  | "default"
  | "granted"
  | "denied"
  | "enabled";

export function getInstallationId(): string {
  let existing: string | null = null;
  try {
    existing = localStorage.getItem(INSTALLATION_ID_KEY);
  } catch {
    /* A device ID still works in memory. */
  }
  if (existing) return existing;
  const next = crypto.randomUUID();
  try {
    localStorage.setItem(INSTALLATION_ID_KEY, next);
  } catch {
    /* Storage can be unavailable. */
  }
  return next;
}

/** Set only after a successful subscription save; absent until then or if push was never enabled. */
export function getNotifyToken(): string | null {
  try {
    return localStorage.getItem(NOTIFY_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getNotificationState(): NotificationState {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  return Notification.permission;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

export async function enablePushNotifications(): Promise<NotificationState> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  const vapid = await getVapidPublicKey();
  if (!vapid.enabled || !vapid.publicKey) {
    return "not_configured";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapid.publicKey),
    }));

  const { notifyToken } = await savePushSubscription({
    installationId: getInstallationId(),
    subscription: subscription.toJSON(),
  });
  if (notifyToken) {
    try {
      localStorage.setItem(NOTIFY_TOKEN_KEY, notifyToken);
    } catch {
      /* Subscription can be disabled from browser settings. */
    }
  }

  return "enabled";
}

export async function disablePushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  try {
    localStorage.removeItem(NOTIFY_TOKEN_KEY);
  } catch {
    /* The subscription is already disabled. */
  }
}

export async function sendPushNotificationTest(): Promise<void> {
  const token = getNotifyToken();
  if (!token)
    throw new Error("Push notifications are not enabled on this device yet.");
  await sendTestNotification(token);
}
