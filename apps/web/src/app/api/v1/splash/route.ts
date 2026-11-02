import { prisma } from "@csaladi-utazas/database";
import { createServiceClient } from "@/lib/supabase/server";
import { jsonOk, withApiAuth } from "@/lib/api/handler";
import { tripAccessFilter } from "@/lib/trip-access";

const COVER_URL_TTL_S = 3 * 24 * 3600;

/**
 * Nyitó animációhoz: az éppen zajló és a következő utak, minimális mezőkkel.
 * Szándékosan nem a teljes utazáslista — a splash-nek gyorsnak kell lennie.
 */
export const GET = withApiAuth(async ({ userId }) => {
  const from = new Date();
  from.setDate(from.getDate() - 1);

  const trips = await prisma.trip.findMany({
    where: { ...tripAccessFilter(userId), isTemplate: false, endDate: { gte: from } },
    select: {
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      coverStoragePath: true,
    },
    orderBy: { startDate: "asc" },
    take: 4,
  });

  // Borítókép: hosszabb életű aláírt URL, mert a kliens eltárolja a következő megnyitásra.
  const withCovers = trips.filter((trip) => trip.coverStoragePath);
  const signed = new Map<string, string>();
  if (withCovers.length > 0) {
    const supabase = await createServiceClient();
    await Promise.all(
      withCovers.map(async (trip) => {
        const { data } = await supabase.storage
          .from("trip-documents")
          .createSignedUrl(trip.coverStoragePath!, COVER_URL_TTL_S);
        if (data?.signedUrl) signed.set(trip.coverStoragePath!, data.signedUrl);
      })
    );
  }

  return jsonOk({
    trips: trips.map((trip) => ({
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString().slice(0, 10),
      endDate: trip.endDate.toISOString().slice(0, 10),
      coverUrl: trip.coverStoragePath ? (signed.get(trip.coverStoragePath) ?? null) : null,
    })),
  });
});
