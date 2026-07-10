import { prisma } from "@csaladi-utazas/database";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { tripAccessFilter } from "@/lib/trip-access";

export const GET = withApiAuth(async ({ userId, params }) => {
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    include: {
      participants: { include: { familyMember: { include: { linkedUser: true } } } },
      programs: {
        include: { participants: { include: { familyMember: true } } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
      costs: true,
      ideas: true,
      documents: true,
    },
  });

  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");
  return jsonOk({ trip });
});
