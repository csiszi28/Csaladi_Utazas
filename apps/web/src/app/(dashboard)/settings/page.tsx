import { SettingsPage } from "@/components/settings/settings-page";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@csaladi-utazas/database";

async function resolveAvatarUrl(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ avatarStoragePath: string | null }>>(
      `SELECT "avatarStoragePath" FROM "users" WHERE "id" = $1 LIMIT 1`,
      userId
    );
    const path = rows[0]?.avatarStoragePath;
    if (!path) return null;
    const supabase = await createServiceClient();
    const { data } = await supabase.storage.from("trip-documents").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export default async function SettingsRoute() {
  const user = await requireUser();
  const avatarUrl = await resolveAvatarUrl(user.id);

  return (
    <SettingsPage
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl,
      }}
    />
  );
}
