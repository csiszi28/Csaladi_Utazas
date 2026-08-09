import { describe, expect, it } from "vitest";
import { formatDate, isDateInRange, isSameDay, parseDate } from "../date";
import { listTripDays } from "../itinerary";

describe("date calendar-day safety", () => {
  it("keeps trip start and end days inclusive", () => {
    const start = parseDate("2026.08.10");
    const end = parseDate("2026.08.15");
    expect(isDateInRange("2026.08.10", start, end)).toBe(true);
    expect(isDateInRange("2026.08.15", start, end)).toBe(true);
    expect(isDateInRange(parseDate("2026.08.15"), start, end)).toBe(true);
    expect(isDateInRange("2026.08.09", start, end)).toBe(false);
    expect(isDateInRange("2026.08.16", start, end)).toBe(false);
  });

  it("treats legacy local-midnight ISO values as the intended calendar day", () => {
    // HU nyári idő: helyi 2026.08.15 00:00 → UTC 2026-08-14T22:00:00.000Z
    const legacyEnd = new Date("2026-08-14T22:00:00.000Z");
    expect(formatDate(legacyEnd)).toBe("2026.08.15");
    expect(isDateInRange("2026.08.15", "2026.08.10", legacyEnd)).toBe(true);
    expect(isSameDay(legacyEnd, parseDate("2026.08.15"))).toBe(true);
  });

  it("formats RSC-serialized ISO datetimes without UTC off-by-one", () => {
    expect(formatDate("2026-08-14T22:00:00.000Z")).toBe("2026.08.15");
    expect(formatDate("2026-08-15T00:00:00.000Z")).toBe("2026.08.15");
    expect(formatDate("2026-08-15T12:00:00.000Z")).toBe("2026.08.15");
  });

  it("lists trip days inclusively", () => {
    expect(listTripDays("2026.08.10", "2026.08.12")).toEqual([
      "2026.08.10",
      "2026.08.11",
      "2026.08.12",
    ]);
    expect(listTripDays(new Date("2026-08-14T22:00:00.000Z"), parseDate("2026.08.15"))).toEqual([
      "2026.08.15",
    ]);
  });
});
