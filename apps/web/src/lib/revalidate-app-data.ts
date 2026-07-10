import { revalidatePath } from "next/cache";
import { revalidateUserData } from "./revalidate-user-data";

export function invalidateUserDashboardData(userId: string) {
  revalidateUserData(userId);
}

export function invalidateTripsAndReports(userId: string, tripId?: string) {
  revalidateUserData(userId);
  revalidatePath("/trips");
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (tripId) {
    revalidatePath(`/trips/${tripId}`);
  }
}

export function invalidateFamilyAndCalendar(userId: string) {
  revalidateUserData(userId);
  revalidatePath("/family");
  revalidatePath("/");
}
