import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher({ url, sameOrigin }) {
        return (
          sameOrigin === true &&
          url.pathname.startsWith("/api/v1/trips/") &&
          url.pathname.endsWith("/day")
        );
      },
      handler: new NetworkFirst({
        cacheName: "trip-day-api",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
    {
      matcher({ url, sameOrigin }) {
        return (
          sameOrigin === true &&
          /^\/api\/documents\/[^/]+\/download$/.test(url.pathname)
        );
      },
      handler: new CacheFirst({
        cacheName: "fam-offline-docs-v1",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 40,
            maxAgeSeconds: 60 * 60 * 24 * 14,
          }),
        ],
      }),
    },
    {
      matcher({ url }) {
        return url.hostname.endsWith("tile.openstreetmap.org");
      },
      handler: new CacheFirst({
        cacheName: "osm-tiles",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 400,
            maxAgeSeconds: 60 * 60 * 24 * 14,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  let title = "Családi Utazás";
  let body = "Új értesítésed van";
  let href = "/";
  let tag = "fam-push";

  try {
    const data = event.data?.json() as {
      title?: unknown;
      body?: unknown;
      href?: unknown;
      tag?: unknown;
    } | null;
    if (data) {
      if (typeof data.title === "string" && data.title.trim()) title = data.title;
      if (typeof data.body === "string" && data.body.trim()) body = data.body;
      if (typeof data.href === "string" && data.href.trim()) href = data.href;
      if (typeof data.tag === "string" && data.tag.trim()) tag = data.tag;
    }
  } catch {
    const text = event.data?.text();
    if (text) body = text;
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { href },
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    typeof event.notification.data === "object" &&
    event.notification.data !== null &&
    "href" in event.notification.data &&
    typeof (event.notification.data as { href?: unknown }).href === "string"
      ? (event.notification.data as { href: string }).href
      : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          void client.focus();
          void (client as WindowClient).navigate(href);
          return;
        }
      }
      void self.clients.openWindow(href);
    })
  );
});
