import { parseDate, formatDate } from "./date";

export function dayOffsetMs(from: Date, to: Date): number {
  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setHours(0, 0, 0, 0);
  return toDay.getTime() - fromDay.getTime();
}

export function shiftDateString(dateStr: string, offsetMs: number): string {
  const date = parseDate(dateStr);
  return formatDate(new Date(date.getTime() + offsetMs));
}

export function shiftDateValue(date: Date, offsetMs: number): Date {
  return new Date(date.getTime() + offsetMs);
}
