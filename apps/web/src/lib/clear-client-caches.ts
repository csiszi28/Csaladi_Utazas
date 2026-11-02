import { clearIntroTripsCache } from "@/lib/trip-intro";

/** A service worker ezekben tárolja a bejelentkezett felhasználó oldalait és API-válaszait. */
const USER_DATA_CACHES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "apis",
  "others",
  "next-data",
  "trip-day-api",
  "fam-offline-docs-v1",
];

/**
 * Kijelentkezéskor / fiók törlésekor: a böngészőben maradt felhasználói adatok törlése,
 * hogy egy közös eszközön a következő felhasználó ne lásson régi tartalmat.
 */
export async function clearUserClientData(): Promise<void> {
  clearIntroTripsCache();
  try {
    if (typeof caches === "undefined") return;
    await Promise.all(USER_DATA_CACHES.map((name) => caches.delete(name)));
  } catch {
    // a cache törlése best-effort
  }
}
