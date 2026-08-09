import { formatDate, parseDate } from "./date";

export type ItineraryItemKind =
  | "program"
  | "transport"
  | "accommodation_checkin"
  | "accommodation_checkout";

export interface ItineraryProgramInput {
  id: string;
  title: string;
  date: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
}

export interface ItineraryTransportInput {
  id: string;
  title: string;
  departureDate: Date | string;
  departureTime?: string | null;
  arrivalDate?: Date | string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
}

export interface ItineraryAccommodationInput {
  id: string;
  title: string;
  checkIn: Date | string;
  checkOut: Date | string;
  location?: string | null;
}

export interface ItineraryItem {
  id: string;
  kind: ItineraryItemKind;
  title: string;
  time: string | null;
  endTime: string | null;
  location: string | null;
  sortKey: string;
  entityId: string;
}

function dayKey(value: Date | string): string {
  return formatDate(value);
}

function timeSort(time: string | null | undefined): string {
  return time && /^\d{2}:\d{2}$/.test(time) ? time : "99:99";
}

/**
 * Builds a flat, time-sorted itinerary for a single calendar day (YYYY.MM.DD).
 */
export function buildDayItinerary(
  day: string,
  input: {
    programs: ItineraryProgramInput[];
    transports: ItineraryTransportInput[];
    accommodations: ItineraryAccommodationInput[];
  }
): ItineraryItem[] {
  const items: ItineraryItem[] = [];

  for (const p of input.programs) {
    if (dayKey(p.date) !== day) continue;
    items.push({
      id: `program:${p.id}`,
      kind: "program",
      title: p.title,
      time: p.startTime ?? null,
      endTime: p.endTime ?? null,
      location: p.location ?? null,
      sortKey: `${timeSort(p.startTime)}:1:${p.id}`,
      entityId: p.id,
    });
  }

  for (const t of input.transports) {
    if (dayKey(t.departureDate) !== day) continue;
    const location =
      [t.fromLocation, t.toLocation].filter(Boolean).join(" → ") || null;
    items.push({
      id: `transport:${t.id}`,
      kind: "transport",
      title: t.title,
      time: t.departureTime ?? null,
      endTime: null,
      location,
      sortKey: `${timeSort(t.departureTime)}:0:${t.id}`,
      entityId: t.id,
    });
  }

  for (const a of input.accommodations) {
    if (dayKey(a.checkIn) === day) {
      items.push({
        id: `acc-in:${a.id}`,
        kind: "accommodation_checkin",
        title: `Bejelentkezés: ${a.title}`,
        time: null,
        endTime: null,
        location: a.location ?? null,
        sortKey: `08:00:2:${a.id}`,
        entityId: a.id,
      });
    }
    if (dayKey(a.checkOut) === day) {
      items.push({
        id: `acc-out:${a.id}`,
        kind: "accommodation_checkout",
        title: `Kijelentkezés: ${a.title}`,
        time: null,
        endTime: null,
        location: a.location ?? null,
        sortKey: `10:00:3:${a.id}`,
        entityId: a.id,
      });
    }
  }

  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/** All YYYY.MM.DD days from trip start to end (inclusive). */
export function listTripDays(startDate: Date | string, endDate: Date | string): string[] {
  const startKey = formatDate(startDate);
  const endKey = formatDate(endDate);
  const days: string[] = [];
  let cursor = parseDate(startKey);
  while (formatDate(cursor) <= endKey) {
    days.push(formatDate(cursor));
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return days;
}
