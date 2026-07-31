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

  const ideas = await prisma.tripIdea.findMany({
    where: { tripId: id },
    include: {
      interests: { include: { familyMember: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return jsonOk({ ideas });
});
