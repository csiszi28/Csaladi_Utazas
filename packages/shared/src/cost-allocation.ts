import { formatDate, isDateInRange, isSameDay } from "./date";
import { toHuf, DEFAULT_HUF_RATES, type Currency } from "./currency";
import type { TripSettlement } from "./settlement";

export type HufRateMap = Record<Currency, number>;

export interface CostParticipant {
  id: string;
  name: string;
}

export interface AllocCost {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountScope?: string;
  programId?: string | null;
  accommodationId?: string | null;
  category: string;
}

export interface AllocProgram {
  id: string;
  title: string;
  date: Date;
  participantIds: string[];
  costs: AllocCost[];
}

export interface AllocAccommodation {
  id: string;
  title: string;
  checkIn: Date;
  checkOut: Date;
  participantIds: string[];
  costs: AllocCost[];
}

export interface TripCostContext {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  participants: CostParticipant[];
  programs: AllocProgram[];
  accommodations?: AllocAccommodation[];
  tripLevelCosts: AllocCost[];
}

export interface PersonAmount {
  id: string;
  name: string;
  amountHuf: number;
}

export interface CostLineItem {
  id: string;
  title: string;
  totalHuf: number;
  perPerson: PersonAmount[];
}

export interface DayCostBreakdown {
  date: string;
  totalHuf: number;
  perPerson: PersonAmount[];
  items: CostLineItem[];
}

export interface ProgramCostBreakdown {
  id: string;
  title: string;
  date: string;
  totalHuf: number;
  perPerson: PersonAmount[];
  items: CostLineItem[];
}

export interface AccommodationCostBreakdown {
  id: string;
  title: string;
  checkIn: string;
  checkOut: string;
  totalHuf: number;
  perPerson: PersonAmount[];
  items: CostLineItem[];
}

export interface TripCostBreakdown {
  tripId: string;
  title: string;
  startDate: string;
  costCount?: number;
  categoryData?: { category: string; label: string; amount: number }[];
  settlement?: TripSettlement;
  totalHuf: number;
  perPerson: PersonAmount[];
  days: DayCostBreakdown[];
  programs: ProgramCostBreakdown[];
  accommodations: AccommodationCostBreakdown[];
}

