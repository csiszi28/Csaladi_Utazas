import { prisma } from "@csaladi-utazas/database";
import type { Prisma } from "@csaladi-utazas/database";
import type { TripActivityType } from "@csaladi-utazas/shared";

export async function recordTripActivity(input: {
  tripId: string;
  actorUserId: string;
  type: TripActivityType;
  summary: string;
  meta?: Prisma.InputJsonValue | null;
}): Promise<void> {
  try {
    await prisma.tripActivity.create({
      data: {
        tripId: input.tripId,
        actorUserId: input.actorUserId,
        type: input.type,
        summary: input.summary,
        meta: input.meta ?? undefined,
      },
    });
  } catch {
    // Activity is best-effort — never block the primary mutation
  }
}
