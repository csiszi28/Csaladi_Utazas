"use server";

import { prisma } from "@csaladi-utazas/database";
import { parseDate, duplicateTripSchema, shiftDateValue, dayOffsetMs } from "@csaladi-utazas/shared";
import { findOwnedTrip, generateInviteCode, requireTripEditor, tripAccessFilter } from "@/lib/trip-access";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { tripSchema, updateTripSchema } from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";

const tripInclude = {
  participants: {
    include: { familyMember: true },
  },
  programs: {
    include: {
      participants: { include: { familyMember: true } },
      costs: true,
    },
    orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
  },
  costs: true,
  documents: true,
};

/** Könnyű lekérdezés a naptárhoz – egyszer töltődik, hónapváltás kliensoldali */
const calendarSelect = {
  id: true,
  title: true,
  destination: true,
  startDate: true,
  endDate: true,
  participants: {
    select: { familyMember: { select: { id: true, name: true } } },
  },
  programs: {
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      url: true,
      participants: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
      costs: { select: { id: true, amount: true, currency: true, title: true } },
    },
    orderBy: [{ date: "asc" as const }, { startTime: "asc" as const }],
  },
  costs: { select: { id: true, amount: true, currency: true, title: true, programId: true } },
};

export async function getTripsList() {
  const user = await requireUser();
  return prisma.trip.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      participants: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
      _count: { select: { programs: true, costs: true } },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function getTrips() {
  const user = await requireUser();
  return prisma.trip.findMany({
    where: { userId: user.id },
    include: tripInclude,
    orderBy: { startDate: "asc" },
  });
}

export async function getTrip(id: string) {
  const user = await requireUser();
  return prisma.trip.findFirst({
    where: { id, userId: user.id },
    include: tripInclude,
  });
}

export async function getCalendarData(_year?: number, _month?: number) {
  const user = await requireUser();
  return prisma.trip.findMany({
    where: { userId: user.id },
    select: calendarSelect,
    orderBy: { startDate: "asc" },
  });
}

export async function createTrip(data: {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  participantIds: string[];
  budgetAmount?: number | null;
  budgetCurrency?: string;
  tripType?: string | null;
  isTemplate?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  let participantIds = data.participantIds;
  if (participantIds.length === 0) {
    const { getOrCreateSelfFamilyMemberId } = await import("@/actions/family");
    participantIds = [await getOrCreateSelfFamilyMemberId()];
  }

  const parsed = tripSchema.safeParse({ ...data, participantIds });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const members = await prisma.familyMember.findMany({
    where: { id: { in: parsed.data.participantIds }, userId: user.id },
  });

  if (members.length !== parsed.data.participantIds.length) {
    return { success: false, error: "Érvénytelen résztvevők" };
  }

  const trip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
      budgetAmount: parsed.data.budgetAmount ?? null,
      budgetCurrency: parsed.data.budgetCurrency ?? "HUF",
      tripType: parsed.data.tripType ?? null,
      isTemplate: parsed.data.isTemplate ?? false,
      userId: user.id,
      inviteCode: generateInviteCode(),
      participants: {
        create: parsed.data.participantIds.map((familyMemberId: string) => ({ familyMemberId })),
      },
    },
  });

  invalidateTripsAndReports(user.id);
  return { success: true, data: { id: trip.id } };
}

export async function updateTrip(data: {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  participantIds: string[];
  budgetAmount?: number | null;
  budgetCurrency?: string;
  tripType?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateTripSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const existing = await findOwnedTrip(parsed.data.id, user.id);

  if (!existing) {
    return { success: false, error: "Utazás nem található" };
  }

  const ownedMembers = await prisma.familyMember.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const ownedSet = new Set(ownedMembers.map((m) => m.id));

  const previous = await prisma.tripParticipant.findMany({
    where: { tripId: parsed.data.id },
    select: { familyMemberId: true },
  });
  const preservedOtherIds = previous
    .map((p) => p.familyMemberId)
    .filter((id) => !ownedSet.has(id));
  const submittedOwnedIds = parsed.data.participantIds.filter((id) => ownedSet.has(id));
  const finalParticipantIds = [...new Set([...preservedOtherIds, ...submittedOwnedIds])];

  if (finalParticipantIds.length === 0) {
    return { success: false, error: "Legalább egy résztvevő kötelező" };
  }

  await prisma.$transaction([
    prisma.tripParticipant.deleteMany({ where: { tripId: parsed.data.id } }),
    prisma.trip.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        destination: parsed.data.destination,
        startDate: parseDate(parsed.data.startDate),
        endDate: parseDate(parsed.data.endDate),
        budgetAmount: parsed.data.budgetAmount ?? null,
        budgetCurrency: parsed.data.budgetCurrency ?? "HUF",
        tripType: parsed.data.tripType ?? null,
        participants: {
          create: finalParticipantIds.map((familyMemberId: string) => ({ familyMemberId })),
        },
      },
    }),
  ]);

  invalidateTripsAndReports(user.id, parsed.data.id);
  return { success: true, data: undefined };
}

