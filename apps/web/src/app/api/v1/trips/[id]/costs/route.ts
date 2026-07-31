import { prisma } from "@csaladi-utazas/database";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { tripAccessFilter } from "@/lib/trip-access";

export const GET = withApiAuth(async ({ userId, params }) => {
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    select: { id: true },
  });
  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");

  const costs = await prisma.cost.findMany({
    where: { tripId: id },
    orderBy: { title: "asc" },
  });

  return jsonOk({ costs });
});
