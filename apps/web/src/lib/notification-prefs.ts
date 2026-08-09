const PREF_KEY = "fam-browser-notifications-enabled";
const CATEGORIES_KEY = "fam-notification-categories";
export const NOTIFICATION_PREF_CHANGE_EVENT = "fam-notifications-pref-change";

export type BrowserNotificationSupport = NotificationPermission | "unsupported";

export const NOTIFICATION_CATEGORIES = [
  "reminders",
  "programs",
  "accommodations",
  "transports",
  "finances",
  "people",
  "documents",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  { title: string; description: string }
> = {
  reminders: {
    title: "Emlékeztetők",
    description: "Közelgő út, holnapi program, teendők",
  },
  programs: {
    title: "Programok",
    description: "Új program és programváltozások",
  },
  accommodations: {
    title: "Szállások",
    description: "Új szállás és szállásmódosítások",
  },
  transports: {
    title: "Közlekedés",
    description: "Új utazás / járat és változások",
  },
  finances: {
    title: "Pénzügyek",
    description: "Költségek, elszámolás",
  },
  people: {
    title: "Emberek",
    description: "Meghívók, csatlakozás, eltávolítás",
  },
  documents: {
    title: "Dokumentumok",
    description: "Új fájlok és checklist emlékeztetők",
  },
};

export type NotificationCategoryMap = Record<NotificationCategory, boolean>;

export function defaultNotificationCategories(): NotificationCategoryMap {
  return {
    reminders: true,
    programs: true,
    accommodations: true,
    transports: true,
    finances: true,
    people: true,
    documents: true,
  };
}

export function getNotificationPermission(): BrowserNotificationSupport {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

/** iOS / iPadOS — push általában csak Főképernyőre mentett PWA-ból működik. */
export function isIosLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ asztali UA-t jelenthet
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function getDeniedNotificationHelp(): string {
  if (isIosLikeDevice()) {
    return isStandaloneDisplayMode()
      ? "Az értesítések le vannak tiltva. iPhone: Beállítások → Értesítések → Családi Utazás (vagy Safari) → Engedélyezés. Utána nyomd meg az „Ellenőrzés újra” gombot."
      : "iPhone-on az értesítésekhez add az appot a Főképernyőre (Safari → Megosztás → Főképernyőhöz adás), nyisd meg onnan, majd engedélyezd az értesítéseket.";
  }
  return "A böngésző letiltotta az értesítéseket. Chrome: a címsor melletti lakat / info ikon → Értesítések → Engedélyezés. Utána nyomd meg az „Ellenőrzés újra” gombot.";
}

/** App-szintű preferencia: még granted jogosultság mellett is kikapcsolható. */
export function getBrowserNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (getNotificationPermission() !== "granted") return false;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    // Alapértelmezés: ha a böngésző engedélyezi, az app is bekapcsolva indul
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return false;
  }
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? "1" : "0");
    if (enabled) {
      // Főkapcsoló be: hiányzó kategóriák alapból mind be
      const current = readCategoriesRaw();
      if (!current) {
        window.localStorage.setItem(
          CATEGORIES_KEY,
          JSON.stringify(defaultNotificationCategories())
        );
      }
    }
  } catch {
    /* private mode / quota */
  }
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_PREF_CHANGE_EVENT, { detail: { enabled } })
  );
}

function readCategoriesRaw(): NotificationCategoryMap | null {
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const defaults = defaultNotificationCategories();
    for (const key of NOTIFICATION_CATEGORIES) {
      if (typeof parsed[key] === "boolean") {
        defaults[key] = parsed[key];
      }
    }
    return defaults;
  } catch {
    return null;
  }
}

export function getNotificationCategories(): NotificationCategoryMap {
  if (typeof window === "undefined") return defaultNotificationCategories();
  return readCategoriesRaw() ?? defaultNotificationCategories();
}

export function setNotificationCategory(
  category: NotificationCategory,
  enabled: boolean
): void {
  if (typeof window === "undefined") return;
  const next = { ...getNotificationCategories(), [category]: enabled };
  try {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_PREF_CHANGE_EVENT, {
      detail: { categories: next },
    })
  );
  void syncNotificationPreferencesToServer(next).catch(() => undefined);
}

export function setAllNotificationCategories(enabled: boolean): void {
  const next = defaultNotificationCategories();
  for (const key of NOTIFICATION_CATEGORIES) next[key] = enabled;
  try {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_PREF_CHANGE_EVENT, {
      detail: { categories: next },
    })
  );
  void syncNotificationPreferencesToServer(next).catch(() => undefined);
}

/** Valóban küldhet-e az app böngésző értesítést most (főkapcsoló). */
export function canShowBrowserNotifications(): boolean {
  return getNotificationPermission() === "granted" && getBrowserNotificationsEnabled();
}

export function isNotificationCategoryEnabled(category: NotificationCategory): boolean {
  if (!canShowBrowserNotifications()) return false;
  return getNotificationCategories()[category];
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationSupport> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    setBrowserNotificationsEnabled(true);
  }
  return permission;
}

/** Szerverre mentés — a háttér-push kategória-szűréséhez. */
export async function syncNotificationPreferencesToServer(
  categories?: NotificationCategoryMap
): Promise<void> {
  if (typeof window === "undefined") return;
  const enabled = getBrowserNotificationsEnabled();
  const cats = categories ?? getNotificationCategories();
  await fetch("/api/v1/push/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, categories: cats }),
  }).catch(() => undefined);
}

export function inboxKindToCategory(kind: string): NotificationCategory {
  if (kind === "removed_from_trip" || kind.includes("collaborator") || kind.includes("invite")) {
    return "people";
  }
  if (kind.includes("program")) return "programs";
  if (kind.includes("accommodation") || kind.includes("stay")) return "accommodations";
  if (kind.includes("transport")) return "transports";
  if (kind.includes("cost") || kind.includes("settlement") || kind.includes("finance")) {
    return "finances";
  }
  if (kind.includes("document") || kind.includes("checklist")) return "documents";
  return "reminders";
}
