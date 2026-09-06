import { prisma } from "@csaladi-utazas/database";
import { createServiceClient } from "@/lib/supabase/server";

/** familyMemberId → signed avatar URL (linked user profilkép) */
export async function resolveMemberAvatarUrls(
  members: Array<{ id: string; linkedUserId: string | null }>
): Promise<Record<string, string>> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return {};

    const linkedIds = [
      ...new Set(members.map((m) => m.linkedUserId).filter((id): id is string => Boolean(id))),
    ];
    if (linkedIds.length === 0) return {};

    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; avatarStoragePath: string | null }>
    >(
      `SELECT "id", "avatarStoragePath" FROM "users"
       WHERE "id" = ANY($1::text[]) AND "avatarStoragePath" IS NOT NULL`,
      linkedIds
    );

    const pathByUserId = new Map(
      rows
        .filter((r) => r.avatarStoragePath)
        .map((r) => [r.id, r.avatarStoragePath as string])
    );
    if (pathByUserId.size === 0) return {};

    const supabase = await createServiceClient();
    const result: Record<string, string> = {};

    const signedByUserId = new Map<string, string>();
    await Promise.all(
      [...pathByUserId.entries()].map(async ([userId, path]) => {
        try {
          const { data } = await supabase.storage
            .from("trip-documents")
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) signedByUserId.set(userId, data.signedUrl);
        } catch {
          /* egy URL hibája ne állítsa meg a többit */
        }
      })
    );

    for (const member of members) {
      if (!member.linkedUserId) continue;
      const url = signedByUserId.get(member.linkedUserId);
      if (!url) continue;
      result[member.id] = url;
      // Közreműködő / userId alapú lookup a Monogramhoz
      result[`user:${member.linkedUserId}`] = url;
    }

    return result;
  } catch {
    return {};
  }
}
