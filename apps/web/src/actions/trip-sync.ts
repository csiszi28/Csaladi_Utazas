"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";

/** Cache nélküli revision a DB-ből (élő sync poll). */
export async function pullTripRevision(tripId: string): Promise<string | null> {
  const userId = await requireAuthUserId();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessFilter(userId) },
    select: { contentUpdatedAt: true },
  });

  return trip?.contentUpdatedAt.toISOString() ?? null;
}

/** Route + tag bust a következő router.refresh() előtt */
export async function bustTripViewCache(tripId: string): Promise<void> {
  await requireAuthUserId();
  revalidateTag(`trip-${tripId}`);
  revalidatePath(`/trips/${tripId}`, "page");
  revalidatePath(`/trips/${tripId}`, "layout");
}
