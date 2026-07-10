import { TripsPage } from "@/components/trips/trips-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripsList } from "@/lib/queries/trips";

export default async function TripsRoute() {
  const [trips, members] = await Promise.all([fetchTripsList(), fetchFamilyMembers()]);

  return <TripsPage trips={trips} members={members} />;
}
