const DATE_FORMAT_REGEX = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const ISO_DAY_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

function calendarPartsFromDate(d: Date): { year: number; month: number; day: number } {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function formatParts(year: number, month: number, day: number): string {
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

/**
 * Naptári dátum → YYYY.MM.DD.
 * Fogad Date-et, YYYY.MM.DD-t, YYYY-MM-DD-t és ISO datetime stringet is.
 */
export function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    const dotted = DATE_FORMAT_REGEX.exec(date.trim());
    if (dotted) return dotted[0];

    const isoDay = ISO_DAY_REGEX.exec(date.trim());
    if (isoDay) {
      return formatParts(Number(isoDay[1]), Number(isoDay[2]), Number(isoDay[3]));
    }
  }

  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return formatParts(1970, 1, 1);
  }
  const { year, month, day } = calendarPartsFromDate(d);
  return formatParts(year, month, day);
}

/**
 * YYYY.MM.DD / YYYY-MM-DD / ISO / Date → helyi naptári Date (éjfél).
 * Nem dob hibát ismert formátumokra; ismeretlennél Invalid Date helyett safe fallback.
 */
export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    if (Number.isNaN(dateStr.getTime())) {
      return new Date(1970, 0, 1);
    }
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate());
  }

  const raw = dateStr.trim();
  const dotted = DATE_FORMAT_REGEX.exec(raw);
  if (dotted) {
    const [, year, month, day] = dotted;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const isoDay = ISO_DAY_REGEX.exec(raw);
  if (isoDay) {
    return new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  throw new Error(`Invalid date format: ${dateStr}. Expected YYYY.MM.DD`);
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time;
}

export function getMonogram(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Idő mező gépelés közben: csak számjegy, automatikus „:” a perc elé. */
export function formatTimeWhileTyping(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Idő mező blur / mentés előtt: HH:MM formátum (pl. „930” → „09:30”). */
export function normalizeTimeValue(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 2) {
    return `${digits.padStart(2, "0")}:00`;
  }
  const hours = digits.slice(0, 2);
  const minutes = digits.slice(2, 4).padEnd(2, "0");
  return `${hours}:${minutes}`;
}

/** Összeg mező ezres tagolással (hu-HU). */
export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("hu-HU");
}

/** Tagolt összeg visszaalakítása számra. */
export function parseAmountInput(value: string): number {
  const normalized = value.replace(/[\s\u00A0\u202F]/g, "");
  return normalized ? Number(normalized) : 0;
}
