/**
 * Egyszerű, memóriabeli csúszóablakos sebességkorlát.
 * Szerverless környezetben példányonként számol (nem globális), de a vad
 * túlhasználat (hurkok, szkriptek) ellen így is véd; szigorúbb korláthoz
 * Redis/Upstash kell.
 */
type Bucket = number[];

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface RateLimitResult {
  ok: boolean;
  /** Ennyi mp múlva próbálkozhat újra (csak ha !ok). */
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (bucket.length >= limit) {
    buckets.set(key, bucket);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - bucket[0])) / 1000)) };
  }

  bucket.push(now);
  buckets.set(key, bucket);

  if (buckets.size > MAX_KEYS) {
    for (const [k, times] of buckets) {
      if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Túl sok kérés. Próbáld újra később.", code: "RATE_LIMITED" }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSeconds) },
    }
  );
}
