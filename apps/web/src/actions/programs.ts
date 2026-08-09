"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripAudience } from "@/lib/revalidate-app-data";
import { programSchema, updateProgramSchema } from "@csaladi-utazas/shared";
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

export async function createProgram(data: {
  tripId: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  url?: string | null;
  participantIds: string[];
  ideaId?: string | null;
  /** Opcionális költség — egy tranzakcióban, külön createCost round-trip nélkül */
  cost?: OptionalLinkedCost | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = programSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireEditableTrip(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, access.trip.startDate, access.trip.endDate)) {
    return { success: false, error: "A program dátuma az utazás időtartamán belül kell legyen" };
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

  const program = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({
      data: {
        tripId: parsed.data.tripId,
        ideaId: parsed.data.ideaId ?? null,
        title: parsed.data.title,
        date: programDate,
        startTime: parsed.data.startTime ?? null,
        endTime: parsed.data.endTime ?? null,
        location: parsed.data.location ?? null,
        url: parsed.data.url ?? "",
        participants: {
          create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
        },
      },
    });

    if (linkedCost) {
      await tx.cost.create({
        data: {
          tripId: parsed.data.tripId,
          programId: created.id,
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
    type: "PROGRAM_CREATED",
    summary: `Új program: ${parsed.data.title}`,
    meta: { programId: program.id },
  });

  void notifyTripAudience({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    kind: "program_created",
    title: "Új program",
    body: `${user.name}: ${parsed.data.title}`,
    href: `/trips/${parsed.data.tripId}?tab=planning`,
  });
  await invalidateTripAudience(parsed.data.tripId);
  return { success: true, data: { id: program.id } };
}

export async function updateProgram(data: {
  id: string;
  tripId: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  url?: string | null;
  participantIds: string[];
  ideaId?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateProgramSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireEditableTrip(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, access.trip.startDate, access.trip.endDate)) {
    return { success: false, error: "A program dátuma az utazás időtartamán belül kell legyen" };
  }

  const existing = await prisma.program.findFirst({
    where: { id: parsed.data.id, tripId: parsed.data.tripId },
    select: {
      location: true,
      participants: { select: { familyMemberId: true } },
    },
  });
  if (!existing) {
    return { success: false, error: "Program nem található" };
  }

  const nextLocation = parsed.data.location ?? null;
  const locationChanged =
    (existing.location ?? "").trim() !== (nextLocation ?? "").trim();

  const existingParticipantIds = existing.participants.map((p) => p.familyMemberId);
  const participantsChanged = !sameIdSet(existingParticipantIds, parsed.data.participantIds);

  if (participantsChanged) {
    await prisma.$transaction([
      prisma.programParticipant.deleteMany({ where: { programId: parsed.data.id } }),
      prisma.program.update({
        where: { id: parsed.data.id },
        data: {
          title: parsed.data.title,
          date: programDate,
          startTime: parsed.data.startTime ?? null,
          endTime: parsed.data.endTime ?? null,
          location: nextLocation,
          url: parsed.data.url ?? "",
          ...(locationChanged ? { lat: null, lng: null } : {}),
          participants: {
            create: parsed.data.participantIds.map((familyMemberId) => ({ familyMemberId })),
          },
        },
      }),
    ]);
  } else {
    await prisma.program.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        date: programDate,
        startTime: parsed.data.startTime ?? null,
        endTime: parsed.data.endTime ?? null,
        location: nextLocation,
        url: parsed.data.url ?? "",
        ...(locationChanged ? { lat: null, lng: null } : {}),
      },
    });
  }

  void recordTripActivity({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    type: "PROGRAM_UPDATED",
    summary: `Program frissítve: ${parsed.data.title}`,
    meta: { programId: parsed.data.id },
  });

  void notifyTripAudience({
    tripId: parsed.data.tripId,
    actorUserId: user.id,
    kind: "program_updated",
    title: "Program módosítva",
    body: `${user.name}: ${parsed.data.title}`,
    href: `/trips/${parsed.data.tripId}?tab=planning`,
  });
  await invalidateTripAudience(parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteProgram(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const program = await prisma.program.findFirst({
    where: { id },
    select: { id: true, title: true, tripId: true },
  });

  if (!program) {
    return { success: false, error: "Program nem található" };
  }

  const access = await requireTripEditor(program.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  await prisma.$transaction([
    prisma.cost.deleteMany({ where: { programId: id } }),
    prisma.program.delete({ where: { id } }),
  ]);

  void recordTripActivity({
    tripId: program.tripId,
    actorUserId: user.id,
    type: "PROGRAM_DELETED",
    summary: `Program törölve: ${program.title}`,
    meta: { programId: id },
  });

  void notifyTripAudience({
    tripId: program.tripId,
    actorUserId: user.id,
    kind: "program_deleted",
    title: "Program törölve",
    body: `${user.name}: ${program.title}`,
    href: `/trips/${program.tripId}?tab=planning`,
  });
  await invalidateTripAudience(program.tripId);
  return { success: true, data: undefined };
}
