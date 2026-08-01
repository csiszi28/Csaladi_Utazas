import { OFFLINE_DAY_PREFIX } from "@/lib/offline-day";

export interface OfflineDaySnapshot {
  tripId: string;
  tripTitle: string;
  destination: string;
  day: string;
  items: Array<{ title: string; time: string | null; kind: string }>;
  savedAt: string;
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

export function offlineDayStorageKey(tripId: string, day: string) {
  return `${OFFLINE_DAY_PREFIX}${tripId}:${day}`;
}
