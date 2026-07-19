"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate, accommodationSchema, updateAccommodationSchema } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports, invalidateTripMutation } from "@/lib/revalidate-app-data";
import type { ActionResult } from "./auth";
import { findAccessibleTrip } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";

function validateStayDates(
  checkIn: Date,
  checkOut: Date,
  tripStart: Date,
  tripEnd: Date
): string | null {
  if (checkOut <= checkIn) {
    return "A kijelentkezés dátuma későbbi kell legyen a bejelentkezésnél";
  }
  if (!isDateInRange(checkIn, tripStart, tripEnd)) {
    return "A bejelentkezés dátuma az utazás időtartamán belül kell legyen";
  }
  if (!isDateInRange(checkOut, tripStart, tripEnd)) {
    return "A kijelentkezés dátuma az utazás időtartamán belül kell legyen";
  }
  return null;
}

export async function createAccommodation(data: {
  tripId: string;
  title: string;
  checkIn: string;
  checkOut: string;
  url?: string | null;
  location?: string | null;
  note?: string | null;
  participantIds: string[];
  ideaId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = accommodationSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const checkIn = parseDate(parsed.data.checkIn);
  const checkOut = parseDate(parsed.data.checkOut);
  const dateError = validateStayDates(checkIn, checkOut, trip.startDate, trip.endDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const accommodation = await prisma.accommodation.create({
    data: {
      tripId: parsed.data.tripId,
      ideaId: parsed.data.ideaId ?? null,
      title: parsed.data.title,
      checkIn,
      checkOut,
      url: parsed.data.url ?? null,
      location: parsed.data.location ?? null,
      note: parsed.data.note ?? null,
      participants: {
        create: parsed.data.participantIds.map((familyMemberId: string) => ({ familyMemberId })),
      },
    },
  });

  await recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_CREATED",
    summary: `Új szállás: ${parsed.data.title}`,
    meta: { accommodationId: accommodation.id },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { id: accommodation.id } };
}

export async function updateAccommodation(data: {
  id: string;
  tripId: string;
  title: string;
  checkIn: string;
  checkOut: string;
  url?: string | null;
  location?: string | null;
  note?: string | null;
  participantIds: string[];
  ideaId?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateAccommodationSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const checkIn = parseDate(parsed.data.checkIn);
  const checkOut = parseDate(parsed.data.checkOut);
  const dateError = validateStayDates(checkIn, checkOut, trip.startDate, trip.endDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  await prisma.$transaction([
    prisma.accommodationParticipant.deleteMany({ where: { accommodationId: parsed.data.id } }),
    prisma.accommodation.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        checkIn,
        checkOut,
        url: parsed.data.url ?? null,
        location: parsed.data.location ?? null,
        note: parsed.data.note ?? null,
        participants: {
          create: parsed.data.participantIds.map((familyMemberId: string) => ({ familyMemberId })),
        },
      },
    }),
  ]);

  await recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_UPDATED",
    summary: `Szállás frissítve: ${parsed.data.title}`,
    meta: { accommodationId: parsed.data.id },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteAccommodation(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const accommodation = await prisma.accommodation.findFirst({
    where: { id },
    include: { trip: true },
  });

  if (!accommodation) {
    return { success: false, error: "Szállás nem található" };
  }

  const accessible = await findAccessibleTrip(accommodation.tripId, user.id);
  if (!accessible) {
    return { success: false, error: "Szállás nem található" };
  }

  await prisma.$transaction([
    prisma.cost.deleteMany({ where: { accommodationId: id } }),
    prisma.accommodation.delete({ where: { id } }),
  ]);

  await recordTripActivity({
    tripId: accommodation.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_DELETED",
    summary: `Szállás törölve: ${accommodation.title}`,
    meta: { accommodationId: id },
  });

  invalidateTripMutation(user.id, accommodation.tripId);
  return { success: true, data: undefined };
}
