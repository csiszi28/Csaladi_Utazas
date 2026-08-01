import { OFFLINE_DAY_PREFIX } from "@/lib/offline-day";

export interface OfflineDayItem {
  title: string;
  time: string | null;
  endTime?: string | null;
  kind: string;
  location?: string | null;
}

export interface OfflinePackingItem {
  title: string;
  quantity: number;
  isPacked: boolean;
  assigneeName?: string | null;
}

export interface OfflineDocItem {
  id: string;
  fileName: string;
  category: string;
  categoryLabel: string;
  downloadPath: string;
}

export interface OfflineDaySnapshot {
  tripId: string;
  tripTitle: string;
  destination: string;
  day: string;
  items: OfflineDayItem[];
  packing?: OfflinePackingItem[];
  documents?: OfflineDocItem[];
  savedAt: string;
}

const KEY_DOCS_CACHE = "fam-offline-docs-v1";

export function offlineDayStorageKey(tripId: string, day: string) {
  return `${OFFLINE_DAY_PREFIX}${tripId}:${day}`;
}

export function writeOfflineDaySnapshot(snapshot: OfflineDaySnapshot): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(
      offlineDayStorageKey(snapshot.tripId, snapshot.day),
      JSON.stringify(snapshot)
    );
    return true;
  } catch {
    return false;
  }
}

export function readOfflineDaySnapshots(limit = 20): OfflineDaySnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const found: OfflineDaySnapshot[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(OFFLINE_DAY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      found.push(JSON.parse(raw) as OfflineDaySnapshot);
    }
    found.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return found.slice(0, limit);
  } catch {
    return [];
  }
}

/** Prefetch key travel docs into the Cache API so they open offline when possible. */
export async function prefetchOfflineDocuments(docs: OfflineDocItem[]): Promise<number> {
  if (typeof window === "undefined" || !("caches" in window)) return 0;
  let cached = 0;
  try {
    const cache = await caches.open(KEY_DOCS_CACHE);
    await Promise.all(
      docs.slice(0, 12).map(async (doc) => {
        try {
          const res = await fetch(doc.downloadPath, { credentials: "same-origin" });
          if (res.ok) {
            await cache.put(doc.downloadPath, res.clone());
            cached += 1;
          }
        } catch {
          /* ignore individual failures */
        }
      })
    );
  } catch {
    return cached;
  }
  return cached;
}
