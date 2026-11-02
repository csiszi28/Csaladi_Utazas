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
  personNamesMatch,
} from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";
import { findAccessibleTrip } from "@/lib/trip-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureSelfFamilyMember as ensureSelfFamilyMemberShared } from "@/lib/queries/family";

/** Összekapcsolással kapcsolatos műveletek: felhasználónként percenként ennyi. */
const LINK_ACTIONS_PER_MINUTE = 20;

function tooManyRequests(userId: string): ActionResult | null {
  const limited = checkRateLimit(`family-link:${userId}`, LINK_ACTIONS_PER_MINUTE, 60_000);
  return limited.ok
    ? null
    : { success: false, error: "Túl sok kérés. Próbáld újra egy perc múlva." };
}

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
  // Névegyezés csak egy konkrét utazáson belül (meghívóval csatlakozó) megengedett.
  // Utazás nélküli (bejelentkezéskori) keresés kizárólag e-mail alapján működik —
  // a név bárki számára megadható, ezért nem alkalmas azonosításra.
  const allowNameMatch = Boolean(tripId);
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

  if (!allowNameMatch || !userName.trim()) return null;

  // Név-egyezés token-sorrendtől függetlenül („Attila Csiszár” ≡ „Csiszár Attila”)
  const namePool = await prisma.familyMember.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
      linkedUserId: true,
      pendingLinkUserId: true,
    },
  });

  const nameCandidates = namePool.filter((m) => personNamesMatch(m.name, userName));
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

/**
 * Egy fiók több háztartás profiljához is köthető (pl. nagyszülő), de egy háztartáson
 * belül csak egyhez. Ez a háztartáson belüli ütközést keresi.
 */
async function findLinkedProfileInHousehold(
  householdOwnerId: string | null | undefined,
  accountUserId: string,
  excludeMemberId?: string
) {
  if (!householdOwnerId) return null;
  return prisma.familyMember.findFirst({
    where: {
      userId: householdOwnerId,
      linkedUserId: accountUserId,
      ...(excludeMemberId ? { id: { not: excludeMemberId } } : {}),
    },
    select: { id: true },
  });
}

const ALREADY_LINKED_IN_HOUSEHOLD =
  "Ez a fiók már hozzá van kapcsolva egy másik profilhoz ebben a családban";

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

  const linkedInHousehold = await findLinkedProfileInHousehold(ownerUserId, matched.id, forMemberId);
  if (linkedInHousehold) return null;

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

/**
 * @param options.onlyTripId ha meg van adva (utazáson belüli átvétel), a hozzáférést csak erre az
 *   utazásra adjuk — a profil más utazásaihoz az átvétel nem jogosít fel. A tulajdonos által
 *   kezdeményezett, megerősített összekapcsolás a profil összes utazására érvényes.
 */
async function finalizeFamilyMemberLink(
  familyMemberId: string,
  userId: string,
  options?: { onlyTripId?: string }
) {
  const member = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
    select: { userId: true },
  });
  if (!member?.userId) return;

  const tripIds = await getTripIdsForFamilyMember(familyMemberId);
  const accessTripIds = options?.onlyTripId
    ? tripIds.filter((id) => id === options.onlyTripId)
    : tripIds;
  await grantCollaboratorAccess(userId, accessTripIds);

  // Duplikált saját „én” sor eltávolítása az átvett profilt tartalmazó utazásokról
  const selfProfiles = await prisma.familyMember.findMany({
    where: {
      userId,
      linkedUserId: userId,
      id: { not: familyMemberId },
    },
    select: { id: true },
  });
  if (selfProfiles.length > 0 && tripIds.length > 0) {
    await prisma.tripParticipant.deleteMany({
      where: {
        tripId: { in: tripIds },
        familyMemberId: { in: selfProfiles.map((s) => s.id) },
      },
    });
  }

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

/** Létrehozza a bejelentkezett felhasználó „én” profilját, ha még nincs (közös implementáció). */
export async function ensureSelfFamilyMember(userId: string, userName: string) {
  return ensureSelfFamilyMemberShared(userId, userName);
}

