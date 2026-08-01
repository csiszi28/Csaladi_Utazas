"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Plane, BedDouble } from "lucide-react";
import { formatDate, isSameDay } from "@csaladi-utazas/shared";
import type { CalendarTripRow } from "@/lib/queries/trips";
import { cn } from "@/lib/utils";

interface TodayFamilyWidgetProps {
  trips: CalendarTripRow[];
  className?: string;
}

function isAccommodationNight(day: Date, checkIn: Date | string, checkOut: Date | string) {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  return d >= start && d < end;
}

export function TodayFamilyWidget({ trips, className }: TodayFamilyWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayTrips = trips.filter((t) => {
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  });

  const programs = dayTrips.flatMap((t) =>
    t.programs
      .filter((p) => isSameDay(new Date(p.date), today))
      .map((p) => ({
        ...p,
        tripId: t.id,
        tripTitle: t.title,
        people: p.participants.map((x) => x.familyMember.name),
      }))
  );

  const transports = dayTrips.flatMap((t) =>
    (t.transports ?? [])
      .filter((tr) => isSameDay(new Date(tr.departureDate), today))
      .map((tr) => ({
        id: tr.id,
        title: tr.title,
        time: tr.departureTime,
        tripId: t.id,
        people: tr.participants.map((x) => x.familyMember.name),
      }))
  );

  const stays = dayTrips.flatMap((t) =>
    (t.accommodations ?? [])
      .filter((a) => isAccommodationNight(today, a.checkIn, a.checkOut))
      .map((a) => ({
        id: a.id,
        title: a.title,
        tripId: t.id,
        people: a.participants.map((x) => x.familyMember.name),
      }))
  );

  const hasAnything =
    dayTrips.length > 0 || programs.length > 0 || transports.length > 0 || stays.length > 0;

  if (!hasAnything) return null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CalendarDays className="h-4 w-4" />
            Ma a családdal
          </p>
          <h2 className="mt-0.5 font-display text-lg font-bold tracking-tight">
            {formatDate(today)}
          </h2>
        </div>
        {dayTrips[0] ? (
          <Link
            href={`/trips/${dayTrips[0].id}?day=${formatDate(today)}`}
            className="shrink-0 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Utazás megnyitása
          </Link>
        ) : null}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {dayTrips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="flex min-h-[var(--touch-target)] items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
          >
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{trip.title}</span>
            <span className="truncate text-xs text-muted-foreground">{trip.destination}</span>
          </Link>
        ))}

        {programs.length > 0 ? (
          <ul className="space-y-2">
            {programs.slice(0, 4).map((program) => (
              <li key={program.id}>
                <Link
                  href={`/trips/${program.tripId}?tab=planning&day=${formatDate(today)}`}
                  className="block rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p className="text-sm font-medium">{program.title}</p>
                    {program.startTime ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {program.startTime}
                      </span>
                    ) : null}
                  </div>
                  {program.people.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {program.people.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{program.tripTitle}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {transports.length > 0 ? (
          <ul className="space-y-1.5">
            {transports.slice(0, 3).map((tr) => (
              <li
                key={tr.id}
                className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-2 text-sm"
              >
                <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{tr.title}</span>
                  {tr.time ? (
                    <span className="text-muted-foreground"> · {tr.time}</span>
                  ) : null}
                  {tr.people.length > 0 ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {tr.people.join(", ")}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {stays.length > 0 ? (
          <ul className="space-y-1.5">
            {stays.slice(0, 2).map((stay) => (
              <li
                key={stay.id}
                className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-2 text-sm"
              >
                <BedDouble className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{stay.title}</span>
                  {stay.people.length > 0 ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {stay.people.join(", ")}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
