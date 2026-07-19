"use server";

import { prisma } from "@csaladi-utazas/database";
import { parseDate, duplicateTripSchema, shiftDateValue, dayOffsetMs } from "@csaladi-utazas/shared";
import { findAccessibleTrip, findOwnedTrip, generateInviteCode, tripAccessFilter } from "@/lib/trip-access";
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
        participants: {
          create: parsed.data.participantIds.map((familyMemberId: string) => ({ familyMemberId })),
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
