const DATE_FORMAT_REGEX = /^(\d{4})\.(\d{2})\.(\d{2})$/;
const ISO_DAY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Naptári nap kinyerése DateTime-ből, szerver TZ-től függetlenül.
 * - UTC éjfél / UTC dél (új parseDate) → UTC nap
 * - Régi „helyi éjfél” (pl. T22:00Z / T23:00Z) → +12h trükk
 */
function calendarPartsFromDate(d: Date): { year: number; month: number; day: number } {
  const hour = d.getUTCHours();
  if (hour === 0 || hour === 12) {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
    };
  }
  const shifted = new Date(d.getTime() + 12 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatParts(year: number, month: number, day: number): string {
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function utcNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Naptári dátum → YYYY.MM.DD.
 * Fogad Date-et, YYYY.MM.DD-t, YYYY-MM-DD-t és ISO datetime stringet is.
 */
export function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    const trimmed = date.trim();
    const dotted = DATE_FORMAT_REGEX.exec(trimmed);
    if (dotted) return dotted[0];

    // Csak tiszta YYYY-MM-DD (idő nélkül) — ne az ISO datetime prefixét
    const isoDayOnly = ISO_DAY_REGEX.exec(trimmed);
    if (isoDayOnly) {
      return formatParts(Number(isoDayOnly[1]), Number(isoDayOnly[2]), Number(isoDayOnly[3]));
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
 * YYYY.MM.DD / YYYY-MM-DD / ISO / Date → stabil naptári Date (UTC dél).
 * Szerver és kliens ugyanazt a naptári napot kapja, TZ-től függetlenül.
 */
export function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    if (Number.isNaN(dateStr.getTime())) {
      return utcNoon(1970, 1, 1);
    }
    const { year, month, day } = calendarPartsFromDate(dateStr);
    return utcNoon(year, month, day);
  }

  const raw = dateStr.trim();
  const dotted = DATE_FORMAT_REGEX.exec(raw);
  if (dotted) {
    const [, year, month, day] = dotted;
    return utcNoon(Number(year), Number(month), Number(day));
  }

  const isoDayOnly = ISO_DAY_REGEX.exec(raw);
  if (isoDayOnly) {
    return utcNoon(Number(isoDayOnly[1]), Number(isoDayOnly[2]), Number(isoDayOnly[3]));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const { year, month, day } = calendarPartsFromDate(parsed);
    return utcNoon(year, month, day);
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
  return formatDate(a) === formatDate(b);
}

/** Inclusive: a trip kezdő és utolsó napja is érvényes. */
export function isDateInRange(date: Date | string, start: Date | string, end: Date | string): boolean {
  const d = formatDate(date);
  const s = formatDate(start);
  const e = formatDate(end);
  return d >= s && d <= e;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  while (date.getUTCMonth() === month - 1) {
    days.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

export function startOfMonth(date: Date): Date {
  const { year, month } = calendarPartsFromDate(date);
  return utcNoon(year, month, 1);
}

export function endOfMonth(date: Date): Date {
  const { year, month } = calendarPartsFromDate(date);
  return utcNoon(year, month + 1, 0);
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
