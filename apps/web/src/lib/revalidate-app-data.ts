import { revalidatePath, revalidateTag } from "next/cache";
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
  }
}

/**
 * Minden érintett user cache-e + trip detail tag.
 * Közreműködőknél nélkülözhetetlen, különben a lista frissülhet, a részlet pedig 30s-ig üres marad.
 */
export async function invalidateTripAudience(tripId: string): Promise<void> {
  revalidateTag(`trip-${tripId}`);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath("/dashboard");

  try {
    const memberIds = await getTripAudienceUserIds(tripId);
    for (const userId of memberIds) {
      revalidateUserData(userId);
    }
  } catch (error) {
    console.error("[invalidateTripAudience] failed:", error);
  }
}

/** Narrower bust for entity mutations (program / szállás / közlekedés / költség) */
export function invalidateTripMutation(userId: string, tripId: string) {
  revalidateUserData(userId);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  revalidateTag(`trip-${tripId}`);
}

export function invalidateFamilyAndCalendar(userId: string) {
  revalidateUserData(userId);
  revalidatePath("/family");
  revalidatePath("/");
}
