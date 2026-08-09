/**
 * A Serwist által generált public/sw.js végére fűzi a Web Push handlereket.
 * Fejlesztésben a Serwist ki van kapcsolva — így a tracked sw.js is tud push-t.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const swPath = join(root, "public", "sw.js");

const PUSH_MARKER = "/* fam-web-push-handlers */";

const PUSH_HANDLERS = `
${PUSH_MARKER}
self.addEventListener("push", (event) => {
  let title = "Családi Utazás";
  let body = "Új értesítésed van";
  let href = "/";
  let tag = "fam-push";
  try {
    const data = event.data?.json() ?? null;
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
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { href },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href =
    typeof event.notification.data === "object" &&
    event.notification.data !== null &&
    "href" in event.notification.data &&
    typeof event.notification.data.href === "string"
      ? event.notification.data.href
      : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          void client.focus();
          void client.navigate(href);
          return;
        }
      }
      void self.clients.openWindow(href);
    })
  );
});
`;

if (!existsSync(swPath)) {
  console.warn("[append-sw-push] no sw.js yet — skip");
  process.exit(0);
}

let source = readFileSync(swPath, "utf8");
if (source.includes(PUSH_MARKER) || source.includes('addEventListener("push"')) {
  // Már benne van (Serwist sw.ts build, vagy korábbi append)
  if (!source.includes(PUSH_MARKER) && source.includes('addEventListener("push"')) {
    console.log("[append-sw-push] push already present from sw.ts build");
  } else {
    console.log("[append-sw-push] already patched");
  }
  process.exit(0);
}

writeFileSync(swPath, `${source.trimEnd()}\n${PUSH_HANDLERS}\n`, "utf8");
console.log("[append-sw-push] push handlers appended");