export async function deleteTrip(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await findOwnedTrip(id, user.id);

  if (!existing) {
    return { success: false, error: "Utazás nem található" };
  }

  await prisma.trip.delete({ where: { id } });

  invalidateTripsAndReports(user.id);
  return { success: true, data: undefined };
}

export async function duplicateTrip(data: {
  sourceTripId: string;
  title: string;
  destination?: string;
  startDate: string;
  endDate: string;
  copyPrograms?: boolean;
  copyAccommodations?: boolean;
  copyTransports?: boolean;
  copyPacking?: boolean;
  copyIdeas?: boolean;
  copyBudget?: boolean;
  shiftProgramDates?: boolean;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = duplicateTripSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireTripEditor(parsed.data.sourceTripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const source = await prisma.trip.findFirst({
    where: { id: parsed.data.sourceTripId, ...tripAccessFilter(user.id) },
    include: {
      participants: { select: { familyMemberId: true } },
      programs: {
        include: {
          participants: { select: { familyMemberId: true } },
        },
        orderBy: { date: "asc" },
      },
      accommodations: {
        include: {
          participants: { select: { familyMemberId: true } },
        },
        orderBy: { checkIn: "asc" },
      },
      transports: {
        include: {
          participants: { select: { familyMemberId: true } },
        },
        orderBy: { departureDate: "asc" },
      },
      packingItems: true,
      ideas: true,
    },
  });

  if (!source) {
    return { success: false, error: "Forrás utazás nem található" };
  }

  const newStart = parseDate(parsed.data.startDate);
  const newEnd = parseDate(parsed.data.endDate);
  if (newEnd < newStart) {
    return { success: false, error: "A záró dátum nem lehet korábbi a kezdő dátumnál" };
  }

  const dateOffset = parsed.data.shiftProgramDates
    ? dayOffsetMs(source.startDate, newStart)
    : 0;

  const newTrip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      destination: parsed.data.destination ?? source.destination,
      startDate: newStart,
      endDate: newEnd,
      budgetAmount:
        parsed.data.copyBudget && source.budgetAmount != null ? source.budgetAmount : null,
      budgetCurrency: source.budgetCurrency,
      userId: user.id,
      inviteCode: generateInviteCode(),
      participants: {
        create: source.participants.map((p) => ({ familyMemberId: p.familyMemberId })),
      },
      ideas: parsed.data.copyIdeas
        ? {
            create: source.ideas.map((idea) => ({
              title: idea.title,
              url: idea.url,
              amount: idea.amount,
              currency: idea.currency,
              amountScope: idea.amountScope,
              category: idea.category,
              note: idea.note,
              checkInDate: idea.checkInDate
                ? shiftDateValue(idea.checkInDate, dateOffset)
                : null,
              checkOutDate: idea.checkOutDate
                ? shiftDateValue(idea.checkOutDate, dateOffset)
                : null,
            })),
          }
        : undefined,
      programs: parsed.data.copyPrograms
        ? {
            create: source.programs.map((program) => ({
              title: program.title,
              date: shiftDateValue(program.date, dateOffset),
              startTime: program.startTime,
              endTime: program.endTime,
              location: program.location,
              url: program.url,
              participants: {
                create: program.participants.map((p) => ({
                  familyMemberId: p.familyMemberId,
                })),
              },
            })),
          }
        : undefined,
      accommodations: parsed.data.copyAccommodations
        ? {
            create: source.accommodations.map((accommodation) => ({
              title: accommodation.title,
              checkIn: shiftDateValue(accommodation.checkIn, dateOffset),
              checkOut: shiftDateValue(accommodation.checkOut, dateOffset),
              url: accommodation.url,
              location: accommodation.location,
              note: accommodation.note,
              participants: {
                create: accommodation.participants.map((p) => ({
                  familyMemberId: p.familyMemberId,
                })),
              },
            })),
          }
        : undefined,
      transports: parsed.data.copyTransports
        ? {
            create: source.transports.map((transport) => ({
              type: transport.type,
              title: transport.title,
              departureDate: shiftDateValue(transport.departureDate, dateOffset),
              departureTime: transport.departureTime,
              arrivalDate: transport.arrivalDate
                ? shiftDateValue(transport.arrivalDate, dateOffset)
                : null,
              arrivalTime: transport.arrivalTime,
              fromLocation: transport.fromLocation,
              toLocation: transport.toLocation,
              bookingRef: transport.bookingRef,
              url: transport.url,
              note: transport.note,
              participants: {
                create: transport.participants.map((p) => ({
                  familyMemberId: p.familyMemberId,
                })),
              },
            })),
          }
        : undefined,
      packingItems: parsed.data.copyPacking
        ? {
            create: source.packingItems.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              assigneeFamilyMemberId: item.assigneeFamilyMemberId,
              isPacked: false,
              sortOrder: item.sortOrder,
            })),
          }
        : undefined,
    },
  });

  invalidateTripsAndReports(user.id);
  return { success: true, data: { id: newTrip.id } };
}

