"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BedDouble,
  CalendarDays,
  Download,
  Plane,
  Printer,
  Share2,
  WifiOff,
} from "lucide-react";
import {
  buildDayItinerary,
  formatDate,
  listTripDays,
  parseDate,
  type ItineraryItem,
} from "@csaladi-utazas/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { TripDetailRow } from "@/lib/queries/trips";
import type { TripDetailTab } from "@/components/trips/trip-detail-tabs";
import { OFFLINE_DAY_PREFIX } from "@/lib/offline-day";
import {
  prefetchOfflineDocuments,
  writeOfflineDaySnapshot,
  type OfflineDocItem,
} from "@/lib/offline-snapshots";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@csaladi-utazas/shared";

const WEEKDAYS_SHORT = ["V", "H", "K", "Sze", "Cs", "P", "Szo"] as const;

function kindIcon(kind: ItineraryItem["kind"]) {
  switch (kind) {
    case "transport":
      return <Plane className="h-3.5 w-3.5 shrink-0" />;
    case "accommodation_checkin":
    case "accommodation_checkout":
      return <BedDouble className="h-3.5 w-3.5 shrink-0" />;
    default:
      return <CalendarDays className="h-3.5 w-3.5 shrink-0" />;
  }
}

function kindLabel(kind: ItineraryItem["kind"]) {
  switch (kind) {
    case "transport":
      return "Közlekedés";
    case "accommodation_checkin":
      return "Bejelentkezés";
    case "accommodation_checkout":
      return "Kijelentkezés";
    default:
      return "Program";
  }
}

function dayMeta(dayKey: string) {
  const date = parseDate(dayKey);
  return {
    weekday: WEEKDAYS_SHORT[date.getDay()] ?? "",
    dayNum: date.getDate(),
  };
}

interface TripItinerarySectionProps {
  trip: TripDetailRow;
  initialDay?: string | null;
  canEdit: boolean;
  onNavigateTab: (tab: TripDetailTab) => void;
}

