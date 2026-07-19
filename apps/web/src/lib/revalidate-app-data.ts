import { revalidatePath } from "next/cache";
import { revalidateUserData } from "./revalidate-user-data";

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
  }
}

/** Narrower bust for entity mutations (program / szállás / közlekedés / költség) */
export function invalidateTripMutation(userId: string, tripId: string) {
  revalidateUserData(userId);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export function invalidateFamilyAndCalendar(userId: string) {
  revalidateUserData(userId);
  revalidatePath("/family");
  revalidatePath("/");
}
