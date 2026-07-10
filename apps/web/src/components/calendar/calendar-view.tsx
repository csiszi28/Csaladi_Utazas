"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Receipt,
  Sparkles,
} from "lucide-react";
import type { CalendarTripRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import {
  formatDate,
  getDaysInMonth,
  isDateInRange,
  isSameDay,
  buildDayCostBreakdown,
  type TripCostContext,
  type HufRateMap,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { useHufRates } from "@/components/exchange-rates-provider";
import { CalendarDayDrawer } from "./calendar-day-drawer";
import { cn } from "@/lib/utils";

const WEEKDAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const WEEKDAYS_FULL = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

const MONTHS = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];

const CALENDAR_ROWS = 6;

function dayKey(date: Date) {
  return formatDate(date);
}

type DayData = ReturnType<typeof buildDayData>;

function emptyDayData(): DayData {
  return {
    dayTrips: [],
    dayPrograms: [],
    dayCosts: [],
    totalCost: 0,
    totalCostHuf: 0,
    badgeNames: [],
  };
}

function tripToCostContext(trip: CalendarTripRow): TripCostContext {
  return {
    id: trip.id,
    title: trip.title,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    participants: trip.participants.map((p) => ({
      id: p.familyMember.id,
      name: p.familyMember.name,
    })),
    programs: trip.programs.map((p) => ({
      id: p.id,
      title: p.title,
      date: new Date(p.date),
      participantIds: p.participants.map((x) => x.familyMember.id),
      costs: p.costs,
    })),
    tripLevelCosts: trip.costs.filter((c) => !c.programId),
  };
}

function buildDayData(day: Date, trips: CalendarTripRow[], rates: HufRateMap) {
  const dayTrips = trips.filter((t) =>
    isDateInRange(day, new Date(t.startDate), new Date(t.endDate))
  );

  const dayPrograms = dayTrips.flatMap((t) =>
    t.programs
      .filter((p) => isSameDay(new Date(p.date), day))
      .map((p) => ({ ...p, tripTitle: t.title, tripId: t.id }))
  );

  const dayCosts = dayTrips.flatMap((t) => {
    const programCosts = t.programs
      .filter((p) => isSameDay(new Date(p.date), day))
      .flatMap((p) => p.costs);
    return [...t.costs.filter((c) => !c.programId), ...programCosts];
  });

  const totalCost = dayCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalCostHuf = dayTrips.reduce((sum, t) => {
    const breakdown = buildDayCostBreakdown(tripToCostContext(t), day, rates);
    return sum + (breakdown?.totalHuf ?? 0);
  }, 0);

  const programParticipantNames = [
    ...new Set(dayPrograms.flatMap((p) => p.participants.map((x) => x.familyMember.name))),
  ];

  const tripParticipantNames = [
    ...new Set(dayTrips.flatMap((t) => t.participants.map((p) => p.familyMember.name))),
  ];

  const badgeNames =
    programParticipantNames.length > 0 ? programParticipantNames : tripParticipantNames;

  return { dayTrips, dayPrograms, dayCosts, totalCost, totalCostHuf, badgeNames };
}

function hasDayActivity(data: DayData) {
  return data.dayTrips.length > 0 || data.dayPrograms.length > 0 || data.dayCosts.length > 0;
}

function MonthNavigation({
  year,
  month,
  onPrev,
  onNext,
  onToday,
  compact = false,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "justify-between" : "rounded-xl border bg-background/80 px-3 py-2 shadow-sm"
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onPrev}
        aria-label="Előző hónap"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-semibold sm:text-base">
          {year}. {MONTHS[month]}
        </p>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={onNext}
        aria-label="Következő hónap"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!compact && (
        <Button variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex" onClick={onToday}>
          Ma
        </Button>
      )}
    </div>
  );
}

