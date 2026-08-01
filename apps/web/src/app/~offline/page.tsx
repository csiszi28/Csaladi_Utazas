"use client";

import { useEffect, useState } from "react";
import { WifiOff, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  readOfflineDaySnapshots,
  type OfflineDaySnapshot,
} from "@/lib/offline-snapshots";

export default function OfflinePage() {
  const [snapshots, setSnapshots] = useState<OfflineDaySnapshot[]>([]);

  useEffect(() => {
    setSnapshots(readOfflineDaySnapshots(10));
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center gap-4 bg-background px-6 py-10 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Nincs internetkapcsolat</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Az alkalmazás offline módban korlátozottan érhető el. A mentett napi útitervek alább
          láthatók.
        </p>
      </div>

      {snapshots.length > 0 ? (
        <div className="w-full max-w-md space-y-3 text-left">
          {snapshots.map((snap) => (
            <article
              key={`${snap.tripId}:${snap.day}`}
              className="rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{snap.tripTitle}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Offline
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {snap.day} · {snap.destination}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {snap.items.slice(0, 6).map((item, idx) => (
                      <li key={idx} className="text-xs text-foreground/90">
                        {item.time ? `${item.time} · ` : ""}
                        {item.title}
                      </li>
                    ))}
                    {snap.items.length > 6 ? (
                      <li className="text-xs text-muted-foreground">
                        +{snap.items.length - 6} további
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          title="Még nincs mentett napi útiterv"
          description="Online módban az Áttekintés fülön mentsd el a napot."
          className="w-full max-w-md border-0 bg-transparent px-0"
        />
      )}

      <Button asChild className="min-h-[var(--touch-target)]">
        <a href="/">Újrapróbálás</a>
      </Button>
    </div>
  );
}
