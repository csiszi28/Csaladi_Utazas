import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripDetailPage } from "@/components/trips/trip-detail-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripDetail } from "@/lib/queries/trips";
import { getAuthSession, requireAuthUserId } from "@/lib/auth";

export default async function TripDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userIdPromise = requireAuthUserId();
  const [authUser, userId, trip, members] = await Promise.all([
    getAuthSession(),
    userIdPromise,
    userIdPromise.then((uid) => fetchTripDetail(id, uid)),
    fetchFamilyMembers(),
  ]);

  if (!trip) notFound();

  const currentUserName =
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email?.split("@")[0] ??
    "";

  return (
    <TripDetailPage
      trip={trip}
      members={members}
      currentUserId={userId}
      currentUserName={currentUserName}
    />
  );
}
