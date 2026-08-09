import { TripsPage } from "@/components/trips/trips-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripsListFresh } from "@/lib/queries/trips";

export const dynamic = "force-dynamic";

export default async function TripsRoute() {
  const [trips, members] = await Promise.all([fetchTripsListFresh(), fetchFamilyMembers()]);

  return <TripsPage trips={trips} members={members} />;
}
