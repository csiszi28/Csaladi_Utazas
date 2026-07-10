"use server";

import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { invalidateFamilyAndCalendar } from "@/lib/revalidate-app-data";
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  claimFamilyMemberSchema,
  linkFamilyMemberSchema,
} from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";
import { findAccessibleTrip } from "@/lib/trip-access";

export async function getFamilyMembers() {
  const user = await requireUser();
  await ensureSelfFamilyMember(user.id, user.name);
  return prisma.familyMember.findMany({
    where: { userId: user.id },
    include: {
      linkedUser: { select: { id: true, email: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

/** Létrehozza a bejelentkezett felhasználót családtagként, ha még nincs egy sem. */
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

export async function getOrCreateSelfFamilyMemberId(): Promise<string> {
  const user = await requireUser();
  const existing = await prisma.familyMember.findFirst({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  if (existing) return existing.id;

  const created = await prisma.familyMember.create({
    data: { name: user.name, userId: user.id },
  });
  return created.id;
}

export async function createFamilyMember(data: { name: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = createFamilyMemberSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const member = await prisma.familyMember.create({
    data: { name: parsed.data.name, userId: user.id },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: { id: member.id } };
}

export async function updateFamilyMember(data: { id: string; name: string }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateFamilyMemberSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const existing = await prisma.familyMember.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });

  if (!existing) {
    return { success: false, error: "Családtag nem található" };
  }

  await prisma.familyMember.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: undefined };
}

export async function deleteFamilyMember(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await prisma.familyMember.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return { success: false, error: "Családtag nem található" };
  }

  await prisma.familyMember.delete({ where: { id } });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: undefined };
}

/** Tulajdonos összekapcsolja virtuális profilját a saját fiókjával. */
export async function linkFamilyMemberToAccount(data: {
  familyMemberId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = linkFamilyMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const member = await prisma.familyMember.findFirst({
    where: { id: parsed.data.familyMemberId, userId: user.id },
  });

  if (!member) {
    return { success: false, error: "Családtag nem található" };
  }

  if (member.linkedUserId && member.linkedUserId !== user.id) {
    return { success: false, error: "Ez a profil már más fiókhoz van kapcsolva" };
  }

  const existingLink = await prisma.familyMember.findFirst({
    where: { linkedUserId: user.id, id: { not: member.id } },
  });

  if (existingLink) {
    return {
      success: false,
      error: "A fiókod már össze van kapcsolva egy másik profillal",
    };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: user.id },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: undefined };
}

export async function unlinkFamilyMemberFromAccount(
  familyMemberId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId: user.id },
  });

  if (!member) {
    return { success: false, error: "Családtag nem található" };
  }

  if (member.linkedUserId !== user.id) {
    return { success: false, error: "Csak a saját fiókodhoz kapcsolt profilt választhatod le" };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: null },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: undefined };
}

/** Meghívott felhasználó átvesz egy virtuális profilt az utazáson. */
export async function claimFamilyMemberProfile(data: {
  familyMemberId: string;
  tripId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = claimFamilyMemberSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const participant = await prisma.tripParticipant.findFirst({
    where: {
      tripId: parsed.data.tripId,
      familyMemberId: parsed.data.familyMemberId,
    },
    include: { familyMember: true },
  });

  if (!participant) {
    return { success: false, error: "A profil nem résztvevő ezen az utazáson" };
  }

  if (participant.familyMember.linkedUserId) {
    return { success: false, error: "Ez a profil már össze van kapcsolva egy fiókkal" };
  }

  const existingLink = await prisma.familyMember.findFirst({
    where: { linkedUserId: user.id },
  });

  if (existingLink) {
    return {
      success: false,
      error: "A fiókod már össze van kapcsolva egy másik profillal",
    };
  }

  await prisma.familyMember.update({
    where: { id: parsed.data.familyMemberId },
    data: { linkedUserId: user.id },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: undefined };
}

/** Regisztráció / csatlakozás után: név alapján automatikus profil-átvétel. */
export async function autoClaimMatchingProfile(tripId: string, userId: string, userName: string) {
  if (!userName.trim()) return null;

  const participants = await prisma.tripParticipant.findMany({
    where: {
      tripId,
      familyMember: {
        linkedUserId: null,
        name: { equals: userName, mode: "insensitive" },
      },
    },
    include: { familyMember: true },
  });

  if (participants.length !== 1) return null;

  const member = participants[0]!.familyMember;

  const existingLink = await prisma.familyMember.findFirst({
    where: { linkedUserId: userId },
  });
  if (existingLink) return null;

  return prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: userId },
  });
}

/**
 * Bejelentkezéskor: ha a felhasználó neve megegyezik egy másik család
 * virtuális profiljával, amely már szerepel utazásban, automatikus összekapcsolás
 * és közreműködői hozzáférés az érintett utazásokhoz.
 */
export async function autoLinkRegisteredUserToParticipantProfiles(
  userId: string,
  userName: string
): Promise<{ linkedMemberId: string; tripIds: string[] } | null> {
  if (!userName.trim()) return null;

  const alreadyLinked = await prisma.familyMember.findFirst({
    where: { linkedUserId: userId },
  });
  if (alreadyLinked) return null;

  const candidates = await prisma.familyMember.findMany({
    where: {
      linkedUserId: null,
      userId: { not: userId },
      name: { equals: userName, mode: "insensitive" },
      trips: { some: {} },
    },
    include: {
      trips: {
        select: {
          tripId: true,
          trip: { select: { userId: true } },
        },
      },
    },
  });

  if (candidates.length !== 1) return null;

  const member = candidates[0]!;

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: userId },
  });

  const tripIds = [...new Set(member.trips.map((t) => t.tripId))];

  for (const tripId of tripIds) {
    await prisma.tripCollaborator.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId },
      update: {},
    });
  }

  return { linkedMemberId: member.id, tripIds };
}
