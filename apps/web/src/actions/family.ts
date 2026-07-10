"use server";

import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { invalidateFamilyAndCalendar, invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { revalidatePath } from "next/cache";
import {
  createFamilyMemberSchema,
  updateFamilyMemberSchema,
  claimFamilyMemberSchema,
  linkFamilyMemberSchema,
  familyMemberLinkProposalSchema,
} from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";
import { findAccessibleTrip } from "@/lib/trip-access";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseFamilyMemberEmail(email: string | undefined) {
  const trimmed = email?.trim();
  return trimmed ? normalizeEmail(trimmed) : null;
}

async function findUniqueAutoLinkCandidate(
  userId: string,
  userEmail: string | undefined,
  userName: string,
  tripId?: string,
  options?: { allowEmailMatch?: boolean }
) {
  const allowEmailMatch = options?.allowEmailMatch ?? true;
  const baseWhere = {
    linkedUserId: null,
    userId: { not: userId },
    pendingLinkUserId: null,
    ...(tripId
      ? { trips: { some: { tripId } } }
      : { trips: { some: {} } }),
  };

  const normalizedEmail = userEmail ? normalizeEmail(userEmail) : null;
  if (normalizedEmail && allowEmailMatch) {
    const emailCandidates = await prisma.familyMember.findMany({
      where: {
        ...baseWhere,
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
    });

    if (emailCandidates.length === 1) return emailCandidates[0]!;
    if (emailCandidates.length > 1) return null;
  }

  if (!userName.trim()) return null;

  const nameCandidates = await prisma.familyMember.findMany({
    where: {
      ...baseWhere,
      name: { equals: userName, mode: "insensitive" },
    },
  });

  if (nameCandidates.length !== 1) return null;
  return nameCandidates[0]!;
}

async function grantCollaboratorAccess(userId: string, tripIds: string[]) {
  for (const tripId of tripIds) {
    await prisma.tripCollaborator.upsert({
      where: { tripId_userId: { tripId, userId } },
      create: { tripId, userId },
      update: {},
    });
  }
}

async function findExternalLinkedProfile(userId: string, excludeMemberId?: string) {
  return prisma.familyMember.findFirst({
    where: {
      linkedUserId: userId,
      userId: { not: userId },
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
  });
}

type MatchedRegisteredUser = { id: string; name: string; email: string };

async function findRegisteredUserForMemberEmail(
  ownerUserId: string,
  email: string | null | undefined,
  forMemberId?: string
): Promise<MatchedRegisteredUser | null> {
  if (!email) return null;

  const matched = await prisma.user.findFirst({
    where: {
      email: { equals: normalizeEmail(email), mode: "insensitive" },
      id: { not: ownerUserId },
    },
    select: { id: true, name: true, email: true },
  });

  if (!matched) return null;

  const linkedElsewhere = await findExternalLinkedProfile(matched.id, forMemberId);
  if (linkedElsewhere) return null;

  return matched;
}

async function getTripIdsForFamilyMember(familyMemberId: string) {
  return [
    ...new Set(
      (
        await prisma.tripParticipant.findMany({
          where: { familyMemberId },
          select: { tripId: true, trip: { select: { userId: true } } },
        })
      ).map((t) => t.tripId)
    ),
  ];
}

async function finalizeFamilyMemberLink(familyMemberId: string, userId: string) {
  const member = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
    select: { userId: true },
  });
  if (!member?.userId) return;

  const tripIds = await getTripIdsForFamilyMember(familyMemberId);
  await grantCollaboratorAccess(userId, tripIds);

  invalidateFamilyAndCalendar(member.userId);
  invalidateFamilyAndCalendar(userId);
  for (const tripId of tripIds) {
    invalidateTripsAndReports(userId, tripId);
    invalidateTripsAndReports(member.userId, tripId);
  }
}

export async function getFamilyMembers() {
  const user = await requireUser();
  await ensureSelfFamilyMember(user.id, user.name);
  return prisma.familyMember.findMany({
    where: { userId: user.id },
    include: {
      linkedUser: { select: { id: true, email: true, name: true } },
      pendingLinkUser: { select: { id: true, email: true, name: true } },
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

export async function createFamilyMember(data: {
  name: string;
  email?: string;
}): Promise<
  ActionResult<{ id: string; matchedRegisteredUser: MatchedRegisteredUser | null }>
> {
  const user = await requireUser();
  const parsed = createFamilyMemberSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const parsedEmail = parseFamilyMemberEmail(parsed.data.email);
  const matchedRegisteredUser = await findRegisteredUserForMemberEmail(user.id, parsedEmail);

  const member = await prisma.familyMember.create({
    data: {
      name: parsed.data.name,
      email: parsedEmail,
      userId: user.id,
    },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: { id: member.id, matchedRegisteredUser } };
}

export async function updateFamilyMember(data: {
  id: string;
  name: string;
  email?: string;
}): Promise<ActionResult<{ matchedRegisteredUser: MatchedRegisteredUser | null }>> {
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

  const parsedEmail = parseFamilyMemberEmail(parsed.data.email);
  const emailChanged =
    (existing.email ?? "").toLowerCase() !== (parsedEmail ?? "").toLowerCase();
  const matchedRegisteredUser = await findRegisteredUserForMemberEmail(
    user.id,
    parsedEmail,
    parsed.data.id
  );

  await prisma.familyMember.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      email: parsedEmail,
      ...(emailChanged ? { pendingLinkUserId: null } : {}),
    },
  });

  invalidateFamilyAndCalendar(user.id);
  return { success: true, data: { matchedRegisteredUser } };
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

  const existingExternal = await findExternalLinkedProfile(user.id, member.id);
  if (existingExternal) {
    return {
      success: false,
      error: "A fiókod már össze van kapcsolva egy másik virtuális profillal",
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

/** Tulajdonos összekapcsolási kérelmet küld a regisztrált felhasználónak (e-mail egyezés alapján). */
export async function proposeFamilyMemberLink(data: {
  familyMemberId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = familyMemberLinkProposalSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const member = await prisma.familyMember.findFirst({
    where: { id: parsed.data.familyMemberId, userId: user.id },
  });

  if (!member) {
    return { success: false, error: "Családtag nem található" };
  }

  if (member.linkedUserId) {
    return { success: false, error: "Ez a profil már össze van kapcsolva egy fiókkal" };
  }

  if (!member.email) {
    return { success: false, error: "Add meg az e-mail címet az összekapcsolási kérelemhez" };
  }

  const matched = await findRegisteredUserForMemberEmail(user.id, member.email, member.id);
  if (!matched) {
    return {
      success: false,
      error:
        "Nem található regisztrált fiók ehhez az e-mail címhez, vagy már össze van kapcsolva egy másik virtuális profillal",
    };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: {
      pendingLinkUserId: matched.id,
      linkProposalOutcome: null,
      linkProposalOutcomeAt: null,
      linkProposalOutcomeSeenAt: null,
      linkProposalRespondedUserId: null,
    },
  });

  invalidateFamilyAndCalendar(user.id);
  invalidateFamilyAndCalendar(matched.id);
  revalidatePath("/", "layout");
  return {
    success: true,
    data: undefined,
    message: `${matched.name} kap egy megerősítési kérelmet bejelentkezéskor.`,
  };
}

export async function cancelFamilyMemberLinkProposal(
  familyMemberId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const member = await prisma.familyMember.findFirst({
    where: { id: familyMemberId, userId: user.id },
  });

  if (!member) {
    return { success: false, error: "Családtag nem található" };
  }

  if (!member.pendingLinkUserId) {
    return { success: false, error: "Nincs függőben lévő összekapcsolási kérelem" };
  }

  const pendingUserId = member.pendingLinkUserId;

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { pendingLinkUserId: null },
  });

  invalidateFamilyAndCalendar(user.id);
  invalidateFamilyAndCalendar(pendingUserId);
  return { success: true, data: undefined };
}

export async function fetchPendingFamilyLinkRequests() {
  const user = await requireUser();

  return prisma.familyMember.findMany({
    where: {
      pendingLinkUserId: user.id,
      linkedUserId: null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });
}

/** Célfelhasználó elfogadja az összekapcsolási kérelmet. */
export async function acceptFamilyMemberLinkProposal(
  familyMemberId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      pendingLinkUserId: user.id,
      linkedUserId: null,
    },
  });

  if (!member) {
    return { success: false, error: "Összekapcsolási kérelem nem található vagy lejárt" };
  }

  const existingExternalLink = await findExternalLinkedProfile(user.id, familyMemberId);
  if (existingExternalLink) {
    return {
      success: false,
      error: "A fiókod már össze van kapcsolva egy másik virtuális profillal",
    };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: {
      linkedUserId: user.id,
      pendingLinkUserId: null,
      linkProposalOutcome: "ACCEPTED",
      linkProposalOutcomeAt: new Date(),
      linkProposalOutcomeSeenAt: null,
      linkProposalRespondedUserId: user.id,
    },
  });

  if (member.userId) invalidateFamilyAndCalendar(member.userId);
  await finalizeFamilyMemberLink(member.id, user.id);
  revalidatePath("/", "layout");
  return { success: true, data: undefined, message: "Profil sikeresen összekapcsolva" };
}

/** Célfelhasználó elutasítja az összekapcsolási kérelmet. */
export async function rejectFamilyMemberLinkProposal(
  familyMemberId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      pendingLinkUserId: user.id,
    },
    select: { id: true, userId: true },
  });

  if (!member) {
    return { success: false, error: "Összekapcsolási kérelem nem található" };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: {
      pendingLinkUserId: null,
      linkProposalOutcome: "REJECTED",
      linkProposalOutcomeAt: new Date(),
      linkProposalOutcomeSeenAt: null,
      linkProposalRespondedUserId: user.id,
    },
  });

  if (member.userId) invalidateFamilyAndCalendar(member.userId);
  invalidateFamilyAndCalendar(user.id);
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/** Küldő elrejti az elfogadás / elutasítás visszajelzést. */
export async function dismissFamilyLinkProposalOutcome(
  familyMemberId: string
): Promise<ActionResult> {
  const user = await requireUser();

  const member = await prisma.familyMember.findFirst({
    where: {
      id: familyMemberId,
      userId: user.id,
      linkProposalOutcome: { in: ["ACCEPTED", "REJECTED"] },
      linkProposalOutcomeSeenAt: null,
    },
  });

  if (!member) {
    return { success: false, error: "Értesítés nem található" };
  }

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkProposalOutcomeSeenAt: new Date() },
  });

  invalidateFamilyAndCalendar(user.id);
  revalidatePath("/", "layout");
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

  const existingExternal = await findExternalLinkedProfile(user.id, parsed.data.familyMemberId);
  if (existingExternal) {
    return {
      success: false,
      error: "A fiókod már össze van kapcsolva egy másik virtuális profillal",
    };
  }

  await prisma.familyMember.update({
    where: { id: parsed.data.familyMemberId },
    data: { linkedUserId: user.id },
  });

  await finalizeFamilyMemberLink(parsed.data.familyMemberId, user.id);
  return { success: true, data: undefined };
}

