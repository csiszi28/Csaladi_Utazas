"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BedDouble,
  CalendarDays,
  Download,
  Plane,
  WifiOff,
} from "lucide-react";
import {
  buildDayItinerary,
  formatDate,
  listTripDays,
  type ItineraryItem,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TripDetailRow } from "@/lib/queries/trips";
import type { TripDetailTab } from "@/components/trips/trip-detail-tabs";
import { OFFLINE_DAY_PREFIX } from "@/lib/offline-day";

function kindIcon(kind: ItineraryItem["kind"]) {
  switch (kind) {
    case "transport":
      return <Plane className="h-4 w-4 shrink-0" />;
    case "accommodation_checkin":
    case "accommodation_checkout":
      return <BedDouble className="h-4 w-4 shrink-0" />;
    default:
      return <CalendarDays className="h-4 w-4 shrink-0" />;
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

  function saveOffline() {
    try {
      const payload = {
        tripId: trip.id,
        tripTitle: trip.title,
        destination: trip.destination,
        day: selectedDay,
        items,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `${OFFLINE_DAY_PREFIX}${trip.id}:${selectedDay}`,
        JSON.stringify(payload)
      );
      setOfflineSaved(true);
    } catch {
      /* ignore quota */
    }
  }

  function onItemClick(item: ItineraryItem) {
    if (item.kind === "transport") onNavigateTab("transport");
    else if (item.kind.startsWith("accommodation")) onNavigateTab("accommodations");
    else onNavigateTab("planning");
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">Napi útiterv</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-[var(--touch-target)] gap-1.5 sm:min-h-8"
          onClick={saveOffline}
        >
          {offlineSaved ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {offlineSaved ? "Mentve offline" : "Mentés offline"}
        </Button>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day) => {
          const short = day.slice(5).replace(".", ".");
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "min-h-[var(--touch-target)] shrink-0 rounded-xl border px-3 py-2 text-sm font-medium tabular-nums transition-colors sm:min-h-9",
                selectedDay === day
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              {day === todayKey ? "Ma" : short}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Ezen a napon nincs program, szállás vagy közlekedés.
          {canEdit ? " Adj hozzá elemeket a megfelelő fülön." : null}
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-border/80 ml-3 pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[1.35rem] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-card text-muted-foreground">
                {kindIcon(item.kind)}
              </span>
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className="w-full rounded-xl border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {kindLabel(item.kind)}
                  </span>
                  {item.time ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {item.time}
                      {item.endTime ? `–${item.endTime}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm font-medium leading-snug">{item.title}</p>
                {item.location ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.location}</p>
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
