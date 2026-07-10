import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedDocumentsOverview = (userId: string) =>
  unstable_cache(
    async () => {
      const trips = await prisma.trip.findMany({
        where: tripAccessFilter(userId),
        select: {
          id: true,
          title: true,
          destination: true,
          programs: {
            select: { id: true, title: true },
            orderBy: { date: "asc" },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              uploadedAt: true,
              programId: true,
              familyMemberId: true,
              category: true,
            },
            orderBy: { uploadedAt: "desc" },
          },
          participants: {
            select: {
              familyMember: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { startDate: "desc" },
      });

      return trips;
    },
    [`documents-overview-${userId}`],
    { revalidate: 30, tags: [userDataTag(userId)] }
  )();

export async function fetchDocumentsOverview() {
  const userId = await requireAuthUserId();
  return getCachedDocumentsOverview(userId);
}

export type DocumentsOverviewTrip = Awaited<ReturnType<typeof fetchDocumentsOverview>>[number];
export type DocumentsOverviewDocument = DocumentsOverviewTrip["documents"][number];
