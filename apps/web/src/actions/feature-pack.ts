"use server";

import { prisma } from "@csaladi-utazas/database";
import {
  packingItemSchema,
  packingItemsBatchSchema,
  updatePackingItemSchema,
  settlementPaymentSchema,
  setTripParticipantsSchema,
  dismissReminderSchema,
} from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports, invalidateTripMutation } from "@/lib/revalidate-app-data";
import { findAccessibleTrip, tripAccessFilter } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";
import type { ActionResult } from "./auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function createPackingItem(data: {
  tripId: string;
  title: string;
  quantity?: number;
  assigneeFamilyMemberId?: string | null;
}): Promise<ActionResult<{ id: string; quantity: number }>> {
  const user = await requireUser();
  const parsed = packingItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) return { success: false, error: "Utazás nem található" };

  const item = await prisma.packingItem.create({
    data: {
      tripId: parsed.data.tripId,
      title: parsed.data.title,
      quantity: parsed.data.quantity,
      assigneeFamilyMemberId: parsed.data.assigneeFamilyMemberId ?? null,
      sortOrder: Date.now() % 2_000_000_000,
    },
    select: { id: true, quantity: true },
  });

  invalidateTripMutation(user.id, parsed.data.tripId);
  return { success: true, data: item };
}

export async function createPackingItemsBatch(data: {
  tripId: string;
  assigneeFamilyMemberId?: string | null;
  items: { title: string; quantity?: number }[];
}): Promise<ActionResult<{ ids: string[] }>> {
  const user = await requireUser();
  const parsed = packingItemsBatchSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) return { success: false, error: "Utazás nem található" };

  const baseOrder = Date.now() % 2_000_000_000;
  const created = await prisma.$transaction(
    parsed.data.items.map((item, index) =>
      prisma.packingItem.create({
        data: {
          tripId: parsed.data.tripId,
          title: item.title,
          quantity: item.quantity,
          assigneeFamilyMemberId: parsed.data.assigneeFamilyMemberId ?? null,
          sortOrder: baseOrder + index,
        },
        select: { id: true },
      })
    )
  );

  invalidateTripMutation(user.id, parsed.data.tripId);
  return { success: true, data: { ids: created.map((row) => row.id) } };
}

export async function updatePackingItem(data: {
  id: string;
  title?: string;
  quantity?: number;
  assigneeFamilyMemberId?: string | null;
  isPacked?: boolean;
  sortOrder?: number;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updatePackingItemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const existing = await prisma.packingItem.findFirst({
    where: { id: parsed.data.id, trip: tripAccessFilter(user.id) },
    select: { id: true, tripId: true },
  });
  if (!existing) return { success: false, error: "Tétel nem található" };

  await prisma.packingItem.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
      ...(parsed.data.assigneeFamilyMemberId !== undefined
        ? { assigneeFamilyMemberId: parsed.data.assigneeFamilyMemberId }
        : {}),
      ...(parsed.data.isPacked !== undefined ? { isPacked: parsed.data.isPacked } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
  });

  invalidateTripMutation(user.id, existing.tripId);
  return { success: true, data: undefined };
}

export async function deletePackingItem(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.packingItem.findFirst({
    where: { id, trip: tripAccessFilter(user.id) },
    select: { id: true, tripId: true },
  });
  if (!existing) return { success: false, error: "Tétel nem található" };

  await prisma.packingItem.delete({ where: { id } });
  invalidateTripMutation(user.id, existing.tripId);
  return { success: true, data: undefined };
}

