"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import type { CalendarTripRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import {
  formatDate,
  getDaysInMonth,
  isDateInRange,
  isSameDay,
  isAccommodationNight,
  parseDate,
  buildDayCostBreakdown,
  type TripCostContext,
  type HufRateMap,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monogram, MonogramGroup } from "@/components/monogram";
import { useHufRates } from "@/components/exchange-rates-provider";
import { CalendarDayDrawer } from "./calendar-day-drawer";
import { TodayFamilyWidget } from "./today-family-widget";
import { FirstUseGuide } from "@/components/onboarding/first-use-guide";
import { EmptyState } from "@/components/ui/empty-state";
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
    dayAccommodations: [],
    dayTransports: [],
    dayIdeas: [],
    dayCosts: [],
    totalCost: 0,
    totalCostHuf: 0,
    badgeMembers: [],
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
    accommodations: (trip.accommodations ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      checkIn: new Date(a.checkIn),
      checkOut: new Date(a.checkOut),
      participantIds: a.participants.map((x) => x.familyMember.id),
      costs: a.costs,
    })),
    tripLevelCosts: trip.costs.filter(
      (c) => !c.programId && !c.accommodationId && !c.transportId
    ),
  };
}

function tripHasItemsOnDay(trip: CalendarTripRow, day: Date): boolean {
  if (isDateInRange(day, trip.startDate, trip.endDate)) return true;
  if (trip.programs.some((p) => isSameDay(new Date(p.date), day))) return true;
  if ((trip.accommodations ?? []).some((a) => isAccommodationNight(day, a.checkIn, a.checkOut))) {
    return true;
  }
  if ((trip.transports ?? []).some((tr) => isSameDay(new Date(tr.departureDate), day))) {
    return true;
  }
  return (trip.ideas ?? []).some(
    (idea) =>
      (idea.date != null && isSameDay(new Date(idea.date), day)) ||
      (idea.checkInDate != null && isSameDay(new Date(idea.checkInDate), day)) ||
      (idea.checkOutDate != null && isSameDay(new Date(idea.checkOutDate), day)) ||
      (idea.checkInDate != null &&
        idea.checkOutDate != null &&
        isAccommodationNight(day, idea.checkInDate, idea.checkOutDate))
  );
}

