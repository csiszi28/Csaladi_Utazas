"use server";

import { prisma } from "@csaladi-utazas/database";
import {
  findOwnedTrip,
  generateInviteCode,
  ensureUserFamilyMembersOnTrip,
} from "@/lib/trip-access";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import {
  buildTripInviteEmail,
  isEmailConfigured,
  sendTransactionalEmail,
} from "@/lib/email";
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
      data: { tripId: trip.id, userId: user.id, role: "EDITOR" },
    });
  }

  // Először linked profil claim, utána résztvevő sync — így elkerüljük a duplikált „saját” sort
  const { autoClaimMatchingProfile } = await import("@/actions/family");
  await autoClaimMatchingProfile(trip.id, user.id, user.name, user.email);
  await ensureUserFamilyMembersOnTrip(trip.id, user.id, user.name);

  invalidateTripsAndReports(user.id, trip.id);
  invalidateTripsAndReports(trip.userId, trip.id);
  return { success: true, data: { tripId: trip.id } };
}

export async function sendTripInviteEmail(data: {
  tripId: string;
  email: string;
}): Promise<ActionResult<{ sent: boolean; fallbackMailto: boolean }>> {
  const user = await requireUser();
  const trip = await findOwnedTrip(data.tripId, user.id);

  if (!trip) {
    return { success: false, error: "Csak a tulajdonos küldhet meghívót" };
  }

  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Érvénytelen e-mail cím" };
  }

  let code = trip.inviteCode;
  if (!code) {
    code = generateInviteCode();
    await prisma.trip.update({
      where: { id: data.tripId },
      data: { inviteCode: code },
    });
  }

  const mail = buildTripInviteEmail({
    tripTitle: trip.title,
    inviteCode: code,
    inviterName: user.name,
  });

  if (!isEmailConfigured()) {
    return { success: true, data: { sent: false, fallbackMailto: true } };
  }

  const result = await sendTransactionalEmail({
    to: email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  if (!result.ok) {
    return {
      success: false,
      error:
        result.reason === "invalid_recipient"
          ? "Érvénytelen e-mail cím"
          : result.detail ??
            "Nem sikerült elküldeni az e-mailt. Próbáld a megosztást vagy a mailto linket.",
    };
  }

  return { success: true, data: { sent: true, fallbackMailto: false } };
}