/** A bejelentkezett felhasználó saját, fiókjához kötött „én” profilja (szükség esetén létrehozza). */
export async function getOrCreateSelfFamilyMemberId(): Promise<string> {
  const user = await requireUser();
  const findSelf = () =>
    prisma.familyMember.findFirst({
      where: { userId: user.id, linkedUserId: user.id },
      select: { id: true },
    });

  const self = (await findSelf()) ?? (await ensureSelfFamilyMemberShared(user.id, user.name), await findSelf());
  if (self) return self.id;

  const created = await prisma.familyMember.create({
    data: { name: user.name, userId: user.id, linkedUserId: user.id },
    select: { id: true },
  });
  return created.id;
}

/** Az e-mail megadása után a felület felajánlhatja az összekapcsolási kérelmet — fiók létezését nem áruljuk el. */
type LinkSuggestion = { email: string } | null;

export async function createFamilyMember(data: {
  name: string;
  email?: string;
  isChild?: boolean;
  /** Az új családtag felvétele a közelgő / folyamatban lévő utazások résztvevői közé is. */
  addToUpcomingTrips?: boolean;
}): Promise<ActionResult<{ id: string; linkSuggestion: LinkSuggestion; addedToTrips: number }>> {
  const user = await requireUser();
  const parsed = createFamilyMemberSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const parsedEmail = parseFamilyMemberEmail(parsed.data.email);

  const member = await prisma.familyMember.create({
    data: {
      name: parsed.data.name,
      email: parsedEmail,
      isChild: parsed.data.isChild ?? false,
      userId: user.id,
    },
  });
  // Új családtag csak a későbbi felvételnél kerülne az utazásokra — itt kérésre azonnal rá is tesszük
  // azokra, amelyeken szerkeszthetünk és még nem zárultak le.
  let addedToTrips = 0;
  if (data.addToUpcomingTrips) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trips = await prisma.trip.findMany({
      where: {
        isTemplate: false,
        endDate: { gte: today },
        OR: [
          { userId: user.id },
          { collaborators: { some: { userId: user.id, role: "EDITOR" } } },
        ],
      },
      select: { id: true },
    });
    if (trips.length > 0) {
      await prisma.tripParticipant.createMany({
        data: trips.map((trip) => ({ tripId: trip.id, familyMemberId: member.id })),
        skipDuplicates: true,
      });
      addedToTrips = trips.length;
      for (const trip of trips) invalidateTripsAndReports(user.id, trip.id);
    }
  }

  invalidateFamilyAndCalendar(user.id);
  return {
    success: true,
    data: {
      id: member.id,
      linkSuggestion: parsedEmail ? { email: parsedEmail } : null,
      addedToTrips,
    },
  };
}

export async function updateFamilyMember(data: {
  id: string;
  name: string;
  email?: string;
  isChild?: boolean;
}): Promise<ActionResult<{ linkSuggestion: LinkSuggestion }>> {
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

  await prisma.familyMember.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      email: parsedEmail,
      isChild: parsed.data.isChild ?? false,
      ...(emailChanged ? { pendingLinkUserId: null } : {}),
    },
  });

  invalidateFamilyAndCalendar(user.id);
  // Ajánlat csak akkor, ha az e-mail új, és a profil még nincs fiókhoz kötve
  const suggest = parsedEmail && emailChanged && !existing.linkedUserId;
  return { success: true, data: { linkSuggestion: suggest ? { email: parsedEmail } : null } };
}

export type FamilyMemberDeleteImpact = {
  name: string;
  trips: number;
  paidCosts: number;
  documents: number;
  linkedToAccount: boolean;
};

