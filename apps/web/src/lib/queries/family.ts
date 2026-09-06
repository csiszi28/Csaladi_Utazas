import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { personNamesMatch } from "@csaladi-utazas/shared";
import { requireAuthUserId } from "@/lib/auth";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";

export async function ensureSelfFamilyMember(userId: string, userName: string) {
  const self = await prisma.familyMember.findFirst({
    where: { userId, linkedUserId: userId },
    select: { id: true },
  });
  if (self) return null;

  const owned = await prisma.familyMember.findMany({
    where: { userId },
    select: { id: true, name: true, linkedUserId: true },
  });

  if (owned.length === 0) {
    return prisma.familyMember.create({
      data: { name: userName, userId, linkedUserId: userId },
    });
  }

  const nameMatch = owned.find(
    (m) => !m.linkedUserId && personNamesMatch(m.name, userName)
  );
  if (nameMatch) {
    await prisma.familyMember.update({
      where: { id: nameMatch.id },
      data: { linkedUserId: userId },
    });
    return null;
  }

  // Van háztartás, de nincs fiókhoz kötött „én” — ne maradjon linkedUserId nélkül
  return prisma.familyMember.create({
    data: { name: userName, userId, linkedUserId: userId },
  });
}

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

const getCachedFamilyMembers = (userId: string) =>
  unstable_cache(
    async () => {
      const rows = await prisma.familyMember.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          userId: true,
          linkedUserId: true,
          pendingLinkUserId: true,
          linkedUser: { select: { id: true, email: true, name: true } },
          pendingLinkUser: { select: { id: true, email: true, name: true } },
        },
      });

      let childFlags = new Map<string, boolean>();
      try {
        const flags = await prisma.$queryRawUnsafe<Array<{ id: string; isChild: boolean }>>(
          `SELECT "id", "isChild" FROM "family_members" WHERE "userId" = $1`,
          userId
        );
        childFlags = new Map(flags.map((f) => [f.id, Boolean(f.isChild)]));
      } catch {
        /* oszlop még nincs */
      }

      return rows.map((row) => ({
        ...row,
        isChild: childFlags.get(row.id) ?? false,
      }));
    },
    [`family-members-${userId}`],
    { revalidate: 60, tags: [userDataTag(userId)] }
  )();

export async function fetchFamilyMembers() {
  const userId = await requireAuthUserId();
  return getCachedFamilyMembers(userId);
}

export type FamilyMemberRow = Awaited<ReturnType<typeof fetchFamilyMembers>>[number];