export async function updateCollaboratorRole(data: {
  tripId: string;
  userId: string;
  role: "EDITOR" | "VIEWER";
}): Promise<ActionResult> {
  const user = await requireUser();
  const { updateCollaboratorRoleSchema } = await import("@csaladi-utazas/shared");
  const parsed = updateCollaboratorRoleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const owned = await findOwnedTrip(parsed.data.tripId, user.id);
  if (!owned) return { success: false, error: "Csak a tulajdonos módosíthat szerepkört" };

  if (parsed.data.userId === user.id) {
    return { success: false, error: "A tulajdonos szerepköre nem módosítható" };
  }

  const collab = await prisma.tripCollaborator.findFirst({
    where: { tripId: parsed.data.tripId, userId: parsed.data.userId },
  });
  if (!collab) return { success: false, error: "Közreműködő nem található" };

  await prisma.tripCollaborator.update({
    where: { id: collab.id },
    data: { role: parsed.data.role },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function removeCollaborator(data: {
  tripId: string;
  userId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const { removeCollaboratorSchema } = await import("@csaladi-utazas/shared");
  const parsed = removeCollaboratorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const owned = await findOwnedTrip(parsed.data.tripId, user.id);
  if (!owned) {
    return { success: false, error: "Csak a tulajdonos távolíthat el közreműködőt" };
  }

  if (parsed.data.userId === user.id) {
    return { success: false, error: "A tulajdonos nem távolítható el" };
  }

  const collab = await prisma.tripCollaborator.findFirst({
    where: { tripId: parsed.data.tripId, userId: parsed.data.userId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!collab) return { success: false, error: "Közreműködő nem található" };

  try {
    await prisma.tripCollaborator.delete({ where: { id: collab.id } });
  } catch (error) {
    console.error("[removeCollaborator] delete failed:", error);
    return { success: false, error: "Nem sikerült eltávolítani a közreműködőt" };
  }

  const { createInboxNotification } = await import("@/lib/inbox-notifications");
  await createInboxNotification({
    userId: collab.userId,
    kind: "removed_from_trip",
    title: "Eltávolítva az utazásból",
    body: `${user.name} eltávolított a(z) „${owned.title}” utazás közreműködői közül.`,
    href: "/trips",
    tripId: owned.id,
    tripTitle: owned.title,
  });

  const { recordTripActivity } = await import("@/lib/trip-activity");
  await recordTripActivity({
    tripId: owned.id,
    actorUserId: user.id,
    type: "COLLABORATOR_REMOVED",
    summary: `${collab.user.name} eltávolítva a közreműködők közül`,
    meta: {
      removedUserId: collab.userId,
      removedUserName: collab.user.name,
    },
  });

  invalidateTripsAndReports(user.id, owned.id);
  invalidateTripsAndReports(collab.userId);
  return { success: true, data: undefined };
}

export async function saveTripAsTemplate(data: {
  tripId: string;
  title?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const { saveTripAsTemplateSchema, formatDate } = await import("@csaladi-utazas/shared");
  const parsed = saveTripAsTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const source = await prisma.trip.findFirst({
    where: { id: parsed.data.tripId, ...tripAccessFilter(user.id) },
    select: { title: true, destination: true, startDate: true, endDate: true, tripType: true },
  });
  if (!source) return { success: false, error: "Utazás nem található" };

  const result = await duplicateTrip({
    sourceTripId: parsed.data.tripId,
    title: parsed.data.title ?? `${source.title} (sablon)`,
    destination: source.destination,
    startDate: formatDate(source.startDate),
    endDate: formatDate(source.endDate),
    copyPrograms: true,
    copyAccommodations: true,
    copyTransports: true,
    copyPacking: true,
    copyIdeas: true,
    copyBudget: false,
    shiftProgramDates: false,
  });

  if (!result.success) return result;

  await prisma.trip.update({
    where: { id: result.data.id },
    data: {
      isTemplate: true,
      tripType: source.tripType,
      inviteCode: null,
    },
  });

  invalidateTripsAndReports(user.id, result.data.id);
  return { success: true, data: { id: result.data.id } };
}

export async function createTripFromTemplate(data: {
  templateId: string;
  title: string;
  startDate: string;
  participantIds: string[];
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const {
    createTripFromTemplateSchema,
    formatDate,
    parseDate: parseSharedDate,
  } = await import("@csaladi-utazas/shared");
  const parsed = createTripFromTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const template = await prisma.trip.findFirst({
    where: {
      id: parsed.data.templateId,
      isTemplate: true,
      ...tripAccessFilter(user.id),
    },
  });
  if (!template) return { success: false, error: "Sablon nem található" };

  const durationMs = template.endDate.getTime() - template.startDate.getTime();
  const newStart = parseSharedDate(parsed.data.startDate);
  const newEnd = new Date(newStart.getTime() + durationMs);

  const dup = await duplicateTrip({
    sourceTripId: template.id,
    title: parsed.data.title,
    destination: template.destination,
    startDate: formatDate(newStart),
    endDate: formatDate(newEnd),
    copyPrograms: true,
    copyAccommodations: true,
    copyTransports: true,
    copyPacking: true,
    copyIdeas: true,
    copyBudget: true,
    shiftProgramDates: true,
  });

  if (!dup.success) return dup;

  await prisma.$transaction([
    prisma.tripParticipant.deleteMany({ where: { tripId: dup.data.id } }),
    prisma.trip.update({
      where: { id: dup.data.id },
      data: {
        isTemplate: false,
        tripType: template.tripType,
        inviteCode: generateInviteCode(),
        participants: {
          create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
        },
      },
    }),
  ]);

  invalidateTripsAndReports(user.id, dup.data.id);
  return { success: true, data: { id: dup.data.id } };
}

export async function importIcalPrograms(data: {
  tripId: string;
  icalText: string;
  selectedIndexes?: number[];
}): Promise<ActionResult<{ created: number }>> {
  const user = await requireUser();
  const { importIcalProgramsSchema, parseIcalToProgramCandidates } = await import(
    "@csaladi-utazas/shared"
  );
  const parsed = importIcalProgramsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireTripEditor(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const candidates = parseIcalToProgramCandidates(parsed.data.icalText);
  if (candidates.length === 0) {
    return { success: false, error: "Nem található importálható esemény az iCal fájlban" };
  }

  const indexes =
    parsed.data.selectedIndexes ?? candidates.map((_, i) => i);
  const selected = indexes
    .filter((i) => i >= 0 && i < candidates.length)
    .map((i) => candidates[i]!);

  const participants = await prisma.tripParticipant.findMany({
    where: { tripId: parsed.data.tripId },
    select: { familyMemberId: true },
  });
  if (participants.length === 0) {
    return { success: false, error: "Az utazáson nincs résztvevő" };
  }

  let created = 0;
  for (const c of selected) {
    await prisma.program.create({
      data: {
        tripId: parsed.data.tripId,
        title: c.title,
        date: parseDate(c.date),
        startTime: c.startTime,
        endTime: c.endTime,
        location: c.location,
        url: c.url ?? "",
        participants: {
          create: participants.map((p) => ({ familyMemberId: p.familyMemberId })),
        },
      },
    });
    created += 1;
  }

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { created } };
}
