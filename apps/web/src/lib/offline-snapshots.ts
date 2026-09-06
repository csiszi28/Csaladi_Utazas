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

type DayApiPayload = {
  trip: { id: string; title: string; destination: string };
  day: string;
  days: string[];
  items: Array<{
    title: string;
    time: string | null;
    endTime?: string | null;
    kind: string;
    location?: string | null;
  }>;
  packing: OfflinePackingItem[];
  documents: OfflineDocItem[];
};

async function fetchDayPackage(
  tripId: string,
  day?: string
): Promise<DayApiPayload | null> {
  const qs = day ? `?date=${encodeURIComponent(day)}` : "";
  try {
    const res = await fetch(`/api/v1/trips/${tripId}/day${qs}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: DayApiPayload };
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export type PrefetchTripOfflineResult = {
  daysSaved: number;
  docsCached: number;
  dayCount: number;
};

/**
 * Utazás napcsomagjainak előtöltése (SW NetworkFirst + localStorage + doksi cache).
 * Egyszerre max `maxDays` napot tölt (alapból az összes, de legfeljebb 21).
 */
export async function prefetchTripOfflinePackage(
  tripId: string,
  options?: { maxDays?: number; concurrency?: number }
): Promise<PrefetchTripOfflineResult> {
  const maxDays = options?.maxDays ?? 21;
  const concurrency = Math.max(1, options?.concurrency ?? 3);

  const first = await fetchDayPackage(tripId);
  if (!first) {
    return { daysSaved: 0, docsCached: 0, dayCount: 0 };
  }

  const days = first.days.slice(0, maxDays);
  const docMap = new Map<string, OfflineDocItem>();
  let daysSaved = 0;

  async function savePayload(payload: DayApiPayload) {
    const ok = writeOfflineDaySnapshot({
      tripId: payload.trip.id,
      tripTitle: payload.trip.title,
      destination: payload.trip.destination,
      day: payload.day,
      items: payload.items.map((item) => ({
        title: item.title,
        time: item.time,
        endTime: item.endTime ?? null,
        kind: item.kind,
        location: item.location ?? null,
      })),
      packing: payload.packing,
      documents: payload.documents,
      savedAt: new Date().toISOString(),
    });
    if (ok) daysSaved += 1;
    for (const doc of payload.documents) {
      docMap.set(doc.id, doc);
    }
  }

  await savePayload(first);

  const remaining = days.filter((d) => d !== first.day);
  for (let i = 0; i < remaining.length; i += concurrency) {
    const batch = remaining.slice(i, i + concurrency);
    const payloads = await Promise.all(batch.map((d) => fetchDayPackage(tripId, d)));
    for (const payload of payloads) {
      if (payload) await savePayload(payload);
    }
  }

  const docsCached = await prefetchOfflineDocuments([...docMap.values()]);
  return { daysSaved, docsCached, dayCount: days.length };
}

/** True, ha az utazás 14 napon belül indul, vagy már zajlik. */
export function shouldAutoPrefetchTrip(
  startDate: Date | string,
  endDate: Date | string,
  now = new Date()
): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const msPerDay = 86_400_000;
  const daysUntilStart = Math.round((start.getTime() - today.getTime()) / msPerDay);
  const daysAfterEnd = Math.round((today.getTime() - end.getTime()) / msPerDay);
  if (daysAfterEnd > 0) return false;
  return daysUntilStart <= 14;
}
