import { prisma } from "@csaladi-utazas/database";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { tripAccessFilter } from "@/lib/trip-access";

/** Könnyű revision poll — collaborator élő frissítéshez (ne a teljes trip detail). */
export const GET = withApiAuth(async ({ userId, params }) => {
  const { id } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id, ...tripAccessFilter(userId) },
    select: { contentUpdatedAt: true },
  });

  if (!trip) return jsonFail("Utazás nem található", 404, "NOT_FOUND");

  return jsonOk({
    contentUpdatedAt: trip.contentUpdatedAt.toISOString(),
  });
});
