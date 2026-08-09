"use client";

import {
  canShowBrowserNotifications,
  getBrowserNotificationsEnabled,
  setBrowserNotificationsEnabled,
  syncNotificationPreferencesToServer,
} from "@/lib/notification-prefs";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushClientSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

async function postSubscription(subscription: PushSubscription): Promise<boolean> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await fetch("/api/v1/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }),
  });
  return res.ok;
}

async function deleteSubscription(endpoint?: string): Promise<void> {
  await fetch("/api/v1/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: endpoint ?? null }),
  }).catch(() => undefined);
}

/** Engedély + Web Push feliratkozás (ha VAPID be van állítva). */
export async function enablePushNotifications(): Promise<{
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}> {
  if (typeof Notification === "undefined") {
    return { permission: "unsupported", subscribed: false };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    setBrowserNotificationsEnabled(false);
    return { permission, subscribed: false };
  }

  setBrowserNotificationsEnabled(true);
  void syncNotificationPreferencesToServer().catch(() => undefined);

  const vapid = getVapidPublicKey();
  if (!vapid || !isPushClientSupported()) {
    return { permission, subscribed: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
    }
    const ok = await postSubscription(subscription);
    return { permission, subscribed: ok };
  } catch (error) {
    console.error("[enablePushNotifications]", error);
    return { permission, subscribed: false };
  }
}

/** App-szintű kikapcsolás + push leiratkozás. */
export async function disablePushNotifications(): Promise<void> {
  setBrowserNotificationsEnabled(false);
  void syncNotificationPreferencesToServer().catch(() => undefined);

  if (!isPushClientSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => undefined);
      await deleteSubscription(endpoint);
    } else {
      await deleteSubscription();
    }
  } catch (error) {
    console.error("[disablePushNotifications]", error);
  }
}

/** Ha már granted + enabled, frissíti / létrehozza a push feliratkozást. */
export async function syncPushSubscriptionIfEnabled(): Promise<void> {
  if (!canShowBrowserNotifications()) return;
  if (!getVapidPublicKey() || !isPushClientSupported()) return;
  if (!getBrowserNotificationsEnabled()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()!) as BufferSource,
      });
    }
    await postSubscription(subscription);
  } catch {
    /* silent — push opcionális */
  }
}
