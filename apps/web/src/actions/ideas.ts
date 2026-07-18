"use server";

import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import {
  tripIdeaSchema,
  updateTripIdeaSchema,
  toggleIdeaInterestSchema,
  ideaMessageSchema,
  updateIdeaNoteSchema,
  updateIdeaMessageSchema,
  deleteIdeaMessageSchema,
} from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";
import { findAccessibleTrip } from "@/lib/trip-access";
import { isDateInRange, parseDate } from "@csaladi-utazas/shared";

function parseOptionalIdeaDate(value?: string | null): Date | null {
  if (!value) return null;
  return parseDate(value);
}

async function validateIdeaStayDates(
  tripId: string,
  checkInDate: Date | null,
  checkOutDate: Date | null
): Promise<string | null> {
  if (!checkInDate && !checkOutDate) return null;
  if (!checkInDate || !checkOutDate) {
    return "A be- és kijelentkezés dátuma együtt kötelező";
  }
  if (checkOutDate <= checkInDate) {
    return "A kijelentkezés dátuma későbbi kell legyen a bejelentkezésnél";
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId },
    select: { startDate: true, endDate: true },
  });
  if (!trip) return "Utazás nem található";

  if (!isDateInRange(checkInDate, trip.startDate, trip.endDate)) {
    return "A bejelentkezés dátuma az utazás időtartamán belül kell legyen";
  }
  if (!isDateInRange(checkOutDate, trip.startDate, trip.endDate)) {
    return "A kijelentkezés dátuma az utazás időtartamán belül kell legyen";
  }
  return null;
}

async function assertTripParticipant(tripId: string, familyMemberId: string) {
  const participant = await prisma.tripParticipant.findFirst({
    where: { tripId, familyMemberId },
  });
  return participant !== null;
}

async function findAccessibleIdea(ideaId: string, userId: string) {
  const idea = await prisma.tripIdea.findFirst({
    where: { id: ideaId },
    include: { trip: true },
  });
  if (!idea) return null;

  const accessible = await findAccessibleTrip(idea.tripId, userId);
  if (!accessible) return null;

  return idea;
}

async function syncIdeaInterests(
  ideaId: string,
  tripId: string,
  participantIds: string[]
) {
  const uniqueIds = [...new Set(participantIds)];

  for (const familyMemberId of uniqueIds) {
    const isParticipant = await assertTripParticipant(tripId, familyMemberId);
    if (!isParticipant) {
      throw new Error("A családtag nem résztvevő az utazáson");
    }
  }

  await prisma.tripIdeaInterest.deleteMany({
    where: {
      ideaId,
      ...(uniqueIds.length > 0 ? { familyMemberId: { notIn: uniqueIds } } : {}),
    },
  });

  for (const familyMemberId of uniqueIds) {
    await prisma.tripIdeaInterest.upsert({
      where: {
        ideaId_familyMemberId: { ideaId, familyMemberId },
      },
      create: { ideaId, familyMemberId },
      update: {},
    });
  }
}

export async function createTripIdea(data: {
  tripId: string;
  title: string;
  url?: string | null;
  amount?: number | null;
  currency?: string;
  amountScope?: string;
  category?: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  interestedParticipantIds?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = tripIdeaSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const eventDate = parseOptionalIdeaDate(parsed.data.date);
  if (eventDate) {
    const fullTrip = await prisma.trip.findFirst({
      where: { id: parsed.data.tripId },
      select: { startDate: true, endDate: true },
    });
    if (fullTrip && !isDateInRange(eventDate, fullTrip.startDate, fullTrip.endDate)) {
      return { success: false, error: "A dátum az utazás időtartamán belül kell legyen" };
    }
  }

  const checkInDate = parseOptionalIdeaDate(parsed.data.checkInDate);
  const checkOutDate = parseOptionalIdeaDate(parsed.data.checkOutDate);
  const dateError = await validateIdeaStayDates(parsed.data.tripId, checkInDate, checkOutDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const idea = await prisma.tripIdea.create({
    data: {
      tripId: parsed.data.tripId,
      title: parsed.data.title,
      url: parsed.data.url ?? null,
      amount: parsed.data.amount ?? null,
      currency: parsed.data.currency ?? "HUF",
      amountScope: parsed.data.amountScope ?? "TOTAL",
      category: parsed.data.category ?? "OTHER",
      date: eventDate,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      checkInDate,
      checkOutDate,
    },
  });

  try {
    await syncIdeaInterests(
      idea.id,
      parsed.data.tripId,
      parsed.data.interestedParticipantIds ?? []
    );
  } catch (err) {
    await prisma.tripIdea.delete({ where: { id: idea.id } });
    return {
      success: false,
      error: err instanceof Error ? err.message : "Érvénytelen résztvevők",
    };
  }

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { id: idea.id } };
}

export async function updateTripIdea(data: {
  id: string;
  tripId: string;
  title: string;
  url?: string | null;
  amount?: number | null;
  currency?: string;
  amountScope?: string;
  category?: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  interestedParticipantIds?: string[];
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateTripIdeaSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const idea = await findAccessibleIdea(parsed.data.id, user.id);
  if (!idea || idea.tripId !== parsed.data.tripId) {
    return { success: false, error: "Ötlet nem található" };
  }

  const eventDate = parseOptionalIdeaDate(parsed.data.date);
  if (eventDate) {
    const fullTrip = await prisma.trip.findFirst({
      where: { id: parsed.data.tripId },
      select: { startDate: true, endDate: true },
    });
    if (fullTrip && !isDateInRange(eventDate, fullTrip.startDate, fullTrip.endDate)) {
      return { success: false, error: "A dátum az utazás időtartamán belül kell legyen" };
    }
  }

  const checkInDate = parseOptionalIdeaDate(parsed.data.checkInDate);
  const checkOutDate = parseOptionalIdeaDate(parsed.data.checkOutDate);
  const dateError = await validateIdeaStayDates(parsed.data.tripId, checkInDate, checkOutDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  await prisma.tripIdea.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      url: parsed.data.url ?? null,
      amount: parsed.data.amount ?? null,
      currency: parsed.data.currency ?? "HUF",
      amountScope: parsed.data.amountScope ?? "TOTAL",
      category: parsed.data.category ?? "OTHER",
      date: eventDate,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      checkInDate,
      checkOutDate,
    },
  });

  try {
    await syncIdeaInterests(
      parsed.data.id,
      parsed.data.tripId,
      parsed.data.interestedParticipantIds ?? []
    );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Érvénytelen résztvevők",
    };
  }

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteTripIdea(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const idea = await findAccessibleIdea(id, user.id);
  if (!idea) {
    return { success: false, error: "Ötlet nem található" };
  }

  await prisma.tripIdea.delete({ where: { id } });

  invalidateTripsAndReports(user.id, idea.tripId);
  return { success: true, data: undefined };
}