function DayAgendaCard({
  day,
  data,
  isToday,
  onClick,
}: {
  day: Date;
  data: DayData;
  isToday: boolean;
  onClick: () => void;
}) {
  const active = hasDayActivity(data);
  const weekday = WEEKDAYS_FULL[(day.getDay() + 6) % 7];
  const primaryTrip = data.dayTrips[0];

  if (!active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-accent/40",
          isToday && "border-primary/40 bg-primary/5"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-semibold",
            isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <span className="text-[0.6rem] uppercase leading-none">{weekday.slice(0, 3)}</span>
          <span className="text-base leading-none">{day.getDate()}</span>
        </div>
        <span className="text-sm text-muted-foreground">Nincs esemény</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        isToday && "border-primary ring-1 ring-primary/20"
      )}
    >
      <div className="flex gap-3 p-3 sm:p-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl sm:h-16 sm:w-16",
            isToday ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
            {weekday.slice(0, 3)}
          </span>
          <span className="text-xl font-bold leading-none sm:text-2xl">{day.getDate()}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {primaryTrip && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                <MapPin className="h-3 w-3 shrink-0" />
                {primaryTrip.destination}
              </span>
            )}
            {data.dayTrips.length > 1 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{data.dayTrips.length - 1} utazás
              </span>
            )}
            {data.dayPrograms.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {data.dayPrograms.length} program
              </span>
            )}
          </div>

          <div className="space-y-1">
            {data.dayPrograms.slice(0, 3).map((program) => (
              <p key={program.id} className="truncate text-sm">
                {program.startTime && (
                  <span className="font-medium text-muted-foreground">{program.startTime} </span>
                )}
                {program.title}
              </p>
            ))}
            {data.dayPrograms.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{data.dayPrograms.length - 3} további program
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {data.badgeNames.length > 0 && (
              <MonogramGroup names={data.badgeNames} max={4} />
            )}
            {data.totalCostHuf > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Receipt className="h-3.5 w-3.5" />
                ≈ {data.totalCostHuf.toLocaleString("hu-HU")} Ft
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function CalendarGridDay({
  day,
  data,
  isToday,
  onClick,
}: {
  day: Date;
  data: DayData;
  isToday: boolean;
  onClick: () => void;
}) {
  const primaryTrip = data.dayTrips[0];
  const active = hasDayActivity(data);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[var(--calendar-cell-min-height)] flex-col rounded-lg border p-1.5 text-left transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm sm:p-2",
        isToday && "border-primary bg-primary/5 ring-1 ring-primary/30",
        !active && "opacity-80"
      )}
    >
      <div
        className={cn(
          "mb-1 flex h-6 w-6 items-center justify-center rounded-md text-sm font-semibold leading-none sm:h-7 sm:w-7",
          isToday && "bg-primary text-primary-foreground"
        )}
      >
        {day.getDate()}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5">
        {primaryTrip && (
          <div className="truncate rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 sm:px-2 sm:text-[10px] dark:bg-sky-950 dark:text-sky-200">
            {primaryTrip.destination}
          </div>
        )}
        {data.dayTrips.length > 1 && (
          <div className="truncate text-[8px] text-muted-foreground sm:text-[9px]">
            +{data.dayTrips.length - 1} utazás
          </div>
        )}

        {data.dayPrograms.slice(0, 2).map((program) => (
          <div
            key={program.id}
            className="truncate text-[9px] leading-tight text-foreground/80 sm:text-[10px]"
          >
            {program.startTime && (
              <span className="text-muted-foreground">{program.startTime} </span>
            )}
            {program.title}
          </div>
        ))}
        {data.dayPrograms.length > 2 && (
          <div className="text-[8px] text-muted-foreground sm:text-[9px]">
            +{data.dayPrograms.length - 2} program
          </div>
        )}
      </div>

      {data.badgeNames.length > 0 && (
        <div className="mt-auto hidden pt-1 sm:block">
          <MonogramGroup names={data.badgeNames} max={3} />
        </div>
      )}
      {data.totalCostHuf > 0 && (
        <div className="truncate text-[8px] font-medium text-emerald-700 sm:text-[9px] dark:text-emerald-400">
          ≈ {data.totalCostHuf.toLocaleString("hu-HU")} Ft
        </div>
      )}
    </button>
  );
}

