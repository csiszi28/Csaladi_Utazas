import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripDetailPage } from "@/components/trips/trip-detail-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripDetail } from "@/lib/queries/trips";
import { getAuthSession, requireAuthUserId } from "@/lib/auth";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default async function TripDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [authUser, userId, trip, members] = await Promise.all([
    getAuthSession(),
    requireAuthUserId(),
    fetchTripDetail(id),
    fetchFamilyMembers(),
  ]);

  if (!trip) notFound();

  const currentUserName =
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email?.split("@")[0] ??
    "";

  return (
    <Suspense fallback={<PageSkeleton titleWidth="w-64" />}>
      <TripDetailPage
        trip={trip}
        members={members}
        currentUserId={userId}
        currentUserName={currentUserName}
      />
    </Suspense>
  );
}
