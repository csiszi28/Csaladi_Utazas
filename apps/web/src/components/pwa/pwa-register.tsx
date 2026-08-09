"use client";

import { useEffect } from "react";
import { syncPushSubscriptionIfEnabled } from "@/lib/push-client";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (registration) => {
        // Új SW azonnal átvegye a push handlereket
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        await registration.update().catch(() => undefined);
        // Háttér-értesítéshez kell a szerveren tárolt feliratkozás
        await syncPushSubscriptionIfEnabled();
      })
      .catch(() => {
        // Service worker registration is best-effort; app still works without it.
      });
  }, []);

  return null;
}
