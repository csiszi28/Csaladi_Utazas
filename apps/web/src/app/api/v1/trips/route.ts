import { NextResponse } from "next/server";
import { prisma } from "@csaladi-utazas/database";
import { tripSchema, parseDate } from "@csaladi-utazas/shared";
import { jsonFail, jsonOk, withApiAuth } from "@/lib/api/handler";
import { fetchTripsList } from "@/lib/queries/trips";
import { getOrCreateSelfFamilyMemberId } from "@/actions/family";
import { generateInviteCode } from "@/lib/trip-access";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";

export const GET = withApiAuth(async () => {
  const trips = await fetchTripsList();
  return jsonOk({ trips });
});

export const POST = withApiAuth(async ({ userId, request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail("Érvénytelen JSON", 400, "INVALID_JSON");
  }

  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(parsed.error.errors[0]?.message ?? "Érvénytelen adatok", 400, "VALIDATION");
  }

  let participantIds = parsed.data.participantIds;
  if (participantIds.length === 0) {
    participantIds = [await getOrCreateSelfFamilyMemberId()];
  }

  const members = await prisma.familyMember.findMany({
    where: { id: { in: participantIds }, userId },
  });

  if (members.length !== participantIds.length) {
    return jsonFail("Érvénytelen résztvevők", 400, "INVALID_PARTICIPANTS");
  }

  const trip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
      budgetAmount: parsed.data.budgetAmount ?? null,
      budgetCurrency: parsed.data.budgetCurrency ?? "HUF",
      userId,
      inviteCode: generateInviteCode(),
      participants: {
        create: participantIds.map((familyMemberId: string) => ({ familyMemberId })),
      },
    },
  });

  invalidateTripsAndReports(userId);
  return jsonOk({ trip: { id: trip.id } }, 201);
});