function buildDayData(day: Date, trips: CalendarTripRow[], rates: HufRateMap) {
  const dayTrips = trips.filter((t) => tripHasItemsOnDay(t, day));

  const dayPrograms = dayTrips.flatMap((t) =>
    t.programs
      .filter((p) => isSameDay(new Date(p.date), day))
      .map((p) => ({ ...p, tripTitle: t.title, tripId: t.id }))
  );

  const dayAccommodations = dayTrips.flatMap((t) =>
    (t.accommodations ?? [])
      .filter((a) => isAccommodationNight(day, a.checkIn, a.checkOut))
      .map((a) => ({ ...a, tripTitle: t.title, tripId: t.id }))
  );

  const dayTransports = dayTrips.flatMap((t) =>
    (t.transports ?? [])
      .filter((tr) => isSameDay(new Date(tr.departureDate), day))
      .map((tr) => ({ ...tr, tripTitle: t.title, tripId: t.id }))
  );

  const dayIdeas = dayTrips.flatMap((t) =>
    (t.ideas ?? []).flatMap((idea) => {
      const items: Array<
        CalendarTripRow["ideas"][number] & {
          tripTitle: string;
          tripId: string;
          ideaLabel: string;
        }
      > = [];
      if (idea.date && isSameDay(new Date(idea.date), day)) {
        items.push({ ...idea, tripTitle: t.title, tripId: t.id, ideaLabel: "Ötlet" });
      }
      if (idea.checkInDate && isSameDay(new Date(idea.checkInDate), day)) {
        items.push({
          ...idea,
          tripTitle: t.title,
          tripId: t.id,
          ideaLabel: "Ötlet · szállás",
        });
      } else if (
        idea.checkInDate &&
        idea.checkOutDate &&
        isAccommodationNight(day, idea.checkInDate, idea.checkOutDate) &&
        !isSameDay(new Date(idea.checkInDate), day)
      ) {
        items.push({
          ...idea,
          tripTitle: t.title,
          tripId: t.id,
          ideaLabel: "Ötlet · szállás",
        });
      }
      return items;
    })
  );

  const dayCosts = dayTrips.flatMap((t) => {
    if (!isDateInRange(day, t.startDate, t.endDate)) return [];
    const programCosts = t.programs
      .filter((p) => isSameDay(new Date(p.date), day))
      .flatMap((p) => p.costs);
    const accommodationCosts = (t.accommodations ?? [])
      .filter((a) => isAccommodationNight(day, a.checkIn, a.checkOut))
      .flatMap((a) => a.costs);
    const transportCosts = (t.transports ?? [])
      .filter((tr) => isSameDay(new Date(tr.departureDate), day))
      .flatMap((tr) => tr.costs);
    return [
      ...t.costs.filter((c) => !c.programId && !c.accommodationId && !c.transportId),
      ...programCosts,
      ...accommodationCosts,
      ...transportCosts,
    ];
  });

  const totalCost = dayCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalCostHuf = dayTrips.reduce((sum, t) => {
    if (!isDateInRange(day, t.startDate, t.endDate)) return sum;
    const breakdown = buildDayCostBreakdown(tripToCostContext(t), day, rates);
    return sum + (breakdown?.totalHuf ?? 0);
  }, 0);

  const programParticipants = [
    ...new Map(
      dayPrograms
        .flatMap((p) => p.participants.map((x) => x.familyMember))
        .map((m) => [m.id, { id: m.id, name: m.name }] as const)
    ).values(),
  ];

  const tripParticipants = [
    ...new Map(
      dayTrips
        .flatMap((t) => t.participants.map((p) => p.familyMember))
        .map((m) => [m.id, { id: m.id, name: m.name }] as const)
    ).values(),
  ];

  const badgeMembers =
    programParticipants.length > 0 ? programParticipants : tripParticipants;

  return {
    dayTrips,
    dayPrograms,
    dayAccommodations,
    dayTransports,
    dayIdeas,
    dayCosts,
    totalCost,
    totalCostHuf,
    badgeMembers,
  };
}

function hasDayActivity(data: DayData) {
  return (
    data.dayTrips.length > 0 ||
    data.dayPrograms.length > 0 ||
    data.dayAccommodations.length > 0 ||
    data.dayTransports.length > 0 ||
    data.dayIdeas.length > 0 ||
    data.dayCosts.length > 0
  );
}

function memberIdsIntersect(
  participants: Array<{ familyMember: { id: string } }> | Array<{ familyMemberId: string }>,
  filterIds: Set<string>
): boolean {
  if (filterIds.size === 0) return true;
  for (const p of participants) {
    const id = "familyMemberId" in p ? p.familyMemberId : p.familyMember.id;
    if (filterIds.has(id)) return true;
  }
  return false;
}

function filterDayDataByParticipants(data: DayData, filterIds: Set<string>): DayData {
  if (filterIds.size === 0) return data;

  const dayPrograms = data.dayPrograms.filter((p) =>
    memberIdsIntersect(p.participants, filterIds)
  );
  const dayAccommodations = data.dayAccommodations.filter((a) =>
    memberIdsIntersect(a.participants, filterIds)
  );
  const dayTransports = data.dayTransports.filter((tr) =>
    memberIdsIntersect(tr.participants, filterIds)
  );
  const dayIdeas = data.dayIdeas.filter((idea) =>
    memberIdsIntersect(idea.interests, filterIds)
  );
  const dayTrips = data.dayTrips.filter((t) => {
    if (memberIdsIntersect(t.participants, filterIds)) return true;
    return (
      dayPrograms.some((p) => p.tripId === t.id) ||
      dayAccommodations.some((a) => a.tripId === t.id) ||
      dayTransports.some((tr) => tr.tripId === t.id) ||
      dayIdeas.some((i) => i.tripId === t.id)
    );
  });

  const programParticipants = [
    ...new Map(
      dayPrograms
        .flatMap((p) => p.participants.map((x) => x.familyMember))
        .map((m) => [m.id, { id: m.id, name: m.name }] as const)
    ).values(),
  ];
  const tripParticipants = [
    ...new Map(
      dayTrips
        .flatMap((t) => t.participants.map((p) => p.familyMember))
        .filter((m) => filterIds.has(m.id))
        .map((m) => [m.id, { id: m.id, name: m.name }] as const)
    ).values(),
  ];
  const badgeMembers =
    programParticipants.length > 0 ? programParticipants : tripParticipants;

  return {
    ...data,
    dayTrips,
    dayPrograms,
    dayAccommodations,
    dayTransports,
    dayIdeas,
    // Költségek: tartsuk meg, ha van még program/szállás a napon a szűrt személyhez
    dayCosts:
      dayPrograms.length > 0 || dayAccommodations.length > 0 || dayTransports.length > 0
        ? data.dayCosts
        : [],
    totalCost:
      dayPrograms.length > 0 || dayAccommodations.length > 0 || dayTransports.length > 0
        ? data.totalCost
        : 0,
    totalCostHuf:
      dayPrograms.length > 0 || dayAccommodations.length > 0 || dayTransports.length > 0
        ? data.totalCostHuf
        : 0,
    badgeMembers,
  };
}

