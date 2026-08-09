"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { bustTripViewCache, pullTripRevision } from "@/actions/trip-sync";

const POLL_VISIBLE_MS = 1000;
const POLL_HIDDEN_MS = 8000;

function toRevisionIso(value: string | Date | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  try {
    const parsed = new Date(value as string | number | Date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  } catch {
    return "";
  }
}

/**
 * Látható trip detailnél ~1s-enként nézi a contentUpdatedAt-et.
 * Változáskor cache bust + router.refresh() — cél: módosítás <5s alatt mindenkinél.
 */
export function useTripLiveSync(tripId: string, contentUpdatedAt: string | Date | null | undefined) {
  const router = useRouter();
  const knownRef = useRef(toRevisionIso(contentUpdatedAt));
  const busyRef = useRef(false);

  // Props csak akkor írhatják felül a known revisiont, ha újabbak (ne reseteljenek stale cache-re)
  useEffect(() => {
    const fromProps = toRevisionIso(contentUpdatedAt);
    if (!fromProps) return;
    if (!knownRef.current || fromProps > knownRef.current) {
      knownRef.current = fromProps;
    }
  }, [contentUpdatedAt]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) return;

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(poll, POLL_HIDDEN_MS);
        return;
      }

      if (!busyRef.current) {
        try {
          const result = await pullTripRevision(tripId);
          const next = toRevisionIso(result);

          if (next) {
            if (!knownRef.current) {
              knownRef.current = next;
            } else if (next !== knownRef.current) {
              knownRef.current = next;
              busyRef.current = true;
              try {
                await bustTripViewCache(tripId);
                router.refresh();
              } finally {
                // Adj időt a friss RSC payloadnak, mielőtt újra pollolnánk
                window.setTimeout(() => {
                  busyRef.current = false;
                }, 800);
              }
            }
          }
        } catch {
          // hálózat — következő kör
        }
      }

      if (!cancelled) {
        const delay =
          typeof document !== "undefined" && document.visibilityState === "visible"
            ? POLL_VISIBLE_MS
            : POLL_HIDDEN_MS;
        timer = setTimeout(poll, delay);
      }
    }

    timer = setTimeout(poll, 400);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void poll();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tripId, router]);
}