/** Törlés előtti hatásvizsgálat: mi veszik el / válik névtelenné. */
export async function getFamilyMemberDeleteImpact(
  id: string
): Promise<ActionResult<FamilyMemberDeleteImpact>> {
  const user = await requireUser();
  const member = await prisma.familyMember.findFirst({
    where: { id, userId: user.id },
    select: {
      name: true,
      linkedUserId: true,
      _count: { select: { trips: true, paidCosts: true, documents: true } },
    },
  });
  if (!member) return { success: false, error: "Családtag nem található" };

  return {
    success: true,
    data: {
      name: member.name,
      trips: member._count.trips,
      paidCosts: member._count.paidCosts,
      documents: member._count.documents,
      linkedToAccount: member.linkedUserId === user.id,
    },
  };
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

  const existingSelf = await findLinkedProfileInHousehold(user.id, user.id, member.id);
  if (existingSelf) {
    return { success: false, error: ALREADY_LINKED_IN_HOUSEHOLD };
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
  const limited = tooManyRequests(user.id);
  if (limited) return limited;
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

  const neutralMessage =
    "Ha az e-mail címhez tartozik fiók, bejelentkezéskor megerősítési kérelmet kap.";

  const matched = await findRegisteredUserForMemberEmail(user.id, member.email, member.id);
  if (!matched) {
    // Szándékosan ugyanaz a válasz: ne derüljön ki, hogy egy e-mailhez van-e fiók.
    return { success: true, data: undefined, message: neutralMessage };
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
    message: neutralMessage,
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

  const existingInHousehold = await findLinkedProfileInHousehold(member.userId, user.id, familyMemberId);
  if (existingInHousehold) {
    return { success: false, error: ALREADY_LINKED_IN_HOUSEHOLD };
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

  const existingInHousehold = await findLinkedProfileInHousehold(
    participant.familyMember.userId,
    user.id,
    parsed.data.familyMemberId
  );
  if (existingInHousehold) {
    return { success: false, error: ALREADY_LINKED_IN_HOUSEHOLD };
  }

  await prisma.familyMember.update({
    where: { id: parsed.data.familyMemberId },
    data: { linkedUserId: user.id },
  });

  // Az átvétel csak erre az utazásra ad hozzáférést
  await finalizeFamilyMemberLink(parsed.data.familyMemberId, user.id, {
    onlyTripId: parsed.data.tripId,
  });
  return { success: true, data: undefined };
}

/**
 * Meghívóval való csatlakozáskor: az adott utazás ki nem kötött résztvevői közül e-mail vagy
 * (egyedi) név alapján profil-átvétel. A hozzáférés kizárólag erre az utazásra szól.
 */
export async function autoClaimMatchingProfile(
  tripId: string,
  userId: string,
  userName: string,
  userEmail?: string
) {
  const member = await findUniqueAutoLinkCandidate(userId, userEmail, userName, tripId);
  if (!member) return null;

  const existingInHousehold = await findLinkedProfileInHousehold(member.userId, userId, member.id);
  if (existingInHousehold) return null;

  const updated = await prisma.familyMember.update({
    where: { id: member.id },
    data: { linkedUserId: userId, pendingLinkUserId: null },
  });

  await finalizeFamilyMemberLink(member.id, userId, { onlyTripId: tripId });
  return updated;
}

/**
 * Bejelentkezéskor: ha a felhasználó e-mail címe pontosan megegyezik egy másik család ki nem
 * kötött profiljának e-mail címével (amely már szerepel utazásban), **kérelmet** hozunk létre,
 * amelyet a felhasználó megerősít vagy elutasít. Közvetlen összekötés és hozzáférés nincs:
 * a név bárkinek megadható, az e-mail cím beírása pedig nem bizonyítja a tulajdont.
 */
export async function autoLinkRegisteredUserToParticipantProfiles(
  userId: string,
  _userName: string,
  userEmail?: string,
  options?: { allowEmailMatch?: boolean }
): Promise<{ proposedMemberIds: string[] } | null> {
  if (!userEmail || options?.allowEmailMatch === false) return null;

  const candidates = await prisma.familyMember.findMany({
    where: {
      linkedUserId: null,
      pendingLinkUserId: null,
      userId: { not: userId },
      email: { equals: normalizeEmail(userEmail), mode: "insensitive" },
      trips: { some: {} },
    },
    select: { id: true, userId: true },
  });
  if (candidates.length === 0) return null;

  const proposed: string[] = [];
  for (const candidate of candidates) {
    const existingInHousehold = await findLinkedProfileInHousehold(candidate.userId, userId, candidate.id);
    if (existingInHousehold) continue;

    await prisma.familyMember.update({
      where: { id: candidate.id },
      data: {
        pendingLinkUserId: userId,
        linkProposalOutcome: null,
        linkProposalOutcomeAt: null,
        linkProposalOutcomeSeenAt: null,
        linkProposalRespondedUserId: null,
      },
    });
    proposed.push(candidate.id);
    if (candidate.userId) invalidateFamilyAndCalendar(candidate.userId);
  }
  if (proposed.length === 0) return null;

  invalidateFamilyAndCalendar(userId);
  return { proposedMemberIds: proposed };
}