function dayNumber(date: Date) {
  // getDaysInMonth UTC dél-re épül — lokális getDate() TZ-hibát okozhat
  return date.getUTCDate();
}

function monthOverlapsTrip(year: number, month: number, trip: CalendarTripRow): boolean {
  const monthStart = formatDate(new Date(Date.UTC(year, month, 1, 12, 0, 0)));
  const monthEnd = formatDate(new Date(Date.UTC(year, month + 1, 0, 12, 0, 0)));
  const start = formatDate(trip.startDate);
  const end = formatDate(trip.endDate);
  return start <= monthEnd && end >= monthStart;
}

/** Legközelebbi utazás hónapja — üres aktuális hónapnál ide ugrunk. */
function nearestTripMonth(
  trips: CalendarTripRow[],
  now = new Date()
): { year: number; month: number } {
  if (trips.length === 0) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const todayKey = formatDate(now);
  for (const trip of trips) {
    if (isDateInRange(now, trip.startDate, trip.endDate)) {
      return { year: now.getFullYear(), month: now.getMonth() };
    }
  }

  let best: CalendarTripRow | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  const nowMs = parseDate(todayKey).getTime();

  for (const trip of trips) {
    const startMs = parseDate(trip.startDate).getTime();
    const endMs = parseDate(trip.endDate).getTime();
    const dist = todayKey < formatDate(trip.startDate) ? startMs - nowMs : nowMs - endMs;
    if (dist < bestDist) {
      bestDist = dist;
      best = trip;
    }
  }

  if (!best) return { year: now.getFullYear(), month: now.getMonth() };
  const anchor =
    todayKey < formatDate(best.startDate)
      ? parseDate(best.startDate)
      : parseDate(best.endDate);
  return { year: anchor.getUTCFullYear(), month: anchor.getUTCMonth() };
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
  const weekday = WEEKDAYS_FULL[(day.getUTCDay() + 6) % 7];
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
          <span className="text-base leading-none">{dayNumber(day)}</span>
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
          <span className="text-xl font-bold leading-none sm:text-2xl">{dayNumber(day)}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {primaryTrip && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                <MapPin className="h-3 w-3 shrink-0" />
                {primaryTrip.destination}
              </span>
            )}
            {data.dayTrips.length > 1 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{data.dayTrips.length - 1} utazás
              </span>
            )}
            {data.dayPrograms.length > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {data.dayPrograms.length} program
              </span>
            )}
            {data.dayAccommodations.length > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {data.dayAccommodations.length} szállás
              </span>
            )}
          </div>

          <div className="space-y-1">
            {data.dayPrograms.slice(0, 2).map((program) => (
              <p key={program.id} className="truncate text-sm">
                {program.startTime && (
                  <span className="font-medium text-muted-foreground">{program.startTime} </span>
                )}
                {program.title}
              </p>
            ))}
            {data.dayAccommodations.slice(0, 2).map((accommodation) => (
              <p key={accommodation.id} className="truncate text-sm text-muted-foreground">
                Szállás · {accommodation.title}
              </p>
            ))}
            {data.dayIdeas.slice(0, 1).map((idea) => (
              <p key={`${idea.id}-${idea.ideaLabel}`} className="truncate text-sm text-amber-700/90 dark:text-amber-300/90">
                {idea.ideaLabel}: {idea.title}
              </p>
            ))}
            {data.dayPrograms.length + data.dayAccommodations.length + data.dayIdeas.length > 4 && (
              <p className="text-xs text-muted-foreground">
                +{data.dayPrograms.length + data.dayAccommodations.length + data.dayIdeas.length - 4}{" "}
                további
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {data.badgeMembers.length > 0 && (
              <MonogramGroup members={data.badgeMembers} max={4} />
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
        active && !isToday && "border-sky-200/80 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/25",
        !active && "opacity-70"
      )}
    >
      <div
        className={cn(
          "mb-1 flex h-6 w-6 items-center justify-center rounded-md text-sm font-semibold leading-none sm:h-7 sm:w-7",
          isToday && "bg-primary text-primary-foreground"
        )}
      >
        {dayNumber(day)}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {primaryTrip && (
          <div className="truncate rounded-md bg-sky-100 px-1 py-0.5 text-[9px] font-semibold leading-tight text-sky-900 sm:text-[10px] dark:bg-sky-950 dark:text-sky-200">
            {primaryTrip.destination || primaryTrip.title}
          </div>
        )}
        {data.dayTrips.length > 1 && (
          <div className="truncate text-[8px] text-muted-foreground sm:text-[9px]">
            +{data.dayTrips.length - 1} utazás
          </div>
        )}

        {data.dayAccommodations.slice(0, 1).map((accommodation) => (
          <div
            key={accommodation.id}
            className="truncate rounded-md bg-violet-100/80 px-1 py-0.5 text-[9px] leading-tight text-violet-900 sm:text-[10px] dark:bg-violet-950/60 dark:text-violet-200"
          >
            {accommodation.title}
          </div>
        ))}

        {data.dayPrograms.slice(0, data.dayAccommodations.length > 0 ? 1 : 2).map((program) => (
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

        {data.dayIdeas.length > 0 &&
          data.dayAccommodations.length === 0 &&
          data.dayPrograms.length === 0 && (
            <div className="truncate text-[9px] leading-tight text-amber-800/90 sm:text-[10px] dark:text-amber-300/90">
              {data.dayIdeas[0].title}
            </div>
          )}

        {(() => {
          const programSlots = data.dayAccommodations.length > 0 ? 1 : 2;
          const hiddenPrograms = Math.max(0, data.dayPrograms.length - programSlots);
          const hiddenStays = Math.max(0, data.dayAccommodations.length - 1);
          const hiddenIdeas =
            data.dayAccommodations.length === 0 && data.dayPrograms.length === 0
              ? Math.max(0, data.dayIdeas.length - 1)
              : data.dayIdeas.length;
          const hidden = hiddenPrograms + hiddenStays + hiddenIdeas;
          if (hidden <= 0) return null;
          return (
            <div className="text-[8px] text-muted-foreground sm:text-[9px]">
              +{hidden} további
            </div>
          );
        })()}
      </div>

      {data.badgeMembers.length > 0 && (
        <div className="mt-auto hidden pt-1 sm:block">
          <MonogramGroup members={data.badgeMembers} max={3} />
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
  const today = useMemo(() => new Date(), []);
  const initialMonth = useMemo(() => nearestTripMonth(allTrips, today), [allTrips, today]);
  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileShowAllDays, setMobileShowAllDays] = useState(false);
  const [tripFilterId, setTripFilterId] = useState<string>("all");
  const [showPrograms, setShowPrograms] = useState(true);
  const [showStays, setShowStays] = useState(true);
  const [showCosts, setShowCosts] = useState(true);
  const [participantFilterIds, setParticipantFilterIds] = useState<string[]>([]);
  const didAutoJump = useRef(false);

  const rates = useHufRates();
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  // UTC napok → getUTCDay (hétfő-kezdetű rács)
  const firstDayOfWeek = ((days[0]?.getUTCDay() ?? 1) + 6) % 7;
  const trailingBlanks = CALENDAR_ROWS * 7 - firstDayOfWeek - days.length;

  const trips = useMemo(() => {
    if (tripFilterId === "all") return allTrips;
    return allTrips.filter((trip) => trip.id === tripFilterId);
  }, [allTrips, tripFilterId]);

  useEffect(() => {
    if (didAutoJump.current || allTrips.length === 0) return;
    const hasInView = allTrips.some((trip) => monthOverlapsTrip(year, month, trip));
    didAutoJump.current = true;
    if (hasInView) return;
    const next = nearestTripMonth(allTrips, today);
    setYear(next.year);
    setMonth(next.month);
  }, [allTrips, year, month, today]);

  const filterMembers = useMemo(() => {
    if (tripFilterId === "all") {
      return members.map((m) => ({ id: m.id, name: m.name }));
    }
    const trip = allTrips.find((t) => t.id === tripFilterId);
    if (!trip) return members.map((m) => ({ id: m.id, name: m.name }));
    const fromTrip = trip.participants.map((p) => ({
      id: p.familyMember.id,
      name: p.familyMember.name,
    }));
    return fromTrip.length > 0 ? fromTrip : members.map((m) => ({ id: m.id, name: m.name }));
  }, [members, allTrips, tripFilterId]);

  const participantFilterSet = useMemo(
    () => new Set(participantFilterIds),
    [participantFilterIds]
  );

  const monthIndex = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const day of days) {
      const raw = buildDayData(day, trips, rates);
      const ideas = raw.dayIdeas.filter((idea) => {
        const isStayIdea =
          idea.checkInDate != null ||
          idea.checkOutDate != null ||
          idea.category === "ACCOMMODATION";
        if (isStayIdea) return showStays;
        return showPrograms;
      });
      const layered: DayData = {
        ...raw,
        dayPrograms: showPrograms ? raw.dayPrograms : [],
        dayAccommodations: showStays ? raw.dayAccommodations : [],
        dayTransports: showPrograms ? raw.dayTransports : [],
        dayIdeas: ideas,
        dayCosts: showCosts ? raw.dayCosts : [],
        totalCost: showCosts ? raw.totalCost : 0,
        totalCostHuf: showCosts ? raw.totalCostHuf : 0,
      };
      map.set(dayKey(day), filterDayDataByParticipants(layered, participantFilterSet));
    }
    return map;
  }, [trips, days, rates, showPrograms, showStays, showCosts, participantFilterSet]);

  const monthHasTrips = useMemo(
    () => trips.some((trip) => monthOverlapsTrip(year, month, trip)),
    [trips, year, month]
  );

  const monthStats = useMemo(() => {
    let activeDays = 0;
    let programCount = 0;
    let stayCount = 0;
    let totalHuf = 0;
    const tripIds = new Set<string>();

    for (const day of days) {
      const data = monthIndex.get(dayKey(day)) ?? emptyDayData();
      if (hasDayActivity(data)) activeDays += 1;
      programCount += data.dayPrograms.length;
      stayCount += data.dayAccommodations.length;
      totalHuf += data.totalCostHuf;
      data.dayTrips.forEach((t) => tripIds.add(t.id));
    }

    // Preferáld a dátumtartomány-átfedést — ne csak a napcellákból számolj
    const tripCount = monthHasTrips
      ? Math.max(tripIds.size, trips.filter((t) => monthOverlapsTrip(year, month, t)).length)
      : 0;

    return { activeDays, programCount, stayCount, totalHuf, tripCount };
  }, [days, monthIndex, monthHasTrips, trips, year, month]);

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

  const contentToggles = [
    {
      id: "programs" as const,
      label: "Programok",
      icon: CalendarDays,
      active: showPrograms,
      onToggle: () => setShowPrograms((v) => !v),
    },
    {
      id: "stays" as const,
      label: "Szállás",
      icon: BedDouble,
      active: showStays,
      onToggle: () => setShowStays((v) => !v),
    },
    {
      id: "costs" as const,
      label: "Költségek",
      icon: Receipt,
      active: showCosts,
      onToggle: () => setShowCosts((v) => !v),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8 sm:space-y-8">
      <FirstUseGuide
        hasTrips={allTrips.length > 0}
        hasFamilyMembers={members.length > 0}
      />

      <TodayFamilyWidget trips={allTrips} />

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
                Utazások, programok, szállások és költségek havi áttekintése. Egy napra kattintva
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

          {allTrips.length > 0 ? (
            <div className="space-y-3 border-t border-border/70 pt-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-end">
                <div className="space-y-1.5">
                  <label
                    htmlFor="calendar-trip-filter"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Utazás
                  </label>
                  <Select value={tripFilterId} onValueChange={setTripFilterId}>
                    <SelectTrigger
                      id="calendar-trip-filter"
                      className="h-11 w-full rounded-xl border-border/80 bg-background/80 shadow-none"
                    >
                      <SelectValue placeholder="Utazás választása" />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="all" className="py-2.5">
                        Minden utazás
                      </SelectItem>
                      {allTrips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id} className="py-2.5">
                          {trip.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Megjelenítés</p>
                  <div
                    className="grid grid-cols-3 gap-1 rounded-xl border border-border/80 bg-muted/35 p-1"
                    role="group"
                    aria-label="Naptár megjelenítés"
                  >
                    {contentToggles.map((toggle) => {
                      const Icon = toggle.icon;
                      return (
                        <button
                          key={toggle.id}
                          type="button"
                          onClick={toggle.onToggle}
                          aria-pressed={toggle.active}
                          className={cn(
                            "flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 py-1.5 text-center transition-all sm:min-h-9 sm:flex-row sm:gap-1.5 sm:px-2",
                            toggle.active
                              ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              toggle.active ? "text-primary" : "opacity-70"
                            )}
                          />
                          <span className="text-[11px] font-medium leading-tight sm:text-xs">
                            {toggle.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {filterMembers.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {participantFilterIds.length > 0
                        ? `Szűrve: ${participantFilterIds.length} fő`
                        : "Résztvevő · mindenki"}
                    </p>
                    {participantFilterIds.length > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setParticipantFilterIds([])}
                      >
                        Mindenki
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filterMembers.map((member) => {
                      const filtering = participantFilterIds.length > 0;
                      const selected = filtering && participantFilterIds.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setParticipantFilterIds((prev) => {
                              if (prev.length === 0) return [member.id];
                              if (prev.includes(member.id)) {
                                return prev.filter((id) => id !== member.id);
                              }
                              return [...prev, member.id];
                            });
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-sm transition-colors",
                            selected &&
                              "border-primary bg-primary/10 font-medium text-foreground shadow-sm",
                            filtering && !selected && "border-transparent opacity-40 hover:opacity-70",
                            !filtering &&
                              "border-border/80 bg-background/80 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <Monogram name={member.name} memberId={member.id} className="h-6 w-6" />
                          <span className="max-w-[9rem] truncate text-foreground">{member.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Kattints egy névre a szűréshez. Újra kattintva ki/be kapcsolható.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {(monthStats.tripCount > 0 ||
            monthStats.programCount > 0 ||
            monthStats.stayCount > 0) && (
            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
              {monthStats.tripCount > 0 && (
                <span className="rounded-md bg-background px-2.5 py-1 text-sm shadow-sm">
                  {monthStats.tripCount} utazás
                </span>
              )}
              {monthStats.activeDays > 0 && (
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm text-primary">
                  {monthStats.activeDays} eseményes nap
                </span>
              )}
              {monthStats.programCount > 0 && (
                <span className="rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground">
                  {monthStats.programCount} program
                </span>
              )}
              {monthStats.stayCount > 0 && (
                <span className="rounded-md bg-violet-100 px-2.5 py-1 text-sm text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                  {monthStats.stayCount} szállás-éjszaka
                </span>
              )}
              {monthStats.totalHuf > 0 && (
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  ≈ {monthStats.totalHuf.toLocaleString("hu-HU")} Ft
                </span>
              )}
            </div>
          )}

          {allTrips.length > 0 && !monthHasTrips ? (
            <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">
                Ebben a hónapban nincs utazás. Ugorj a legközelebbi utazás hónapjára.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => {
                  const next = nearestTripMonth(allTrips, today);
                  setYear(next.year);
                  setMonth(next.month);
                }}
              >
                Ugrás az utazáshoz
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {allTrips.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Még nincs utazás a naptárban"
          description="Hozz létre egy utazást, és itt látod majd a programokat naponta bontva."
        >
          <Button asChild className="min-h-[var(--touch-target)]">
            <a href="/trips">Utazások megnyitása</a>
          </Button>
        </EmptyState>
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
          trips={trips}
          members={members}
          currentUserId={currentUserId}
          participantFilterIds={participantFilterIds}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
