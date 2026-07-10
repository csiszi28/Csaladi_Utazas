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

export const getAuthUserId = cache(async (): Promise<string | null> => {
  const user = await getAuthSession();
  return user?.id ?? null;
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
  options?: { allowEmailAutoLink?: boolean }
) {
  const email = authUser.email ?? "";
  const name =
    (authUser.user_metadata?.name as string | undefined) ?? email.split("@")[0];

  return prisma.user
    .upsert({
      where: { id: authUser.id },
      create: { id: authUser.id, email, name },
      update: { email, name },
    })
    .then(async (user) => {
      const { ensureSelfFamilyMember } = await import("@/lib/queries/family");
      await ensureSelfFamilyMember(user.id, user.name);

      const { autoLinkRegisteredUserToParticipantProfiles } = await import(
        "@/actions/family"
      );
      const linkResult = await autoLinkRegisteredUserToParticipantProfiles(
        user.id,
        user.name,
        user.email,
        { allowEmailMatch: options?.allowEmailAutoLink ?? false }
      );
      if (linkResult) {
        const { invalidateTripsAndReports } = await import("@/lib/revalidate-app-data");
        const { prisma } = await import("@csaladi-utazas/database");
        for (const tripId of linkResult.tripIds) {
          invalidateTripsAndReports(user.id, tripId);
          const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { userId: true },
          });
          if (trip?.userId) {
            invalidateTripsAndReports(trip.userId, tripId);
          }
        }
      }

      return user;
    });
}
