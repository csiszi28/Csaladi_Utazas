"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate, transportSchema, updateTransportSchema } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports, invalidateTripMutation } from "@/lib/revalidate-app-data";
import { findAccessibleTrip } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";
import type { ActionResult } from "./auth";

export async function createTransport(data: {
  tripId: string;
  type: string;
  title: string;
  departureDate: string;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  bookingRef?: string | null;
  url?: string | null;
  note?: string | null;
  participantIds: string[];
  ideaId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = transportSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const departureDate = parseDate(parsed.data.departureDate);
  if (!isDateInRange(departureDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "Az indulás dátuma az utazás időtartamán belül kell legyen" };
  }

  const arrivalDate = parsed.data.arrivalDate ? parseDate(parsed.data.arrivalDate) : null;

  const transport = await prisma.transport.create({
    data: {
      tripId: parsed.data.tripId,
      ideaId: parsed.data.ideaId ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      departureDate,
      departureTime: parsed.data.departureTime ?? null,
      arrivalDate,
      arrivalTime: parsed.data.arrivalTime ?? null,
      fromLocation: parsed.data.fromLocation ?? null,
      toLocation: parsed.data.toLocation ?? null,
      bookingRef: parsed.data.bookingRef ?? null,
      url: parsed.data.url ?? null,
      note: parsed.data.note ?? null,
      participants: {
        create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
      },
    },
  });

  await recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "TRANSPORT_CREATED",
    summary: `Új közlekedés: ${parsed.data.title}`,
    meta: { transportId: transport.id },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { id: transport.id } };
}

export async function updateTransport(data: {
  id: string;
  tripId: string;
  type: string;
  title: string;
  departureDate: string;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  bookingRef?: string | null;
  url?: string | null;
  note?: string | null;
  participantIds: string[];
  ideaId?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateTransportSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const departureDate = parseDate(parsed.data.departureDate);
  if (!isDateInRange(departureDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "Az indulás dátuma az utazás időtartamán belül kell legyen" };
  }

  const arrivalDate = parsed.data.arrivalDate ? parseDate(parsed.data.arrivalDate) : null;

  await prisma.$transaction([
    prisma.transportParticipant.deleteMany({ where: { transportId: parsed.data.id } }),
    prisma.transport.update({
      where: { id: parsed.data.id },
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        departureDate,
        departureTime: parsed.data.departureTime ?? null,
        arrivalDate,
        arrivalTime: parsed.data.arrivalTime ?? null,
        fromLocation: parsed.data.fromLocation ?? null,
        toLocation: parsed.data.toLocation ?? null,
        bookingRef: parsed.data.bookingRef ?? null,
        url: parsed.data.url ?? null,
        note: parsed.data.note ?? null,
        participants: {
          create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
        },
      },
    }),
  ]);

  await recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "TRANSPORT_UPDATED",
    summary: `Közlekedés frissítve: ${parsed.data.title}`,
    meta: { transportId: parsed.data.id },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteTransport(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const transport = await prisma.transport.findFirst({
    where: { id },
    include: { trip: true },
  });

  if (!transport) {
    return { success: false, error: "Közlekedés nem található" };
  }

  const trip = await findAccessibleTrip(transport.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Nincs jogosultság" };
  }

  await prisma.$transaction([
    prisma.cost.deleteMany({ where: { transportId: id } }),
    prisma.transport.delete({ where: { id } }),
  ]);

  await recordTripActivity({
    tripId: transport.tripId,
    actorUserId: user.id,
    type: "TRANSPORT_DELETED",
    summary: `Közlekedés törölve: ${transport.title}`,
    meta: { transportId: id },
  });

  invalidateTripMutation(user.id, transport.tripId);
  return { success: true, data: undefined };
}