/** Regisztráció / csatlakozás után: e-mail vagy név alapján automatikus profil-átvétel. */
export async function autoClaimMatchingProfile(
  tripId: string,
  userId: string,
  userName: string,
  userEmail?: string
) {
  const existingExternal = await findExternalLinkedProfile(userId);
  if (existingExternal) return null;

  const member = await findUniqueAutoLinkCandidate(userId, userEmail, userName, tripId);
  if (!member) return null;

  return prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: userId },
  });
}

/**
 * Bejelentkezéskor: ha a felhasználó e-mailje vagy neve megegyezik egy másik család
 * virtuális profiljával, amely már szerepel utazásban, automatikus összekapcsolás
 * és közreműködői hozzáférés az érintett utazásokhoz.
 */
export async function autoLinkRegisteredUserToParticipantProfiles(
  userId: string,
  userName: string,
  userEmail?: string,
  options?: { allowEmailMatch?: boolean }
): Promise<{ linkedMemberId: string; tripIds: string[] } | null> {
  const pendingCount = await prisma.familyMember.count({
    where: { pendingLinkUserId: userId, linkedUserId: null },
  });
  if (pendingCount > 0) return null;

  const existingExternal = await findExternalLinkedProfile(userId);
  if (existingExternal) return null;

  const member = await findUniqueAutoLinkCandidate(
    userId,
    userEmail,
    userName,
    undefined,
    options
  );
  if (!member) return null;

  await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: userId, pendingLinkUserId: null },
  });

  const tripIds = await getTripIdsForFamilyMember(member.id);
  await grantCollaboratorAccess(userId, tripIds);

  if (member.userId) {
    invalidateFamilyAndCalendar(member.userId);
    for (const tripId of tripIds) {
      invalidateTripsAndReports(member.userId, tripId);
    }
  }
  invalidateFamilyAndCalendar(userId);
  for (const tripId of tripIds) {
    invalidateTripsAndReports(userId, tripId);
  }

  return { linkedMemberId: member.id, tripIds };
}