export async function toggleIdeaInterest(data: {
  ideaId: string;
  familyMemberId: string;
  interested: boolean;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = toggleIdeaInterestSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const idea = await findAccessibleIdea(parsed.data.ideaId, user.id);
  if (!idea) {
    return { success: false, error: "Ötlet nem található" };
  }

  const isParticipant = await assertTripParticipant(idea.tripId, parsed.data.familyMemberId);
  if (!isParticipant) {
    return { success: false, error: "A családtag nem résztvevő az utazáson" };
  }

  if (parsed.data.interested) {
    await prisma.tripIdeaInterest.upsert({
      where: {
        ideaId_familyMemberId: {
          ideaId: parsed.data.ideaId,
          familyMemberId: parsed.data.familyMemberId,
        },
      },
      create: {
        ideaId: parsed.data.ideaId,
        familyMemberId: parsed.data.familyMemberId,
      },
      update: {},
    });
  } else {
    await prisma.tripIdeaInterest.deleteMany({
      where: {
        ideaId: parsed.data.ideaId,
        familyMemberId: parsed.data.familyMemberId,
      },
    });
  }

  return { success: true, data: undefined };
}

export async function createIdeaMessage(data: {
  ideaId: string;
  body: string;
}): Promise<ActionResult<{ id: string; createdAt: string }>> {
  const user = await requireUser();
  const parsed = ideaMessageSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const idea = await findAccessibleIdea(parsed.data.ideaId, user.id);
  if (!idea) {
    return { success: false, error: "Ötlet nem található" };
  }

  const message = await prisma.tripIdeaMessage.create({
    data: {
      ideaId: parsed.data.ideaId,
      userId: user.id,
      body: parsed.data.body,
    },
  });

  return {
    success: true,
    data: { id: message.id, createdAt: message.createdAt.toISOString() },
  };
}

export async function updateIdeaNote(data: {
  ideaId: string;
  note?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateIdeaNoteSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const idea = await findAccessibleIdea(parsed.data.ideaId, user.id);
  if (!idea) {
    return { success: false, error: "Ötlet nem található" };
  }

  await prisma.tripIdea.update({
    where: { id: parsed.data.ideaId },
    data: { note: parsed.data.note ?? null },
  });

  return { success: true, data: undefined };
}

export async function updateIdeaMessage(data: {
  id: string;
  body: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateIdeaMessageSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const message = await prisma.tripIdeaMessage.findFirst({
    where: { id: parsed.data.id },
    include: { idea: true },
  });

  if (!message || message.userId !== user.id) {
    return { success: false, error: "Üzenet nem található vagy nincs jogosultság" };
  }

  const accessible = await findAccessibleIdea(message.ideaId, user.id);
  if (!accessible) {
    return { success: false, error: "Ötlet nem található" };
  }

  await prisma.tripIdeaMessage.update({
    where: { id: parsed.data.id },
    data: { body: parsed.data.body },
  });

  return { success: true, data: undefined };
}

export async function deleteIdeaMessage(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deleteIdeaMessageSchema.safeParse({ id });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const message = await prisma.tripIdeaMessage.findFirst({
    where: { id: parsed.data.id },
  });

  if (!message || message.userId !== user.id) {
    return { success: false, error: "Üzenet nem található vagy nincs jogosultság" };
  }

  await prisma.tripIdeaMessage.delete({ where: { id: parsed.data.id } });

  return { success: true, data: undefined };
}
