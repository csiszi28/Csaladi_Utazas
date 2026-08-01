"use client";

import { useEffect, useState } from "react";
import {
  WifiOff,
  CalendarDays,
  Backpack,
  FileText,
  ExternalLink,
} from "lucide-react";
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
          Az offline napcsomagban az útiterv, a csomagolás és a kulcsdokumentumok
          láthatók — ha előtte online mentetted őket.
        </p>
      </div>

      {snapshots.length > 0 ? (
        <div className="w-full max-w-md space-y-3 text-left">
          {snapshots.map((snap) => {
            const packingLeft =
              snap.packing?.filter((p) => !p.isPacked).length ?? 0;
            const docs = snap.documents ?? [];
            return (
              <article
                key={`${snap.tripId}:${snap.day}`}
                className="rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{snap.tripTitle}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Offline
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {snap.day} · {snap.destination}
                      </p>
                    </div>

                    <ul className="space-y-1">
                      {snap.items.slice(0, 6).map((item, idx) => (
                        <li key={idx} className="text-xs text-foreground/90">
                          {item.time ? `${item.time} · ` : ""}
                          {item.title}
                          {item.location ? (
                            <span className="text-muted-foreground"> · {item.location}</span>
                          ) : null}
                        </li>
                      ))}
                      {snap.items.length > 6 ? (
                        <li className="text-xs text-muted-foreground">
                          +{snap.items.length - 6} további program
                        </li>
                      ) : null}
                    </ul>

                    {snap.packing && snap.packing.length > 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/30 p-2">
                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <Backpack className="h-3 w-3" />
                          Csomagolás
                          {packingLeft > 0 ? ` · ${packingLeft} hiányzik` : " · kész"}
                        </p>
                        <ul className="space-y-0.5">
                          {snap.packing.slice(0, 8).map((item, idx) => (
                            <li
                              key={idx}
                              className={`text-xs ${item.isPacked ? "text-muted-foreground line-through" : "text-foreground"}`}
                            >
                              {item.quantity > 1 ? `${item.quantity}× ` : ""}
                              {item.title}
                              {item.assigneeName ? ` · ${item.assigneeName}` : ""}
                            </li>
                          ))}
                          {snap.packing.length > 8 ? (
                            <li className="text-xs text-muted-foreground">
                              +{snap.packing.length - 8} további
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}

                    {docs.length > 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/30 p-2">
                        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Kulcsdokumentumok
                        </p>
                        <ul className="space-y-1">
                          {docs.map((doc) => (
                            <li key={doc.id}>
                              <a
                                href={doc.downloadPath}
                                className="inline-flex max-w-full items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                              >
                                <span className="truncate">{doc.fileName}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                              </a>
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                {doc.categoryLabel}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          compact
          title="Még nincs mentett napcsomag"
          description="Online módban az utazás Áttekintés / Útiterv fülén mentsd el a napot offline."
          className="w-full max-w-md border-0 bg-transparent px-0"
        />
      )}

      <Button asChild className="min-h-[var(--touch-target)]">
        <a href="/">Újrapróbálás</a>
      </Button>
    </div>
  );
}
