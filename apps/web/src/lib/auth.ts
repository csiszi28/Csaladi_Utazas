import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@csaladi-utazas/database";
import { createClient } from "@/lib/supabase/server";

/** Csak auth session – Prisma nélkül, gyorsabb listalekérdezésekhez */
export const getAuthSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Csak a felhasználó azonosítója — JWT helyi ellenőrzéssel, hálózati hívás nélkül (ha lehet). */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export const getCurrentUser = cache(async () => {
  const authUser = await getAuthSession();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  return dbUser;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
});

export const requireAuthUserId = cache(async (): Promise<string> => {
  const id = await getAuthUserId();
  if (!id) {
    redirect("/auth/login");
  }
  return id;
});

export async function syncUser(
  authUser: {
    id: string;
    email?: string;
    user_metadata?: { name?: string };
  },
  options?: { allowEmailAutoLink?: boolean; skipAutoLink?: boolean }
) {
  const email = authUser.email ?? "";
  const name =
    (authUser.user_metadata?.name as string | undefined) ?? email.split("@")[0];

  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email, name },
    update: { email, name },
  });

  const { ensureSelfFamilyMember } = await import("@/lib/queries/family");
  await ensureSelfFamilyMember(user.id, user.name);

  if (options?.skipAutoLink) {
    return user;
  }

  // Csak kérelmet hoz létre (e-mail egyezés esetén) — közvetlen összekötés és hozzáférés nincs.
  const { autoLinkRegisteredUserToParticipantProfiles } = await import("@/actions/family");
  await autoLinkRegisteredUserToParticipantProfiles(
    user.id,
    user.name,
    user.email,
    { allowEmailMatch: options?.allowEmailAutoLink ?? false }
  );

  return user;
}
