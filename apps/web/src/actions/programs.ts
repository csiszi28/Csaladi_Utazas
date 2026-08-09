"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripAudience } from "@/lib/revalidate-app-data";
import { programSchema, updateProgramSchema } from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";

import { findAccessibleTrip, requireTripEditor } from "@/lib/trip-access";
import { recordTripActivity } from "@/lib/trip-activity";
import { notifyTripAudience } from "@/lib/trip-notifications";

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
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = programSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const access = await requireTripEditor(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "A program dátuma az utazás időtartamán belül kell legyen" };
  }

  const program = await prisma.program.create({
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

  await recordTripActivity({
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
  void invalidateTripAudience(parsed.data.tripId);
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

  const access = await requireTripEditor(parsed.data.tripId, user.id);
  if (!access.ok) return { success: false, error: access.error };

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "A program dátuma az utazás időtartamán belül kell legyen" };
  }

  const existing = await prisma.program.findFirst({
    where: { id: parsed.data.id },
    select: { location: true },
  });
  if (!existing) {
    return { success: false, error: "Program nem található" };
  }

  const nextLocation = parsed.data.location ?? null;
  const locationChanged =
    (existing.location ?? "").trim() !== (nextLocation ?? "").trim();

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

  await recordTripActivity({
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
  void invalidateTripAudience(parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteProgram(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const program = await prisma.program.findFirst({
    where: { id },
    include: { trip: true },
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

  await recordTripActivity({
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
  void invalidateTripAudience(program.tripId);
  return { success: true, data: undefined };
}
