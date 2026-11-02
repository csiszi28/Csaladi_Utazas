import { jsonOk, withApiAuth } from "@/lib/api/handler";
import { fetchCommandPaletteIndex } from "@/lib/queries/command-palette";
import { fetchTripsList } from "@/lib/queries/trips";

/** Keresőpaletta indexe — a keresés első megnyitásakor töltődik, nem blokkolja a layoutot. */
export const GET = withApiAuth(async () => {
  const [trips, items] = await Promise.all([fetchTripsList(), fetchCommandPaletteIndex()]);
  return jsonOk({
    trips: trips
      .filter((trip) => !trip.isTemplate)
      .map((trip) => ({ id: trip.id, title: trip.title, destination: trip.destination })),
    items,
  });
});
