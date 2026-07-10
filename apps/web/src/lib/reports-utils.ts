import type { TripCostBreakdown } from "@csaladi-utazas/shared";

export function pickDefaultTripId(tripBreakdowns: Pick<TripCostBreakdown, "tripId" | "startDate">[]): string {
  if (tripBreakdowns.length === 0) return "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const sorted = [...tripBreakdowns].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const upcoming = sorted.filter((t) => new Date(t.startDate) >= now);
  if (upcoming.length > 0) return upcoming[0]!.tripId;

  return sorted[sorted.length - 1]!.tripId;
}
