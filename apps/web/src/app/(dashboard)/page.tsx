import { CalendarView } from "@/components/calendar/calendar-view";
import { fetchCalendarTrips } from "@/lib/queries/trips";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { requireAuthUserId } from "@/lib/auth";

export default async function HomePage() {
  const userId = await requireAuthUserId();
  const [trips, members] = await Promise.all([
    fetchCalendarTrips(),
    fetchFamilyMembers(),
  ]);

  return <CalendarView trips={trips} members={members} currentUserId={userId} />;
}
