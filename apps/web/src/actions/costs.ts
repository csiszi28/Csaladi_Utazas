"use server";

import { prisma } from "@csaladi-utazas/database";
import { requireUser } from "@/lib/auth";
import { invalidateTripsAndReports } from "@/lib/revalidate-app-data";
import { costSchema, updateCostSchema, COST_CATEGORY_LABELS } from "@csaladi-utazas/shared";
import type { ActionResult } from "./auth";

import { findAccessibleTrip, tripAccessFilter } from "@/lib/trip-access";

export async function createCost(data: {
  tripId: string;
  programId?: string | null;
  accommodationId?: string | null;
  amount: number;
  currency?: string;
  amountScope?: string;
  category: string;
  title: string;
  paidByFamilyMemberId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = costSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  const cost = await prisma.cost.create({
    data: {
      tripId: parsed.data.tripId,
      programId: parsed.data.programId ?? null,
      accommodationId: parsed.data.accommodationId ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency ?? "HUF",
      amountScope: parsed.data.amountScope ?? "TOTAL",
      category: parsed.data.category,
      title: parsed.data.title,
      paidByFamilyMemberId: parsed.data.paidByFamilyMemberId ?? null,
    },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: { id: cost.id } };
}

export async function updateCost(data: {
  id: string;
  tripId: string;
  programId?: string | null;
  accommodationId?: string | null;
  amount: number;
  currency?: string;
  amountScope?: string;
  category: string;
  title: string;
  paidByFamilyMemberId?: string | null;
}): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateCostSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" };
  }

  const trip = await findAccessibleTrip(parsed.data.tripId, user.id);
  if (!trip) {
    return { success: false, error: "Utazás nem található" };
  }

  await prisma.cost.update({
    where: { id: parsed.data.id },
    data: {
      programId: parsed.data.programId ?? null,
      accommodationId: parsed.data.accommodationId ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency ?? "HUF",
      amountScope: parsed.data.amountScope ?? "TOTAL",
      category: parsed.data.category,
      title: parsed.data.title,
      paidByFamilyMemberId: parsed.data.paidByFamilyMemberId ?? null,
    },
  });

  invalidateTripsAndReports(user.id, parsed.data.tripId);
  return { success: true, data: undefined };
}

export async function deleteCost(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const cost = await prisma.cost.findFirst({
    where: { id },
    include: { trip: true },
  });

  if (!cost) {
    return { success: false, error: "Költség nem található" };
  }

  const accessible = await findAccessibleTrip(cost.tripId, user.id);
  if (!accessible) {
    return { success: false, error: "Költség nem található" };
  }

  await prisma.cost.delete({ where: { id } });

  invalidateTripsAndReports(user.id, cost.tripId);
  return { success: true, data: undefined };
}

export async function getReportsData(tripId?: string) {
  const user = await requireUser();

  const trips = await prisma.trip.findMany({
    where: {
      ...tripAccessFilter(user.id),
      ...(tripId ? { id: tripId } : {}),
    },
    include: {
      participants: { include: { familyMember: true } },
      costs: true,
    },
  });

  const categoryTotals: Record<string, number> = {};
  let totalAmount = 0;
  let totalParticipants = 0;

  for (const trip of trips) {
    totalParticipants += trip.participants.length;
    for (const cost of trip.costs) {
      totalAmount += cost.amount;
      categoryTotals[cost.category] = (categoryTotals[cost.category] ?? 0) + cost.amount;
    }
  }

  const categoryData = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    label: COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS] ?? category,
    amount,
  }));

  const perPersonCost =
    totalParticipants > 0 ? Math.round(totalAmount / totalParticipants) : 0;

  return {
    trips,
    categoryData,
    totalAmount,
    totalParticipants,
    perPersonCost,
  };
}
