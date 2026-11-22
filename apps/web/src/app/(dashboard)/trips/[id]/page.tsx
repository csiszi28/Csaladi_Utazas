import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripDetailPage } from "@/components/trips/trip-detail-page";
import { fetchFamilyMembers } from "@/lib/queries/family";
import { fetchTripDetailFresh } from "@/lib/queries/trips";
import { getAuthSession, requireAuthUserId } from "@/lib/auth";
import { prisma } from "@csaladi-utazas/database";
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

  // A tulajdonos a közreműködők családtagjait is kezelheti (hozzáadás / kivétel)
  const otherMembersPromise =
    trip.user.id === userId && trip.collaborators.length > 0
      ? prisma.familyMember.findMany({
          where: { userId: { in: trip.collaborators.map((c) => c.user.id) } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, userId: true, linkedUserId: true },
        })
      : Promise.resolve([]);

  // Borító URL és közreműködők családtagjai párhuzamosan
  const [coverUrl, otherMembers] = await Promise.all([
    resolveCoverUrl(trip.coverStoragePath),
    otherMembersPromise,
  ]);

  const currentUserName =
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email?.split("@")[0] ??
    "";

  return (
    <Suspense fallback={null}>
      <TripDetailPage
        trip={trip}
        members={members}
        otherMembers={otherMembers}
        currentUserId={userId}
        currentUserName={currentUserName}
        coverUrl={coverUrl}
      />
    </Suspense>
  );
}
