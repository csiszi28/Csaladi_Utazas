"use server";

import { prisma } from "@csaladi-utazas/database";
import { isDateInRange, parseDate } from "@csaladi-utazas/shared";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { programSchema, updateProgramSchema } from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";

import { findAccessibleTrip } from "@/lib/trip-access";

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

  invalidateTripsAndReports(user.id, parsed.data.tripId);
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

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const programDate = parseDate(parsed.data.date);
  if (!isDateInRange(programDate, trip.startDate, trip.endDate)) {
    return { success: false, error: "A program dátuma az utazás időtartamán belül kell legyen" };
  }

  await prisma.$transaction([
    prisma.programParticipant.deleteMany({ where: { programId: parsed.data.id } }),
    prisma.program.update({
      where: { id: parsed.data.id },
      data: {
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
    }),
  ]);

  invalidateTripsAndReports(user.id, parsed.data.tripId);
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

  const accessible = await findAccessibleTrip(program.tripId, user.id);
  if (!accessible) {
    return { success: false, error: "Program nem található" };
  }

  await prisma.program.delete({ where: { id } });

  invalidateTripsAndReports(user.id, program.tripId);
  return { success: true, data: undefined };
}
