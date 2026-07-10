import { prisma } from "@csaladi-utazas/database";
import type { Prisma } from "@csaladi-utazas/database";

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

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Meghívott felhasználó családtagjainak hozzáadása az utazáshoz. */
export async function ensureUserFamilyMembersOnTrip(
  tripId: string,
  userId: string,
  userName: string
) {
  let members = await prisma.familyMember.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  if (members.length === 0) {
    members = [
      await prisma.familyMember.create({
        data: { name: userName, userId },
      }),
    ];
  }

  for (const member of members) {
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
