"use server";

import { requireAuthUserId } from "@/lib/auth";
import { resolveMemberAvatarUrls } from "@/lib/member-avatars";
import { prisma } from "@csaladi-utazas/database";

export async function fetchMemberAvatarUrlsAction(
  members: Array<{ id: string; linkedUserId: string | null }>
): Promise<Record<string, string>> {
  await requireAuthUserId();
  if (members.length === 0) return {};
  return resolveMemberAvatarUrls(members);
}

/** Saját háztartás avatarjai — layout után, nem-blokkolóan. */
export async function fetchOwnFamilyAvatarUrlsAction(): Promise<Record<string, string>> {
  const userId = await requireAuthUserId();
  const members = await prisma.familyMember.findMany({
    where: { userId },
    select: { id: true, linkedUserId: true },
  });
  return resolveMemberAvatarUrls(members);
}