export function TripItinerarySection({
  trip,
  initialDay,
  canEdit,
  onNavigateTab,
}: TripItinerarySectionProps) {
  const days = useMemo(
    () => listTripDays(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const todayKey = formatDate(new Date());
  const defaultDay =
    initialDay && days.includes(initialDay)
      ? initialDay
      : days.includes(todayKey)
        ? todayKey
        : days[0] ?? todayKey;

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [offlineSaved, setOfflineSaved] = useState(false);

  useEffect(() => {
    if (initialDay && days.includes(initialDay)) {
      setSelectedDay(initialDay);
    }
  }, [initialDay, days]);

  useEffect(() => {
    try {
      const key = `${OFFLINE_DAY_PREFIX}${trip.id}:${selectedDay}`;
      setOfflineSaved(Boolean(localStorage.getItem(key)));
    } catch {
      setOfflineSaved(false);
    }
  }, [trip.id, selectedDay]);

  const items = useMemo(
    () =>
      buildDayItinerary(selectedDay, {
        programs: trip.programs,
        transports: trip.transports,
        accommodations: trip.accommodations,
      }),
    [selectedDay, trip.programs, trip.transports, trip.accommodations]
  );

  const selectedIndex = days.indexOf(selectedDay);
  const dayLabel =
    selectedDay === todayKey
      ? "Ma"
      : selectedIndex >= 0
        ? `${selectedIndex + 1}. nap`
        : selectedDay;

  async function saveOffline() {
    const packing = trip.packingItems.map((item) => ({
      title: item.title,
      quantity: item.quantity ?? 1,
      isPacked: item.isPacked,
      assigneeName: item.assignee?.name ?? null,
    }));

    const keyDocCategories = new Set([
      "PASSPORT",
      "INSURANCE",
      "VOUCHER",
      "TICKET",
      "PROGRAM_TICKET",
      "PROGRAM_BOOKING",
      "PROGRAM_MAP",
      "PROGRAM_INFO",
    ]);

    const documents: OfflineDocItem[] = trip.documents
      .filter((doc) => keyDocCategories.has(doc.category) || doc.category === "OTHER")
      .filter((doc) => doc.category !== "PHOTO")
      .slice(0, 16)
      .map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        category: doc.category,
        categoryLabel:
          DOCUMENT_CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category,
        downloadPath: `/api/documents/${doc.id}/download`,
      }));

    const payload = {
      tripId: trip.id,
      tripTitle: trip.title,
      destination: trip.destination,
      day: selectedDay,
      items: items.map((item) => ({
        title: item.title,
        time: item.time,
        endTime: item.endTime ?? null,
        kind: item.kind,
        location: item.location ?? null,
      })),
      packing,
      documents,
      savedAt: new Date().toISOString(),
    };

    const ok = writeOfflineDaySnapshot(payload);
    if (!ok) {
      toast.error("Nem sikerült menteni offline");
      return;
    }

    setOfflineSaved(true);
    const cachedDocs = await prefetchOfflineDocuments(documents);
    const packingLeft = packing.filter((p) => !p.isPacked).length;
    toast.success(
      cachedDocs > 0
        ? `Napcsomag mentve · ${packingLeft} csomagolnivaló · ${cachedDocs} doksi cache`
        : `Napcsomag mentve · ${packing.length} csomag · ${documents.length} doksi`
    );
  }

  function shareDay() {
    const lines = [
      `${trip.title} — ${selectedDay}`,
      trip.destination,
      "",
      ...items.map((item) => {
        const time = item.time
          ? `${item.time}${item.endTime ? `–${item.endTime}` : ""} · `
          : "";
        return `• ${time}${item.title}${item.location ? ` (${item.location})` : ""}`;
      }),
    ];
    const text = lines.join("\n");

    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator
        .share({ title: `${trip.title} · ${selectedDay}`, text })
        .catch(() => undefined);
      return;
    }

    void navigator.clipboard.writeText(text).then(
      () => toast.success("Napi útiterv a vágólapra másolva"),
      () => toast.error("Nem sikerült másolni")
    );
  }

  function printDay() {
    window.print();
  }

  function onItemClick(item: ItineraryItem) {
    if (item.kind === "transport") onNavigateTab("transport");
    else if (item.kind.startsWith("accommodation")) onNavigateTab("accommodations");
    else onNavigateTab("planning");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Útiterv
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
              Napi útiterv
            </h2>
            <span className="text-sm text-muted-foreground">
              {dayLabel}
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="tabular-nums">{selectedDay}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[var(--touch-target)] gap-1.5 text-muted-foreground sm:min-h-8"
            onClick={shareDay}
            disabled={items.length === 0}
            aria-label="Megosztás"
            title="Megosztás"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Megosztás</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[var(--touch-target)] gap-1.5 text-muted-foreground sm:min-h-8"
            onClick={printDay}
            disabled={items.length === 0}
            aria-label="Nyomtatás"
            title="Nyomtatás"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nyomtatás</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "min-h-[var(--touch-target)] gap-1.5 sm:min-h-8",
              offlineSaved
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-muted-foreground"
            )}
            onClick={saveOffline}
            aria-label={offlineSaved ? "Mentve offline" : "Napcsomag mentése offline"}
            title={offlineSaved ? "Mentve offline" : "Napcsomag mentése offline"}
          >
            {offlineSaved ? (
              <WifiOff className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {offlineSaved ? "Mentve" : "Napcsomag"}
            </span>
          </Button>
        </div>
      </div>

      <div className="hidden print:block">
        <h2 className="text-lg font-bold">
          {trip.title} — {selectedDay}
        </h2>
        <p className="text-sm text-muted-foreground">{trip.destination}</p>
      </div>

      <div
        role="tablist"
        aria-label="Nap választása"
        className="print:hidden"
      >
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day) => {
            const meta = dayMeta(day);
            const isSelected = selectedDay === day;
            const isToday = day === todayKey;
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "group relative flex min-w-[3.35rem] shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2.5 transition-all duration-200",
                  "min-h-[var(--touch-target)] touch-manipulation active:scale-[0.97] sm:min-h-0",
                  isSelected
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/80 dark:bg-white/10 dark:ring-white/15"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "text-[0.65rem] font-semibold uppercase tracking-[0.14em]",
                    isSelected ? "text-[var(--brand-accent)]" : "text-muted-foreground/75"
                  )}
                >
                  {isToday ? "Ma" : meta.weekday}
                </span>
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums leading-none tracking-tight",
                    isSelected && "text-foreground"
                  )}
                >
                  {meta.dayNum}
                </span>
                {isSelected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-[var(--brand-accent)] shadow-[0_0_8px_rgba(255,184,102,0.55)]"
                  />
                ) : isToday ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 bottom-1.5 h-0.5 rounded-full bg-[var(--brand-accent)]/40"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <div
          aria-hidden
          className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          compact
          title="Ezen a napon nincs program"
          description={
            canEdit
              ? "Adj hozzá elemeket a Programok, Szállás vagy Közlekedés fülön."
              : undefined
          }
        />
      ) : (
        <ol className="relative space-y-2.5">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-3">
              <div className="flex w-10 shrink-0 flex-col items-center pt-0.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border/70 dark:bg-white/8 dark:ring-white/10">
                  {kindIcon(item.kind)}
                </span>
                {index < items.length - 1 ? (
                  <span
                    aria-hidden
                    className="mt-2 w-px flex-1 bg-gradient-to-b from-border to-transparent"
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-card/60 px-3.5 py-3 text-left transition-all duration-200 hover:border-primary/25 hover:bg-card hover:shadow-sm active:scale-[0.99] print:border-0 print:bg-transparent print:p-0 print:shadow-none"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {kindLabel(item.kind)}
                  </span>
                  {item.time ? (
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {item.time}
                      {item.endTime ? `–${item.endTime}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium leading-snug tracking-tight">
                  {item.title}
                </p>
                {item.location ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.location}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export { OFFLINE_DAY_PREFIX } from "@/lib/offline-day";
