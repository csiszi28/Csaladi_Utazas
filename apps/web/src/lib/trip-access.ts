import { prisma } from "@csaladi-utazas/database";
import type { Prisma } from "@csaladi-utazas/database";
import {
  canEditTrip,
  normalizeCollaboratorRole,
  type TripRole,
} from "@csaladi-utazas/shared";

export function tripAccessFilter(userId: string): Prisma.TripWhereInput {
  return {
    OR: [{ userId }, { collaborators: { some: { userId } } }],
  };
}

export async function findAccessibleTrip(tripId: string, userId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessFilter(userId) },
  });
}

export async function findOwnedTrip(tripId: string, userId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
  });
}

export async function resolveTripRole(
  tripId: string,
  userId: string
): Promise<TripRole | null> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessFilter(userId) },
    select: {
      userId: true,
      collaborators: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!trip) return null;
  if (trip.userId === userId) return "OWNER";
  return normalizeCollaboratorRole(trip.collaborators[0]?.role);
}

/**
 * Egy DB lekérdezéssel: szerkesztési jog + trip dátumok (create/update validációhoz).
 * Kerüli a requireTripEditor + findAccessibleTrip dupla round-tripet.
 */
export async function requireEditableTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ...tripAccessFilter(userId) },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      userId: true,
      collaborators: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!trip) {
    return { ok: false as const, error: "Nincs hozzáférésed ehhez az utazáshoz" };
  }

  const role: TripRole =
    trip.userId === userId
      ? "OWNER"
      : normalizeCollaboratorRole(trip.collaborators[0]?.role);

  if (!canEditTrip(role)) {
    return { ok: false as const, error: "Csak olvasási jogod van ehhez az utazáshoz" };
  }

  return {
    ok: true as const,
    role,
    trip: {
      id: trip.id,
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
  };
}

export async function requireTripEditor(tripId: string, userId: string) {
  const access = await requireEditableTrip(tripId, userId);
  if (!access.ok) return access;
  return { ok: true as const, role: access.role };
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Tulajdonos + közreműködők userId-jai (cache invalidálás / értesítés). */
export async function getTripAudienceUserIds(tripId: string): Promise<string[]> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId },
    select: {
      userId: true,
      collaborators: { select: { userId: true } },
    },
  });
  if (!trip) return [];
  return Array.from(
    new Set([trip.userId, ...trip.collaborators.map((c) => c.userId)])
  );
}

/** Meghívott felhasználó családtagjainak hozzáadása az utazáshoz. */
export async function ensureUserFamilyMembersOnTrip(
  tripId: string,
  userId: string,
  userName: string
) {
  const alreadyRepresented = await prisma.tripParticipant.findFirst({
    where: {
      tripId,
      familyMember: { linkedUserId: userId },
    },
    select: { familyMemberId: true },
  });

  let members = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  if (members.length === 0) {
    if (alreadyRepresented) return;
    members = [
      await prisma.familyMember.create({
        data: { name: userName, userId, linkedUserId: userId },
      }),
    ];
  }

  for (const member of members) {
    const isSelfProfile =
      member.linkedUserId === userId ||
      (!member.linkedUserId && member.name.trim().toLowerCase() === userName.trim().toLowerCase());

    // Ha a felhasználó már szerepel linked profilként, ne duplikáljuk a saját FM-jét
    if (
      isSelfProfile &&
      alreadyRepresented &&
      alreadyRepresented.familyMemberId !== member.id
    ) {
      continue;
    }

    await prisma.tripParticipant.upsert({
      where: {
        tripId_familyMemberId: { tripId, familyMemberId: member.id },
      },
      create: { tripId, familyMemberId: member.id },
      update: {},
    });
  }
}

/** Meghívott felhasználók automatikus résztvevővé tétele (TripParticipant). */
export async function syncCollaboratorParticipants(tripId: string) {
  const collaborators = await prisma.tripCollaborator.findMany({
    where: { tripId },
    select: { user: { select: { id: true, name: true } } },
  });

  await Promise.all(
    collaborators.map(({ user }) => ensureUserFamilyMembersOnTrip(tripId, user.id, user.name))
  );
}

export async function verifyDocumentAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId },
    include: { trip: { include: { collaborators: true } } },
  });

  if (!doc) return null;

  const isOwner = doc.trip.userId === userId;
  const isCollaborator = doc.trip.collaborators.some((c) => c.userId === userId);
  if (!isOwner && !isCollaborator) return null;

  return doc;
}
