import { deletePushSubscription, getVapidPublicKey, savePushSubscription, sendTestNotification } from "./api.js";

const INSTALLATION_ID_KEY = "afribit.installationId";

export type NotificationState = "unsupported" | "not_configured" | "default" | "granted" | "denied" | "enabled";

export function getInstallationId(): string {
  const existing = localStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(INSTALLATION_ID_KEY, next);
  return next;
}

export function getNotificationState(): NotificationState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

export async function enablePushNotifications(): Promise<NotificationState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
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

  await savePushSubscription({
    installationId: getInstallationId(),
    subscription: subscription.toJSON(),
  });

  return "enabled";
}

export async function disablePushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

export async function sendPushNotificationTest(): Promise<void> {
  await sendTestNotification(getInstallationId());
}
