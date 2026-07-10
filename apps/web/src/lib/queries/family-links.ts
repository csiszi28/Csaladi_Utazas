import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedPendingFamilyLinkRequests = (userId: string) =>
  unstable_cache(
    async () =>
      prisma.familyMember.findMany({
        where: {
          pendingLinkUserId: userId,
          linkedUserId: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
      }),
    [`pending-family-links-${userId}`],
    { revalidate: 15, tags: [userDataTag(userId)] }
  )();

export async function fetchPendingFamilyLinkRequests() {
  const userId = await requireAuthUserId();
  return getCachedPendingFamilyLinkRequests(userId);
}

export type PendingFamilyLinkRequest = Awaited<
  ReturnType<typeof fetchPendingFamilyLinkRequests>
>[number];
