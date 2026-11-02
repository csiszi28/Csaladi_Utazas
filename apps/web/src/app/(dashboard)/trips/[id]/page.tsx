import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripDetailPage } from "@/components/trips/trip-detail-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripDetailFresh } from "@/lib/queries/trips";
import { getAuthSession, requireAuthUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

/** Mutációk / collaborator sync után ne ragadjon Full Route Cache-ben */
export const dynamic = "force-dynamic";

async function resolveCoverUrl(coverStoragePath: string | null | undefined): Promise<string | null> {
  if (!coverStoragePath) return null;
  const supabase = await createServiceClient();
  const { data } = await supabase.storage
    .from("trip-documents")
    .createSignedUrl(coverStoragePath, 3600);
  return data?.signedUrl ?? null;
}

export default async function TripDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userIdPromise = requireAuthUserId();
  const tripPromise = userIdPromise.then((uid) => fetchTripDetailFresh(id, uid));

  const [authUser, userId, initialTrip, members] = await Promise.all([
    getAuthSession(),
    userIdPromise,
    tripPromise,
    fetchFamilyMembers(),
  ]);

  if (!initialTrip) notFound();

  // Az oldal megnyitása nem módosít adatot: profil-átvétel és résztvevő-felvétel csak
  // csatlakozáskor / megerősített kérelemnél történik (lásd actions/invites, actions/family).
  const trip = initialTrip;

  // Borító URL párhuzamosan a session névvel — ne várjon a trip után új round-tripet
  const coverUrl = await resolveCoverUrl(trip.coverStoragePath);

  const currentUserName =
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email?.split("@")[0] ??
    "";

  return (
    <Suspense fallback={null}>
      <TripDetailPage
        trip={trip}
        members={members}
        currentUserId={userId}
        currentUserName={currentUserName}
        coverUrl={coverUrl}
      />
    </Suspense>
  );
}