export async function createSettlementPayment(data: {
  tripId: string;
  fromFamilyMemberId: string;
  toFamilyMemberId: string;
  amountHuf: number;
  note?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = settlementPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  if (parsed.data.fromFamilyMemberId === parsed.data.toFamilyMemberId) {
    return { success: false, error: "A fizető és a kedvezményezett nem lehet ugyanaz" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) return { success: false, error: "Utazás nem található" };

  const payment = await prisma.settlementPayment.create({
    data: {
      tripId: parsed.data.tripId,
      fromFamilyMemberId: parsed.data.fromFamilyMemberId,
      toFamilyMemberId: parsed.data.toFamilyMemberId,
      amountHuf: parsed.data.amountHuf,
      note: parsed.data.note ?? null,
      createdByUserId: user.id,
    },
  });

  await recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "SETTLEMENT_PAYMENT",
    summary: `Elszámolás kifizetve: ${parsed.data.amountHuf.toLocaleString("hu-HU")} Ft`,
    meta: { paymentId: payment.id },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { id: payment.id } };
}

export async function deleteSettlementPayment(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const payment = await prisma.settlementPayment.findFirst({ where: { id } });
  if (!payment) return { success: false, error: "Fizetés nem található" };

  const trip = await findAccessibleTrip(payment.tripId, user.id);
  if (!trip) return { success: false, error: "Nincs jogosultság" };

  await prisma.settlementPayment.delete({ where: { id } });
  invalidateTripsAndReports(user.id, payment.tripId);
  return { success: true, data: undefined };
}

export async function setTripParticipants(data: {
  tripId: string;
  participantIds: string[];
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = setTripParticipantsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) return { success: false, error: "Utazás nem található" };

  const previous = await prisma.tripParticipant.findMany({
    where: { tripId: parsed.data.tripId },
    select: { familyMemberId: true, familyMember: { select: { id: true, name: true } } },
  });
  const previousIds = new Set(previous.map((p) => p.familyMemberId));
  const nextIds = new Set(parsed.data.participantIds);

  const addedIds = parsed.data.participantIds.filter((id) => !previousIds.has(id));
  const removedIds = [...previousIds].filter((id) => !nextIds.has(id));

  const nameById = new Map(previous.map((p) => [p.familyMember.id, p.familyMember.name]));
  if (addedIds.length > 0) {
    const addedMembers = await prisma.familyMember.findMany({
      where: { id: { in: addedIds } },
      select: { id: true, name: true },
    });
    for (const m of addedMembers) nameById.set(m.id, m.name);
  }

  const addedNames = addedIds.map((id) => nameById.get(id)).filter((n): n is string => Boolean(n));
  const removedNames = removedIds
    .map((id) => nameById.get(id))
    .filter((n): n is string => Boolean(n));

  await prisma.$transaction([
    prisma.tripParticipant.deleteMany({ where: { tripId: parsed.data.tripId } }),
    prisma.tripParticipant.createMany({
      data: parsed.data.participantIds.map((familyMemberId) => ({
        tripId: parsed.data.tripId,
        familyMemberId,
      })),
    }),
  ]);

  const parts: string[] = [];
  if (addedNames.length > 0) parts.push(`Hozzáadva: ${addedNames.join(", ")}`);
  if (removedNames.length > 0) parts.push(`Eltávolítva: ${removedNames.join(", ")}`);

  if (parts.length > 0) {
    await recordTripActivity({
      tripId: parsed.data.tripId,
      actorUserId: user.id,
      type: "PARTICIPANTS_UPDATED",
      summary: `Résztvevők frissítve — ${parts.join("; ")}`,
      meta: {
        addedIds,
        removedIds,
        addedNames,
        removedNames,
        participantCount: parsed.data.participantIds.length,
      },
    });
  }

  invalidateTripMutation(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function dismissReminder(reminderKey: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = dismissReminderSchema.safeParse({ reminderKey });
  if (!parsed.success) {
    return { success: false, error: "Érvénytelen értesítés" };
  }

  await prisma.userNotificationDismissal.upsert({
    where: {
      userId_reminderKey: {
        userId: user.id,
        reminderKey: parsed.data.reminderKey,
      },
    },
    create: {
      userId: user.id,
      reminderKey: parsed.data.reminderKey,
    },
    update: { dismissedAt: new Date() },
  });

  return { success: true, data: undefined };
}

export async function uploadTripCover(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") ?? "");
  const file = formData.get("file");

  if (!tripId || !(file instanceof File)) {
    return { success: false, error: "Hiányzó fájl vagy utazás" };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Csak képfájl tölthető fel borítónak" };
  }

  const trip = await findAccessibleTrip(tripId, user.id);
  if (!trip) return { success: false, error: "Utazás nem található" };

  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${user.id}/${tripId}/cover-${Date.now()}.${ext}`;
  const supabase = await createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("trip-documents").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      coverStoragePath: storagePath,
      coverMimeType: file.type,
    },
  });

  await recordTripActivity({
    tripId,
    actorUserId: user.id,
    type: "COVER_UPDATED",
    summary: "Borítókép frissítve",
  });

  invalidateTripsAndReports(user.id, tripId);
  return { success: true, data: undefined };
}

export async function getUserReminders() {
  const user = await requireUser();
  const { buildReminders, buildTripSettlement, applySettlementPayments, DEFAULT_HUF_RATES } =
    await import("@csaladi-utazas/shared");

  const [trips, dismissals] = await Promise.all([
    prisma.trip.findMany({
      where: tripAccessFilter(user.id),
      include: {
        participants: { include: { familyMember: true } },
        programs: {
          select: { id: true, title: true, date: true, participants: { select: { familyMemberId: true } } },
        },
        transports: {
          select: {
            id: true,
            title: true,
            departureDate: true,
            participants: { select: { familyMemberId: true } },
          },
        },
        accommodations: {
          select: { id: true, participants: { select: { familyMemberId: true } } },
        },
        costs: true,
        documents: { select: { category: true, familyMemberId: true, programId: true } },
        settlementPayments: true,
      },
    }),
    prisma.userNotificationDismissal.findMany({
      where: { userId: user.id },
      select: { reminderKey: true },
    }),
  ]);

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);

  const rates = DEFAULT_HUF_RATES;

  const inputs = trips.map((trip) => {
    const missingChecklist = ["PASSPORT", "INSURANCE", "VOUCHER"].filter((cat) => {
      return !trip.documents.some(
        (d) => d.category === cat && !d.programId
      );
    }).length;

    const tomorrowPrograms = trip.programs
      .filter((p) => new Date(p.date).toISOString().slice(0, 10) === tomorrowKey)
      .map((p) => p.title);

    const tomorrowTransports = trip.transports
      .filter((t) => new Date(t.departureDate).toISOString().slice(0, 10) === tomorrowKey)
      .map((t) => t.title);

    const settlement = buildTripSettlement(
      {
        participants: trip.participants.map((p) => ({
          id: p.familyMember.id,
          name: p.familyMember.name,
        })),
        programs: trip.programs.map((p) => ({
          id: p.id,
          participantIds: p.participants.map((x) => x.familyMemberId),
        })),
        accommodations: trip.accommodations.map((a) => ({
          id: a.id,
          participantIds: a.participants.map((x) => x.familyMemberId),
        })),
        transports: trip.transports.map((t) => ({
          id: t.id,
          participantIds: t.participants.map((x) => x.familyMemberId),
        })),
        costs: trip.costs,
      },
      rates
    );

    const remaining = applySettlementPayments(
      settlement.transfers,
      trip.settlementPayments.map((p) => ({
        fromFamilyMemberId: p.fromFamilyMemberId,
        toFamilyMemberId: p.toFamilyMemberId,
        amountHuf: p.amountHuf,
      }))
    );

    return {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      missingChecklistCount: missingChecklist,
      tomorrowProgramTitles: tomorrowPrograms,
      tomorrowTransportTitles: tomorrowTransports,
      openSettlementTransferCount: remaining.length,
    };
  });

  return buildReminders(
    inputs,
    dismissals.map((d) => d.reminderKey)
  );
}
