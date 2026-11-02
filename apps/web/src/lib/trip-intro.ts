export interface IntroTrip {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverUrl?: string | null;
}

export interface IntroPlan {
  /** Honnan indulunk (éppen zajló út célja, különben Budapest) */
  origin: string;
  originFull: string;
  /** A következő út célja */
  destination: string;
  destinationFull: string;
  title: string;
  /** Hány nap múlva indulunk (0 = ma) */
  days: number;
  startDate: string;
  endDate: string;
  /** Éppen úton vagyunk-e, vagy otthon */
  fromTrip: boolean;
  coverUrl: string | null;
}

const CACHE_KEY = "app-intro-trips-v2";
const HOME_ORIGIN = "Budapest";
/** Ennyi napon belüli utat mutatunk be (~6 hónap) */
export const INTRO_WINDOW_DAYS = 183;

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Az aláírt borító-URL 3 napig él a szerveren — a gyorsítótárban ennél korábban eldobjuk. */
const COVER_MAX_AGE_MS = 2.5 * 24 * 3600 * 1000;

export function readCachedIntroTrips(): IntroTrip[] | null {
  try {
    const cached = readJson<{ savedAt: number; trips: IntroTrip[] }>(localStorage.getItem(CACHE_KEY));
    if (!cached || !Array.isArray(cached.trips)) return null;
    const coversExpired = Date.now() - cached.savedAt > COVER_MAX_AGE_MS;
    return coversExpired ? cached.trips.map((trip) => ({ ...trip, coverUrl: null })) : cached.trips;
  } catch {
    return null;
  }
}

/** Kijelentkezéskor / fiók törlésekor: ne maradjon úti adat és aláírt URL a böngészőben. */
export function clearIntroTripsCache(): void {
  writeCachedIntroTrips(null);
}

function writeCachedIntroTrips(trips: IntroTrip[] | null): void {
  try {
    if (trips) localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), trips }));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // storage blocked
  }
}

/**
 * Friss utazások a szervertől. `null` = nem elérhető / nincs bejelentkezve
 * (utóbbinál a gyorsítótárat is töröljük, hogy kijelentkezés után ne maradjon adat).
 */
export async function fetchIntroTrips(timeoutMs: number): Promise<IntroTrip[] | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/v1/splash", {
      signal: controller.signal,
      redirect: "manual",
      credentials: "same-origin",
    });
    if (res.type === "opaqueredirect" || res.status === 401) {
      writeCachedIntroTrips(null);
      return null;
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: { trips?: IntroTrip[] } };
    const trips = body.data?.trips;
    if (!Array.isArray(trips)) return null;
    writeCachedIntroTrips(trips);
    return trips;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function todayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

function shortName(place: string): string {
  return place.split(",")[0]?.trim() || place.trim();
}

export function buildIntroPlan(trips: IntroTrip[] | null, now = new Date()): IntroPlan | null {
  if (!trips?.length) return null;

  const today = todayNumber(now);
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const ongoing = sorted.find(
    (trip) => dayNumber(trip.startDate) <= today && dayNumber(trip.endDate) >= today
  );
  const next = sorted.find((trip) => dayNumber(trip.startDate) >= today && trip !== ongoing);
  if (!next) return null;

  const days = dayNumber(next.startDate) - today;
  if (days > INTRO_WINDOW_DAYS) return null;

  const originFull = ongoing?.destination.trim() || HOME_ORIGIN;
  return {
    origin: shortName(originFull),
    originFull,
    destination: shortName(next.destination),
    destinationFull: next.destination.trim(),
    title: next.title,
    days,
    startDate: next.startDate,
    endDate: next.endDate,
    fromTrip: Boolean(ongoing),
    coverUrl: next.coverUrl ?? null,
  };
}

const MONTHS_HU = [
  "jan.",
  "febr.",
  "márc.",
  "ápr.",
  "máj.",
  "jún.",
  "júl.",
  "aug.",
  "szept.",
  "okt.",
  "nov.",
  "dec.",
];

export function formatIntroRange(startDate: string, endDate: string): string {
  const [sy, sm, sd] = startDate.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endDate.slice(0, 10).split("-").map(Number);
  const start = `${sy}. ${MONTHS_HU[sm - 1]} ${sd}.`;
  if (sy === ey && sm === em) return `${start} – ${ed}.`;
  if (sy === ey) return `${start} – ${MONTHS_HU[em - 1]} ${ed}.`;
  return `${start} – ${ey}. ${MONTHS_HU[em - 1]} ${ed}.`;
}
