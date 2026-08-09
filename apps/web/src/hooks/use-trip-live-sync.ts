"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_VISIBLE_MS = 1200;
const POLL_HIDDEN_MS = 10000;

type RevisionPayload = {
  success: boolean;
  data?: { contentUpdatedAt: string };
};

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
  // RSC / cache néha plain objectként adja vissza a dátumot
  try {
    const parsed = new Date(value as string | number | Date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  } catch {
    return "";
  }
}

/**
 * Amíg a trip detail nyitva van (és a fül látható), ~1.2s-enként ellenőrzi,
 * változott-e a tartalom — más eszköz/fiók mutációi után automatikus router.refresh().
 */
export function useTripLiveSync(tripId: string, contentUpdatedAt: string | Date | null | undefined) {
  const router = useRouter();
  const knownRef = useRef(toRevisionIso(contentUpdatedAt));
  const refreshPendingRef = useRef(false);

  useEffect(() => {
    const next = toRevisionIso(contentUpdatedAt);
    if (next) knownRef.current = next;
  }, [contentUpdatedAt]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) return;

      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      if (hidden) {
        timer = setTimeout(poll, POLL_HIDDEN_MS);
        return;
      }

      try {
        const res = await fetch(`/api/v1/trips/${tripId}/revision`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = (await res.json()) as RevisionPayload;
          const next = json.data?.contentUpdatedAt
            ? toRevisionIso(json.data.contentUpdatedAt)
            : "";
          if (
            next &&
            knownRef.current &&
            next !== knownRef.current &&
            !refreshPendingRef.current
          ) {
            knownRef.current = next;
            refreshPendingRef.current = true;
            router.refresh();
            window.setTimeout(() => {
              refreshPendingRef.current = false;
            }, 1200);
          } else if (next && !knownRef.current) {
            // Első érvényes revision (régi cache-ből hiányzott a mező)
            knownRef.current = next;
          }
        }
      } catch {
        // hálózat — következő körben újra
      }

      if (!cancelled) {
        timer = setTimeout(
          poll,
          document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS
        );
      }
    }

    timer = setTimeout(poll, POLL_VISIBLE_MS);

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
