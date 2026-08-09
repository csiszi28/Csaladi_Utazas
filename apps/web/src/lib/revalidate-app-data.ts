import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { revalidateUserData } from "./revalidate-user-data";
import { getTripAudienceUserIds } from "./trip-access";

export function invalidateUserDashboardData(userId: string) {
  revalidateUserData(userId);
}

/** Full bust — trip create/delete, major structural changes */
export function invalidateTripsAndReports(userId: string, tripId?: string) {
  revalidateUserData(userId);
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (tripId) {
    revalidatePath(`/trips/${tripId}`);
    revalidateTag(`trip-${tripId}`);
    void bumpTripContent(tripId).catch((error) => {
      console.error("[invalidateTripsAndReports] bump failed:", error);
    });
  }
}

/**
 * Gyors path: content revision bump + trip cache tag.
 * Collaborator élő sync + a következő router.refresh() friss adatot kapjon.
 */
export async function bumpTripContent(tripId: string): Promise<Date> {
  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { contentUpdatedAt: new Date() },
    select: { contentUpdatedAt: true },
  });
  revalidateTag(`trip-${tripId}`);
  revalidatePath(`/trips/${tripId}`);
  return updated.contentUpdatedAt;
}

function fanOutTripAudience(tripId: string): void {
  void (async () => {
    try {
      revalidatePath("/trips");
      revalidatePath("/");
      revalidatePath("/dashboard");
      const memberIds = await getTripAudienceUserIds(tripId);
      for (const userId of memberIds) {
        revalidateUserData(userId);
      }
    } catch (error) {
      console.error("[invalidateTripAudience] fan-out failed:", error);
    }
  })();
}

/**
 * Mutáció után: bump + trip tag (await), lista/dashboard fan-out háttérben.
 * Hívd await-tel, hogy a válasz előtt meglegyen a revision a többi kliens polljához.
 */
export async function invalidateTripAudience(tripId: string): Promise<void> {
  try {
    await bumpTripContent(tripId);
  } catch (error) {
    console.error("[invalidateTripAudience] bump failed:", error);
    revalidateTag(`trip-${tripId}`);
    revalidatePath(`/trips/${tripId}`);
  }
  fanOutTripAudience(tripId);
}

/** Narrower bust for entity mutations (program / szállás / közlekedés / költség) */
export async function invalidateTripMutation(userId: string, tripId: string) {
  revalidateUserData(userId);
  try {
    await bumpTripContent(tripId);
  } catch {
    revalidateTag(`trip-${tripId}`);
    revalidatePath(`/trips/${tripId}`);
  }
  revalidatePath("/trips");
}

export function invalidateFamilyAndCalendar(userId: string) {
  revalidateUserData(userId);
  revalidatePath("/family");
  revalidatePath("/");
}
