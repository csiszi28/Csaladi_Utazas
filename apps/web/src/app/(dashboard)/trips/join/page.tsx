import { Suspense } from "react";
import { JoinTripPage } from "@/components/trips/join-trip-page";

export default function TripsJoinRoute() {
  return (
    <Suspense fallback={null}>
      <JoinTripPage />
    </Suspense>
  );
}
