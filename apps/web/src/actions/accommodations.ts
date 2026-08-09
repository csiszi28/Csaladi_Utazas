"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate, formatDate, accommodationSchema, updateAccommodationSchema } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripAudience } from "@/lib/revalidate-app-data";
import type { ActionResult } from "./auth";
import { requireEditableTrip, requireTripEditor } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";
import { notifyTripAudience } from "@/lib/trip-notifications";

type OptionalLinkedCost = {
  amount: number;
  currency?: string;
  amountScope?: string;
  category: string;
  paidByFamilyMemberId?: string | null;
};

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function validateStayDates(
  checkIn: Date,
  checkOut: Date,
  tripStart: Date,
  tripEnd: Date
): string | null {
  if (formatDate(checkOut) <= formatDate(checkIn)) {
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
  cost?: OptionalLinkedCost | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = accommodationSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireEditableTrip(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const checkIn = parseDate(parsed.data.checkIn);
  const checkOut = parseDate(parsed.data.checkOut);
  const dateError = validateStayDates(checkIn, checkOut, access.trip.startDate, access.trip.endDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const linkedCost =
    data.cost && data.cost.amount > 0
      ? {
          amount: data.cost.amount,
          currency: data.cost.currency ?? "HUF",
          amountScope: data.cost.amountScope ?? "TOTAL",
          category: data.cost.category,
          paidByFamilyMemberId: data.cost.paidByFamilyMemberId ?? null,
        }
      : null;

  const accommodation = await prisma.$transaction(async (tx) => {
    const created = await tx.accommodation.create({
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

    if (linkedCost) {
      await tx.cost.create({
        data: {
          tripId: parsed.data.tripId,
          accommodationId: created.id,
          title: parsed.data.title,
          amount: linkedCost.amount,
          currency: linkedCost.currency,
          amountScope: linkedCost.amountScope,
          category: linkedCost.category,
          paidByFamilyMemberId: linkedCost.paidByFamilyMemberId,
        },
      });
    }

    return created;
  });

  void recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_CREATED",
    summary: `Új szállás: ${parsed.data.title}`,
    meta: { accommodationId: accommodation.id },
  });

  void notifyTripAudience({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    kind: "accommodation_created",
    title: "Új szállás",
    body: `${user.name}: ${parsed.data.title}`,
    href: `/trips/${parsed.data.tripId}?tab=accommodations`,
  });
  await invalidateTripAudience(parsed.data.tripId);
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

  const access = await requireEditableTrip(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const checkIn = parseDate(parsed.data.checkIn);
  const checkOut = parseDate(parsed.data.checkOut);
  const dateError = validateStayDates(checkIn, checkOut, access.trip.startDate, access.trip.endDate);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const existing = await prisma.accommodation.findFirst({
    where: { id: parsed.data.id, tripId: parsed.data.tripId },
    select: {
      location: true,
      title: true,
      participants: { select: { familyMemberId: true } },
    },
  });
  if (!existing) {
    return { success: false, error: "Szállás nem található" };
  }

  const nextLocation = parsed.data.location ?? null;
  const nextTitle = parsed.data.title;
  const geoQueryChanged =
    (existing.location?.trim() || existing.title) !==
    (nextLocation?.trim() || nextTitle);

  const existingParticipantIds = existing.participants.map((p) => p.familyMemberId);
  const participantsChanged = !sameIdSet(existingParticipantIds, parsed.data.participantIds);

  if (participantsChanged) {
    await prisma.$transaction([
      prisma.accommodationParticipant.deleteMany({ where: { accommodationId: parsed.data.id } }),
      prisma.accommodation.update({
        where: { id: parsed.data.id },
        data: {
          title: nextTitle,
          checkIn,
          checkOut,
          url: parsed.data.url ?? null,
          location: nextLocation,
          note: parsed.data.note ?? null,
          ...(geoQueryChanged ? { lat: null, lng: null } : {}),
          participants: {
            create: parsed.data.participantIds.map((familyMemberId: string) => ({ familyMemberId })),
          },
        },
      }),
    ]);
  } else {
    await prisma.accommodation.update({
      where: { id: parsed.data.id },
      data: {
        title: nextTitle,
        checkIn,
        checkOut,
        url: parsed.data.url ?? null,
        location: nextLocation,
        note: parsed.data.note ?? null,
        ...(geoQueryChanged ? { lat: null, lng: null } : {}),
      },
    });
  }

  void recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_UPDATED",
    summary: `Szállás frissítve: ${parsed.data.title}`,
    meta: { accommodationId: parsed.data.id },
  });

  await invalidateTripAudience(parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteAccommodation(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const accommodation = await prisma.accommodation.findFirst({
    where: { id },
    select: { id: true, title: true, tripId: true },
  });

  if (!accommodation) {
    return { success: false, error: "Szállás nem található" };
  }

  const access = await requireTripEditor(accommodation.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  await prisma.$transaction([
    prisma.cost.deleteMany({ where: { accommodationId: id } }),
    prisma.accommodation.delete({ where: { id } }),
  ]);

  void recordTripActivity({
    tripId: accommodation.tripId,
    actorUserId: user.id,
    type: "ACCOMMODATION_DELETED",
    summary: `Szállás törölve: ${accommodation.title}`,
    meta: { accommodationId: id },
  });

  await invalidateTripAudience(accommodation.tripId);
  return { success: true, data: undefined };
}
