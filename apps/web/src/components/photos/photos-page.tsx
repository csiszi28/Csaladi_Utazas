"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Filter, Images } from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { PhotoLightbox, type PhotoLightboxItem } from "@/components/photos/photo-lightbox";
import type { DocumentsOverviewTrip } from "@/lib/queries/documents";
import { getDocumentSignedUrl } from "@/actions/documents";
import { getCachedDocumentUrl } from "@/lib/document-url-cache";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ALL = "__all__";
type GroupMode = "day" | "location";

export function PhotosPage({ trips }: { trips: DocumentsOverviewTrip[] }) {
  const [tripFilter, setTripFilter] = useState(ALL);
  const [groupMode, setGroupMode] = useState<GroupMode>("day");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photoRows = useMemo(() => {
    const rows: Array<{
      trip: DocumentsOverviewTrip;
      doc: DocumentsOverviewTrip["documents"][number];
    }> = [];

    for (const trip of trips) {
      if (tripFilter !== ALL && trip.id !== tripFilter) continue;
      for (const doc of trip.documents) {
        if (doc.category !== "PHOTO") continue;
        rows.push({ trip, doc });
      }
    }

    return rows;
  }, [trips, tripFilter]);

  const groupedRows = useMemo(() => {
    const keyFor = (row: (typeof photoRows)[number]) =>
      groupMode === "day"
        ? row.doc.takenAt
          ? formatDate(row.doc.takenAt)
          : formatDate(row.doc.uploadedAt)
        : row.doc.locationLabel?.trim() || "Ismeretlen hely";

    const map = new Map<string, typeof photoRows>();
    for (const row of photoRows) {
      const key = keyFor(row);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    const entries = [...map.entries()];
    entries.sort((a, b) => {
      if (a[0] === "Ismeretlen hely") return 1;
      if (b[0] === "Ismeretlen hely") return -1;
      return groupMode === "day" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]);
    });
    return entries;
  }, [photoRows, groupMode]);

  const totalPhotoCount = useMemo(
    () =>
      trips.reduce(
        (sum, trip) => sum + trip.documents.filter((d) => d.category === "PHOTO").length,
        0
      ),
    [trips]
  );

  const tripsWithPhotos = useMemo(
    () => trips.filter((trip) => trip.documents.some((d) => d.category === "PHOTO")),
    [trips]
  );

  useEffect(() => {
    let cancelled = false;
    const missingIds = photoRows
      .map(({ doc }) => doc.id)
      .filter((id) => !urls[id]);

    if (missingIds.length === 0) return;

    async function load() {
      const fetched: Record<string, string> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            fetched[id] = await getCachedDocumentUrl(getDocumentSignedUrl, id);
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled) {
        setUrls((prev) => ({ ...prev, ...fetched }));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [photoRows, urls]);

  const lightboxItems: PhotoLightboxItem[] = photoRows.map(({ trip, doc }) => ({
    id: doc.id,
    fileName: doc.fileName,
    url: urls[doc.id],
    caption: trip.title,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Images className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fotók</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {totalPhotoCount} fotó az összes elérhető utazásból — csak megtekintés.
            </p>
          </div>
        </div>
      </section>

      <section className="min-w-0 space-y-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Szűrő
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label>Utazás</Label>
            <Select value={tripFilter} onValueChange={setTripFilter}>
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="Összes utazás" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Összes utazás</SelectItem>
                {tripsWithPhotos.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label>Csoportosítás</Label>
            <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Nap</SelectItem>
                <SelectItem value="location">Hely</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {tripFilter !== ALL ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setTripFilter(ALL)}>
            Szűrő törlése
          </Button>
        ) : null}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        {photoRows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-12 text-center">
            <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {totalPhotoCount === 0
                ? "Még nincsenek feltöltött fotók."
                : "Nincs találat a szűrő alapján."}
            </p>
            {totalPhotoCount === 0 ? (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/trips">Utazások megnyitása</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{photoRows.length} fotó</p>
            {groupedRows.map(([groupLabel, rows]) => (
              <div key={groupLabel} className="space-y-2">
                <div className="sticky top-0 z-[1] -mx-1 bg-background/95 px-1 py-1.5 text-sm font-semibold backdrop-blur">
                  {groupLabel}
                  <span className="ml-1.5 font-normal text-muted-foreground">({rows.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {rows.map(({ trip, doc }) => {
                    const index = photoRows.findIndex((r) => r.doc.id === doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted text-left"
                        onClick={() => setLightboxIndex(index)}
                      >
                        {urls[doc.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urls[doc.id]}
                            alt={doc.fileName}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                            …
                          </div>
                        )}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white">
                          {trip.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PhotoLightbox
        items={lightboxItems}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
