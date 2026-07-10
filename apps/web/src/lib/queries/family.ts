import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

export async function ensureSelfFamilyMember(userId: string, userName: string) {
  const count = await prisma.familyMember.count({ where: { userId } });
  if (count === 0) {
    return prisma.familyMember.create({
      data: { name: userName, userId, linkedUserId: userId },
    });
  }

  await prisma.familyMember.updateMany({
    where: { userId, linkedUserId: null, name: userName },
    data: { linkedUserId: userId },
  });

  return null;
}

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedFamilyMembers = (userId: string) =>
  unstable_cache(
    async () =>
      prisma.familyMember.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          userId: true,
          linkedUserId: true,
          linkedUser: { select: { id: true, email: true, name: true } },
        },
      }),
    [`family-members-${userId}`],
    { revalidate: 60, tags: [userDataTag(userId)] }
  )();

export async function fetchFamilyMembers() {
  const userId = await requireAuthUserId();
  return getCachedFamilyMembers(userId);
}

export type FamilyMemberRow = Awaited<ReturnType<typeof fetchFamilyMembers>>[number];
