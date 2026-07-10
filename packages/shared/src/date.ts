const DATE_FORMAT_REGEX = /^(\d{4})\.(\d{2})\.(\d{2})$/;

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function parseDate(dateStr: string): Date {
  const match = DATE_FORMAT_REGEX.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY.MM.DD`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
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
