"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Plane } from "lucide-react";
import { buildIntroPlan, formatIntroRange, type IntroTrip } from "@/lib/trip-intro";

interface NextTripCountdownProps {
  trips: { id: string; title: string; destination: string; startDate: Date; endDate: Date }[];
}

const isoDay = (value: Date) => new Date(value).toISOString().slice(0, 10);

/** Főoldali visszaszámláló a következő útig (a nyitóanimáció ugyanazt a logikát használja). */
export function NextTripCountdown({ trips }: NextTripCountdownProps) {
  // A "mai nap" csak kliensen számolható (időzóna) — hidratálási eltérés ellen mount után.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const plan = useMemo(() => {
    if (!now) return null;
    const introTrips: IntroTrip[] = trips.map((trip) => ({
      title: trip.title,
      destination: trip.destination,
      startDate: isoDay(trip.startDate),
      endDate: isoDay(trip.endDate),
    }));
    return buildIntroPlan(introTrips, now);
  }, [trips, now]);

  const target = useMemo(() => {
    if (!plan) return null;
    return trips.find((trip) => isoDay(trip.startDate) === plan.startDate && trip.title === plan.title) ?? null;
  }, [plan, trips]);

  if (!plan || !target) return null;

  const label =
    plan.days === 0 ? "Ma indulunk!" : plan.days === 1 ? "Holnap indulunk" : `${plan.days} nap múlva`;

  return (
    <Link
      href={`/trips/${target.id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#17306b] via-[#1a365d] to-[#3a3f86] p-3.5 text-white shadow-sm transition-transform active:scale-[0.99] sm:gap-4 sm:p-5"
      aria-label={`Következő utazás: ${plan.destinationFull}, ${label}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 text-[#ffb866] sm:h-12 sm:w-12">
        <Plane className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-white/65 uppercase sm:text-xs">
          Következő utunk
        </p>
        <p className="truncate font-display text-base font-bold sm:text-xl">{plan.destinationFull}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-white/70 sm:text-sm">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {plan.title} · {formatIntroRange(plan.startDate, plan.endDate)}
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        {plan.days > 1 ? (
          <>
            <p className="font-display text-3xl leading-none font-extrabold text-[#ffb866] tabular-nums sm:text-4xl">
              {plan.days}
            </p>
            <p className="mt-1 text-[0.65rem] font-semibold tracking-wider text-white/70 uppercase sm:text-xs">
              nap múlva
            </p>
          </>
        ) : (
          <p className="font-display text-sm leading-tight font-extrabold text-[#ffb866] sm:text-lg">{label}</p>
        )}
      </div>
    </Link>
  );
}
