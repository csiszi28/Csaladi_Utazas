import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TripSummaryPage } from "@/components/trips/trip-summary-page";
import { fetchTripDetail } from "@/lib/queries/trips";
import { requireAuthUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_SUMMARY_PHOTOS = 12;

export default async function TripSummaryRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireAuthUserId();
  const trip = await fetchTripDetail(id, userId);

  if (!trip) notFound();

  const supabase = await createServiceClient();

  let coverUrl: string | null = null;
  if (trip.coverStoragePath) {
    const { data } = await supabase.storage
      .from("trip-documents")
      .createSignedUrl(trip.coverStoragePath, 3600);
    coverUrl = data?.signedUrl ?? null;
  }

  const photoDocuments = trip.documents
    .filter((d) => d.category === "PHOTO")
    .slice(0, MAX_SUMMARY_PHOTOS);

  const photoUrls = await Promise.all(
    photoDocuments.map(async (doc) => {
      const { data } = await supabase.storage
        .from("trip-documents")
        .createSignedUrl(doc.storagePath, 3600);
      return { id: doc.id, url: data?.signedUrl ?? null, fileName: doc.fileName };
    })
  );

  return (
    <Suspense fallback={null}>
      <TripSummaryPage trip={trip} coverUrl={coverUrl} photos={photoUrls} />
    </Suspense>
  );
}
