"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Plane, BedDouble } from "lucide-react";
import { formatDate, isSameDay, isDateInRange, isAccommodationNight } from "@csaladi-utazas/shared";
import type { CalendarTripRow } from "@/lib/queries/trips";
import { cn } from "@/lib/utils";

interface TodayFamilyWidgetProps {
  trips: CalendarTripRow[];
  className?: string;
}

export function TodayFamilyWidget({ trips, className }: TodayFamilyWidgetProps) {
  const today = new Date();

  const dayTrips = trips.filter((t) => {
    if (isDateInRange(today, t.startDate, t.endDate)) return true;
    if ((t.accommodations ?? []).some((a) => isAccommodationNight(today, a.checkIn, a.checkOut))) {
      return true;
    }
    return t.programs.some((p) => isSameDay(new Date(p.date), today));
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
                  className="flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/40"
                >
                  <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {program.startTime ? `${program.startTime} · ` : ""}
                      {program.title}
                    </p>
                    {program.people.length > 0 ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {program.people.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {transports.length > 0 ? (
          <ul className="space-y-2">
            {transports.slice(0, 3).map((transport) => (
              <li key={transport.id}>
                <Link
                  href={`/trips/${transport.tripId}?tab=planning`}
                  className="flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/40"
                >
                  <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transport.time ? `${transport.time} · ` : ""}
                      {transport.title}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {stays.length > 0 ? (
          <ul className="space-y-2">
            {stays.slice(0, 3).map((stay) => (
              <li key={stay.id}>
                <Link
                  href={`/trips/${stay.tripId}?tab=stays`}
                  className="flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/40"
                >
                  <BedDouble className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{stay.title}</p>
                    {stay.people.length > 0 ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {stay.people.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
