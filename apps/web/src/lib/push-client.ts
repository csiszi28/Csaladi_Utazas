"use client";

import {
  canShowBrowserNotifications,
  getBrowserNotificationsEnabled,
  getDeniedNotificationHelp,
  getNotificationPermission,
  isIosLikeDevice,
  isStandaloneDisplayMode,
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

export type EnablePushResult = {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  /** Emberi üzenet a UI-nak (tiltás / iOS útmutató). */
  message?: string;
};

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

async function waitForServiceWorker(
  timeoutMs = 8000
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    return ready;
  } catch {
    return null;
  }
}

/** Invalidálja a függőben lévő disable cleanupot (gyors ki/be kapcsolás). */
let pushLifecycleToken = 0;

/** Engedély + Web Push feliratkozás (ha VAPID be van állítva). */
export async function enablePushNotifications(): Promise<EnablePushResult> {
  pushLifecycleToken += 1;

  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return {
      permission: "unsupported",
      subscribed: false,
      message: "Ez a böngésző nem támogatja az értesítéseket.",
    };
  }

  // iOS: nem-PWA-ból gyakran nem működik / azonnal tiltásnak tűnik
  if (isIosLikeDevice() && !isStandaloneDisplayMode()) {
    return {
      permission: getNotificationPermission(),
      subscribed: false,
      message: getDeniedNotificationHelp(),
    };
  }

  // Már tiltva a böngészőben — requestPermission nem hoz fel új dialógust
  if (Notification.permission === "denied") {
    setBrowserNotificationsEnabled(false);
    return {
      permission: "denied",
      subscribed: false,
      message: getDeniedNotificationHelp(),
    };
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission !== "granted") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return {
        permission: getNotificationPermission(),
        subscribed: false,
        message: "Nem sikerült az értesítési engedélyt bekérni. Próbáld újra.",
      };
    }
  }

  if (permission !== "granted") {
    setBrowserNotificationsEnabled(false);
    return {
      permission,
      subscribed: false,
      message:
        permission === "denied"
          ? getDeniedNotificationHelp()
          : "Nem engedélyezted az értesítéseket. Bármikor újra megpróbálhatod.",
    };
  }

  setBrowserNotificationsEnabled(true);
  void syncNotificationPreferencesToServer().catch(() => undefined);

  const vapid = getVapidPublicKey();
  if (!vapid || !isPushClientSupported()) {
    // Böngésző-értesítés (foreground) így is mehet
    return { permission, subscribed: false };
  }

  try {
    const registration = await waitForServiceWorker();
    if (!registration?.pushManager) {
      return {
        permission,
        subscribed: false,
        message:
          "Az értesítések bekapcsolva. A háttér-pushhoz frissítsd az oldalt, vagy nyisd meg újra az appot.",
      };
    }

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
    // Engedély megvan — ne állítsuk vissza tiltottra, ha csak a subscribe bukott
    return {
      permission,
      subscribed: false,
      message:
        "Az értesítések engedélyezve. A háttér-küldéshez próbáld újra később, vagy frissítsd az oldalt.",
    };
  }
}

/** Háttérben: SW unsubscribe + szerver DELETE (UI ne várjon rá). */
async function cleanupPushSubscriptionInBackground(token: number): Promise<void> {
  if (!isPushClientSupported()) {
    if (token !== pushLifecycleToken) return;
    await deleteSubscription();
    return;
  }

  try {
    const registration = await waitForServiceWorker(2500);
    if (token !== pushLifecycleToken) return;
    if (!registration) {
      await deleteSubscription();
      return;
    }
    const subscription = await registration.pushManager.getSubscription();
    if (token !== pushLifecycleToken) return;
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => undefined);
      if (token !== pushLifecycleToken) return;
      await deleteSubscription(endpoint);
    } else {
      await deleteSubscription();
    }
  } catch (error) {
    console.error("[disablePushNotifications]", error);
  }
}

/**
 * App-szintű kikapcsolás — azonnal (localStorage + preferencia sync),
 * a push leiratkozás háttérben fut, hogy a kapcsoló ne várjon.
 */
export async function disablePushNotifications(): Promise<void> {
  const token = ++pushLifecycleToken;
  setBrowserNotificationsEnabled(false);
  void syncNotificationPreferencesToServer().catch(() => undefined);
  void cleanupPushSubscriptionInBackground(token);
}

/** Ha már granted + enabled, frissíti / létrehozza a push feliratkozást. */
export async function syncPushSubscriptionIfEnabled(): Promise<void> {
  if (!canShowBrowserNotifications()) return;
  if (!getVapidPublicKey() || !isPushClientSupported()) return;
  if (!getBrowserNotificationsEnabled()) return;

  try {
    const registration = await waitForServiceWorker();
    if (!registration?.pushManager) return;

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

/** Újraolvassa a böngésző engedélyét (pl. rendszerbeállítás után). */
export function refreshNotificationPermissionState(): {
  permission: ReturnType<typeof getNotificationPermission>;
  enabled: boolean;
} {
  const permission = getNotificationPermission();
  if (permission === "granted") {
    // Ha a user a böngészőben újraengedélyezte, az app kapcsolót is visszakapcsoljuk
    if (!getBrowserNotificationsEnabled()) {
      setBrowserNotificationsEnabled(true);
    }
  }
  return {
    permission,
    enabled: getBrowserNotificationsEnabled(),
  };
}