function tripDayCount(start: Date, end: Date): number {
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

function accommodationNightCount(checkIn: Date, checkOut: Date): number {
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function isAccommodationNight(day: Date, checkIn: Date, checkOut: Date): boolean {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  return d >= start && d < end;
}

function splitAmong(ids: string[], amountHuf: number): Map<string, number> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  const share = amountHuf / ids.length;
  for (const id of ids) map.set(id, share);
  return map;
}

function mergePersonAmounts(
  participants: CostParticipant[],
  amounts: Map<string, number>
): PersonAmount[] {
  return participants.map((p) => ({
    id: p.id,
    name: p.name,
    amountHuf: Math.round(amounts.get(p.id) ?? 0),
  }));
}

function addToMap(target: Map<string, number>, source: Map<string, number>) {
  for (const [id, amt] of source) {
    target.set(id, (target.get(id) ?? 0) + amt);
  }
}

function buildCostLine(
  cost: AllocCost,
  participantIds: string[],
  participants: CostParticipant[],
  rates: HufRateMap,
  amountMultiplier = 1
): CostLineItem {
  const unitHuf = toHuf(cost.amount, cost.currency, rates);
  const totalHuf =
    cost.amountScope === "PER_PERSON"
      ? unitHuf * Math.max(participantIds.length, 1)
      : unitHuf;
  const scaledTotal = totalHuf * amountMultiplier;
  const split = splitAmong(participantIds, scaledTotal);
  return {
    id: cost.id,
    title: cost.title,
    totalHuf: Math.round(scaledTotal),
    perPerson: mergePersonAmounts(participants, split),
  };
}

export function buildTripCostBreakdown(
  trip: TripCostContext,
  rates: HufRateMap = DEFAULT_HUF_RATES
): TripCostBreakdown {
  const participantIds = trip.participants.map((p) => p.id);
  const tripDays = tripDayCount(trip.startDate, trip.endDate);
  const dailyTripShare = 1 / tripDays;

  const totalMap = new Map<string, number>();
  const days: DayCostBreakdown[] = [];

  const cursor = new Date(trip.startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(trip.endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const dayMap = new Map<string, number>();
    const items: CostLineItem[] = [];

    for (const cost of trip.tripLevelCosts) {
      const line = buildCostLine(cost, participantIds, trip.participants, rates, dailyTripShare);
      items.push(line);
      addToMap(dayMap, splitAmong(participantIds, line.totalHuf));
      addToMap(totalMap, splitAmong(participantIds, line.totalHuf));
    }

    for (const program of trip.programs) {
      if (!isSameDay(new Date(program.date), cursor)) continue;
      const ids = program.participantIds.length > 0 ? program.participantIds : participantIds;
      for (const cost of program.costs) {
        const line = buildCostLine(cost, ids, trip.participants, rates);
        items.push(line);
        addToMap(dayMap, splitAmong(ids, line.totalHuf));
        addToMap(totalMap, splitAmong(ids, line.totalHuf));
      }
    }

    for (const accommodation of trip.accommodations ?? []) {
      if (!isAccommodationNight(cursor, accommodation.checkIn, accommodation.checkOut)) continue;
      const nights = accommodationNightCount(accommodation.checkIn, accommodation.checkOut);
      const nightlyShare = 1 / nights;
      const ids =
        accommodation.participantIds.length > 0
          ? accommodation.participantIds
          : participantIds;
      for (const cost of accommodation.costs) {
        const line = buildCostLine(cost, ids, trip.participants, rates, nightlyShare);
        items.push(line);
        addToMap(dayMap, splitAmong(ids, line.totalHuf));
        addToMap(totalMap, splitAmong(ids, line.totalHuf));
      }
    }

    const totalHuf = Math.round([...dayMap.values()].reduce((s, v) => s + v, 0));
    if (items.length > 0 || totalHuf > 0) {
      days.push({
        date: formatDate(cursor),
        totalHuf,
        perPerson: mergePersonAmounts(trip.participants, dayMap),
        items,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const programs: ProgramCostBreakdown[] = trip.programs.map((program) => {
    const ids = program.participantIds.length > 0 ? program.participantIds : participantIds;
    const progMap = new Map<string, number>();
    const items = program.costs.map((cost) => {
      const line = buildCostLine(cost, ids, trip.participants, rates);
      addToMap(progMap, splitAmong(ids, line.totalHuf));
      return line;
    });
    const totalHuf = Math.round([...progMap.values()].reduce((s, v) => s + v, 0));
    return {
      id: program.id,
      title: program.title,
      date: formatDate(program.date),
      totalHuf,
      perPerson: mergePersonAmounts(trip.participants, progMap),
      items,
    };
  });

  const accommodations: AccommodationCostBreakdown[] = (trip.accommodations ?? []).map(
    (accommodation) => {
      const ids =
        accommodation.participantIds.length > 0
          ? accommodation.participantIds
          : participantIds;
      const accMap = new Map<string, number>();
      const items = accommodation.costs.map((cost) => {
        const line = buildCostLine(cost, ids, trip.participants, rates);
        addToMap(accMap, splitAmong(ids, line.totalHuf));
        return line;
      });
      const totalHuf = Math.round([...accMap.values()].reduce((s, v) => s + v, 0));
      return {
        id: accommodation.id,
        title: accommodation.title,
        checkIn: formatDate(accommodation.checkIn),
        checkOut: formatDate(accommodation.checkOut),
        totalHuf,
        perPerson: mergePersonAmounts(trip.participants, accMap),
        items,
      };
    }
  );

  const totalHuf = Math.round([...totalMap.values()].reduce((s, v) => s + v, 0));

  return {
    tripId: trip.id,
    title: trip.title,
    startDate: formatDate(trip.startDate),
    totalHuf,
    perPerson: mergePersonAmounts(trip.participants, totalMap),
    days,
    programs: programs.filter((p) => p.totalHuf > 0),
    accommodations: accommodations.filter((a) => a.totalHuf > 0),
  };
}

export function buildDayCostBreakdown(
  trip: TripCostContext,
  day: Date,
  rates: HufRateMap = DEFAULT_HUF_RATES
): DayCostBreakdown | null {
  if (!isDateInRange(day, trip.startDate, trip.endDate)) return null;
  const full = buildTripCostBreakdown(trip, rates);
  return full.days.find((d) => d.date === formatDate(day)) ?? {
    date: formatDate(day),
    totalHuf: 0,
    perPerson: trip.participants.map((p) => ({ ...p, amountHuf: 0 })),
    items: [],
  };
}

export function costTotalHuf(
  cost: { amount: number; currency: string; amountScope?: string },
  participantCount: number,
  rates: HufRateMap = DEFAULT_HUF_RATES
): number {
  const unitHuf = toHuf(cost.amount, cost.currency, rates);
  const total =
    cost.amountScope === "PER_PERSON"
      ? unitHuf * Math.max(participantCount, 1)
      : unitHuf;
  return Math.round(total);
}

/** 1 főre / összesen átváltás a résztvevők száma alapján (megjelenítéshez). */
export function computeScopedAmounts(
  amount: number,
  amountScope: string | undefined | null,
  participantCount: number
): { perPerson: number; total: number } | null {
  if (participantCount <= 0) return null;

  if (amountScope === "PER_PERSON") {
    return { perPerson: amount, total: amount * participantCount };
  }

  return { perPerson: amount / participantCount, total: amount };
}

export function sumCostsHuf(
  costs: { amount: number; currency: string }[],
  rates: HufRateMap = DEFAULT_HUF_RATES
): number {
  return Math.round(costs.reduce((s, c) => s + toHuf(c.amount, c.currency, rates), 0));
}
