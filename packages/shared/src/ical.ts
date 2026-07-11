export interface IcalProgram {
  id: string;
  title: string;
  date: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  url?: string | null;
  description?: string | null;
}

export interface IcalAccommodation {
  id: string;
  title: string;
  checkIn: Date | string;
  checkOut: Date | string;
  location?: string | null;
  url?: string | null;
  description?: string | null;
}

export interface IcalTrip {
  id: string;
  title: string;
  destination: string;
  startDate: Date | string;
  endDate: Date | string;
  programs: IcalProgram[];
  accommodations?: IcalAccommodation[];
}

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcalDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatIcalDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function parseProgramDateTime(program: IcalProgram): { start: Date; end: Date; allDay: boolean } {
  const base = typeof program.date === "string" ? new Date(program.date) : new Date(program.date);

  if (program.startTime) {
    const [sh, sm] = program.startTime.split(":").map(Number);
    const start = new Date(base);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(start);
    if (program.endTime) {
      const [eh, em] = program.endTime.split(":").map(Number);
      end.setHours(eh, em, 0, 0);
      if (end <= start) end.setHours(start.getHours() + 1);
    } else {
      end.setHours(start.getHours() + 1);
    }

    return { start, end, allDay: false };
  }

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, allDay: true };
}

function buildEventUid(tripId: string, eventId: string, prefix = "program"): string {
  return `${prefix}-${eventId}@csaladi-utazas/${tripId}`;
}

function buildEventBlock(trip: IcalTrip, program: IcalProgram, now: Date): string {
  const { start, end, allDay } = parseProgramDateTime(program);
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${buildEventUid(trip.id, program.id)}`,
    `DTSTAMP:${formatIcalDateTime(now)}`,
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcalDate(end)}`);
  } else {
    lines.push(`DTSTART:${formatIcalDateTime(start)}`);
    lines.push(`DTEND:${formatIcalDateTime(end)}`);
  }

  lines.push(`SUMMARY:${escapeIcalText(program.title)}`);

  const descriptionParts = [
    `Utazás: ${trip.title}`,
    `Desztináció: ${trip.destination}`,
    program.description,
    program.url ? `Link: ${program.url}` : null,
  ].filter(Boolean);

  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcalText(descriptionParts.join("\\n"))}`);
  }

  if (program.location) {
    lines.push(`LOCATION:${escapeIcalText(program.location)}`);
  }

  if (program.url) {
    lines.push(`URL:${program.url}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function buildAccommodationEventBlock(trip: IcalTrip, accommodation: IcalAccommodation, now: Date): string {
  const checkIn = typeof accommodation.checkIn === "string"
    ? new Date(accommodation.checkIn)
    : new Date(accommodation.checkIn);
  const checkOut = typeof accommodation.checkOut === "string"
    ? new Date(accommodation.checkOut)
    : new Date(accommodation.checkOut);

  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${buildEventUid(trip.id, accommodation.id, "accommodation")}`,
    `DTSTAMP:${formatIcalDateTime(now)}`,
    `DTSTART;VALUE=DATE:${formatIcalDate(checkIn)}`,
    `DTEND;VALUE=DATE:${formatIcalDate(checkOut)}`,
    `SUMMARY:${escapeIcalText(`🏨 ${accommodation.title}`)}`,
  ];

  const descriptionParts = [
    `Utazás: ${trip.title}`,
    `Desztináció: ${trip.destination}`,
    accommodation.description,
    accommodation.url ? `Link: ${accommodation.url}` : null,
  ].filter(Boolean);

  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcalText(descriptionParts.join("\\n"))}`);
  }

  if (accommodation.location) {
    lines.push(`LOCATION:${escapeIcalText(accommodation.location)}`);
  }

  if (accommodation.url) {
    lines.push(`URL:${accommodation.url}`);
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildTripIcal(trip: IcalTrip): string {
  const now = new Date();
  const programEvents = trip.programs.map((program) => buildEventBlock(trip, program, now));
  const accommodationEvents = (trip.accommodations ?? []).map((accommodation) =>
    buildAccommodationEventBlock(trip, accommodation, now)
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Csaladi Utazas//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(trip.title)}`,
    ...programEvents,
    ...accommodationEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildTripIcalFilename(tripTitle: string): string {
  const slug = tripTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug || "utazas"}-programok.ics`;
}