export function CalendarView({
  trips: allTrips,
  members,
  currentUserId,
}: {
  trips: CalendarTripRow[];
  members: FamilyMemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileShowAllDays, setMobileShowAllDays] = useState(false);

  const rates = useHufRates();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDayOfWeek = (days[0]?.getDay() + 6) % 7;
  const trailingBlanks = CALENDAR_ROWS * 7 - firstDayOfWeek - days.length;

  const monthIndex = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const day of days) {
      map.set(dayKey(day), buildDayData(day, allTrips, rates));
    }
    return map;
  }, [allTrips, days, rates]);

  const monthStats = useMemo(() => {
    let activeDays = 0;
    let programCount = 0;
    let totalHuf = 0;
    const tripIds = new Set<string>();

    for (const day of days) {
      const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
      if (hasDayActivity(data)) activeDays += 1;
      programCount += data.dayPrograms.length;
      totalHuf += data.totalCostHuf;
      data.dayTrips.forEach((t) => tripIds.add(t.id));
    }

    return { activeDays, programCount, totalHuf, tripCount: tripIds.size };
  }, [days, monthIndex]);

  const mobileDays = useMemo(() => {
    if (mobileShowAllDays) return days;
    return days.filter((day) => {
      const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
      return hasDayActivity(data) || isSameDay(day, today);
    });
  }, [days, mobileShowAllDays, monthIndex, today]);

  const inactiveMobileDayCount = days.length - days.filter((day) => {
    const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
    return hasDayActivity(data) || isSameDay(day, today);
  }).length;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setDrawerOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8 sm:space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <CalendarDays className="h-4 w-4" />
                Idővonal
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Naptár</h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Utazások, programok és költségek havi áttekintése. Egy napra kattintva
                szerkesztheted az adatokat.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[var(--touch-target)] sm:min-h-9 sm:w-auto md:hidden"
              onClick={goToToday}
            >
              Ugrás a mai napra
            </Button>
          </div>

          <MonthNavigation
            year={year}
            month={month}
            onPrev={prevMonth}
            onNext={nextMonth}
            onToday={goToToday}
          />

          {(monthStats.tripCount > 0 || monthStats.programCount > 0) && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {monthStats.tripCount > 0 && (
                <span className="rounded-full bg-background px-3 py-1 text-sm shadow-sm">
                  {monthStats.tripCount} utazás
                </span>
              )}
              {monthStats.activeDays > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  {monthStats.activeDays} eseményes nap
                </span>
              )}
              {monthStats.programCount > 0 && (
                <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                  {monthStats.programCount} program
                </span>
              )}
              {monthStats.totalHuf > 0 && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  ≈ {monthStats.totalHuf.toLocaleString("hu-HU")} Ft
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {allTrips.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Még nincs utazás a naptárban</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hozz létre egy utazást, és itt látod majd a programokat naponta bontva.
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-3 md:hidden">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Napi áttekintés</h2>
              {inactiveMobileDayCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto shrink-0 px-2 py-1 text-xs"
                  onClick={() => setMobileShowAllDays((v) => !v)}
                >
                  {mobileShowAllDays ? "Csak eseményes napok" : `Mind a ${days.length} nap`}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {mobileDays.map((day) => {
                const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
                return (
                  <DayAgendaCard
                    key={dayKey(day)}
                    day={day}
                    data={data}
                    isToday={isSameDay(day, today)}
                    onClick={() => handleDayClick(day)}
                  />
                );
              })}
            </div>
          </section>

          <section className="hidden rounded-2xl border bg-card p-2 shadow-sm sm:p-3 md:block">
            <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS_SHORT.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-xs font-semibold text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-start-${i}`}
                  className="min-h-[var(--calendar-cell-min-height)] rounded-lg bg-muted/20"
                  aria-hidden
                />
              ))}
              {days.map((day) => {
                const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
                return (
                  <CalendarGridDay
                    key={dayKey(day)}
                    day={day}
                    data={data}
                    isToday={isSameDay(day, today)}
                    onClick={() => handleDayClick(day)}
                  />
                );
              })}
              {Array.from({ length: Math.max(0, trailingBlanks) }).map((_, i) => (
                <div
                  key={`empty-end-${i}`}
                  className="min-h-[var(--calendar-cell-min-height)] rounded-lg bg-muted/20"
                  aria-hidden
                />
              ))}
            </div>
          </section>
        </>
      )}

      {selectedDate && (
        <CalendarDayDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          date={selectedDate}
          trips={allTrips}
          members={members}
          currentUserId={currentUserId}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
