"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate, transportSchema, updateTransportSchema } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripAudience } from "@/lib/revalidate-app-data";
import { findAccessibleTrip, requireTripEditor } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";
import { notifyTripAudience } from "@/lib/trip-notifications";
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

  const access = await requireTripEditor(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

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

  void notifyTripAudience({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    kind: "transport_created",
    title: "Új közlekedés",
    body: `${user.name}: ${parsed.data.title}`,
    href: `/trips/${parsed.data.tripId}?tab=transport`,
  });
  void invalidateTripAudience(parsed.data.tripId);
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

  const access = await requireTripEditor(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const departureDate = parseDate(parsed.data.departureDate);
  if (!isDateInRange(departureDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "Az indulás dátuma az utazás időtartamán belül kell legyen" };
  }

  const arrivalDate = parsed.data.arrivalDate ? parseDate(parsed.data.arrivalDate) : null;

  const existing = await prisma.transport.findFirst({
    where: { id: parsed.data.id },
    select: { fromLocation: true, toLocation: true },
  });
  if (!existing) {
    return { success: false, error: "Közlekedés nem található" };
  }

  const nextFrom = parsed.data.fromLocation ?? null;
  const nextTo = parsed.data.toLocation ?? null;
  const fromChanged =
    (existing.fromLocation ?? "").trim() !== (nextFrom ?? "").trim();
  const toChanged = (existing.toLocation ?? "").trim() !== (nextTo ?? "").trim();

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
        fromLocation: nextFrom,
        toLocation: nextTo,
        ...(fromChanged ? { fromLat: null, fromLng: null } : {}),
        ...(toChanged ? { toLat: null, toLng: null } : {}),
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

  void invalidateTripAudience(parsed.data.tripId);
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

  const access = await requireTripEditor(transport.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

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

  void invalidateTripAudience(transport.tripId);
  return { success: true, data: undefined };
}
