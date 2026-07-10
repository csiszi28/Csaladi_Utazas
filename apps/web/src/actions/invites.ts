"use server";

import { prisma } from "@csaladi-utazas/database";
import {
  findAccessibleTrip,
  findOwnedTrip,
  generateInviteCode,
} from "@/lib/trip-access";
import { requireUser } from "@/lib/auth";
import { ensureUserFamilyMembersOnTrip } from "@/lib/trip-access";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import type { ActionResult } from "./auth";

export async function getTripInviteCode(tripId: string): Promise<ActionResult<{ code: string }>> {
  const user = await requireUser();
  const trip = await findOwnedTrip(tripId, user.id);

  if (!trip) {
    return { success: false, error: "Csak a tulajdonos kezelheti a meghívót" };
  }

  let code = trip.inviteCode;
  if (!code) {
    code = generateInviteCode();
    await prisma.trip.update({
      where: { id: tripId },
      data: { inviteCode: code },
    });
  }

  return { success: true, data: { code } };
}

export async function regenerateTripInviteCode(
  tripId: string
): Promise<ActionResult<{ code: string }>> {
  const user = await requireUser();
  const trip = await findOwnedTrip(tripId, user.id);

  if (!trip) {
    return { success: false, error: "Csak a tulajdonos kezelheti a meghívót" };
  }

  const code = generateInviteCode();
  await prisma.trip.update({
    where: { id: tripId },
    data: { inviteCode: code },
  });

  invalidateTripsAndReports(user.id, tripId);
  return { success: true, data: { code } };
}

export async function joinTripWithInviteCode(code: string): Promise<ActionResult<{ tripId: string }>> {
  const user = await requireUser();
  const normalized = code.trim().toUpperCase();

  if (normalized.length < 6) {
    return { success: false, error: "Érvénytelen meghívó kód" };
  }

  const trip = await prisma.trip.findFirst({
    where: { inviteCode: normalized },
  });

  if (!trip) {
    return { success: false, error: "Nem található utazás ezzel a kóddal" };
  }

  if (trip.userId === user.id) {
    return { success: false, error: "Ez a saját utazásod" };
  }

  const existing = await prisma.tripCollaborator.findUnique({
    where: { tripId_userId: { tripId: trip.id, userId: user.id } },
  });

  if (!existing) {
    await prisma.tripCollaborator.create({
      data: { tripId: trip.id, userId: user.id },
    });
  }

  await ensureUserFamilyMembersOnTrip(trip.id, user.id, user.name);
  const { autoClaimMatchingProfile } = await import("@/actions/family");
  await autoClaimMatchingProfile(trip.id, user.id, user.name, user.email);

  invalidateTripsAndReports(user.id, trip.id);
  invalidateTripsAndReports(trip.userId, trip.id);
  return { success: true, data: { tripId: trip.id } };
}
