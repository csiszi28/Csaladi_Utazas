import { parseDate, formatDate } from "./date";

export function dayOffsetMs(from: Date, to: Date): number {
  return parseDate(to).getTime() - parseDate(from).getTime();
}

export function shiftDateString(dateStr: string, offsetMs: number): string {
  const date = parseDate(dateStr);
  return formatDate(new Date(date.getTime() + offsetMs));
}

export function shiftDateValue(date: Date, offsetMs: number): Date {
  return parseDate(new Date(parseDate(date).getTime() + offsetMs));
}
