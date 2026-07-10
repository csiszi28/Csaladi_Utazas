import { unstable_cache } from "next/cache";
import { prisma } from "@csaladi-utazas/database";
import { requireAuthUserId } from "@/lib/auth";
import { tripAccessFilter } from "@/lib/trip-access";
import { getHufExchangeRates } from "@/lib/exchange-rates";
import { USER_DATA_TAG } from "@/lib/revalidate-user-data";
import {
  COST_CATEGORY_LABELS,
  buildTripCostBreakdown,
  buildTripSettlement,
  costTotalHuf,
  type TripCostContext,
  type TripCostBreakdown,
  type TripSettlement,
} from "@csaladi-utazas/shared";

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

async function buildReportsForUser(userId: string) {
  const rates = await getHufExchangeRates();

  const trips = await prisma.trip.findMany({
    where: tripAccessFilter(userId),
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      participants: {
        select: { familyMember: { select: { id: true, name: true } } },
      },
      programs: {
        select: {
          id: true,
          title: true,
          date: true,
          participants: { select: { familyMemberId: true } },
          costs: {
            select: {
              id: true,
              title: true,
              amount: true,
              currency: true,
              amountScope: true,
              programId: true,
              category: true,
              paidByFamilyMemberId: true,
            },
          },
        },
        orderBy: { date: "asc" },
      },
      costs: {
        select: {
          id: true,
          title: true,
          amount: true,
          currency: true,
          amountScope: true,
          programId: true,
          category: true,
          paidByFamilyMemberId: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const tripBreakdowns: TripCostBreakdown[] = trips.map((trip) => {
    const ctx: TripCostContext = {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      participants: trip.participants.map((p) => ({
        id: p.familyMember.id,
        name: p.familyMember.name,
      })),
      programs: trip.programs.map((p) => ({
        id: p.id,
        title: p.title,
        date: p.date,
        participantIds: p.participants.map((x) => x.familyMemberId),
        costs: p.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
      })),
      tripLevelCosts: trip.costs
        .filter((c) => !c.programId)
        .map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
    };

    const breakdown = buildTripCostBreakdown(ctx, rates);
    const settlement: TripSettlement = buildTripSettlement(
      {
        participants: trip.participants.map((p) => ({
          id: p.familyMember.id,
          name: p.familyMember.name,
        })),
        programs: trip.programs.map((p) => ({
          id: p.id,
          participantIds: p.participants.map((x) => x.familyMemberId),
        })),
        costs: trip.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
      },
      rates
    );
    const participantCount = trip.participants.length;
    const categoryTotals: Record<string, number> = {};

    for (const cost of trip.costs) {
      const huf = costTotalHuf(
        { ...cost, amountScope: cost.amountScope ?? "TOTAL" },
        participantCount,
        rates
      );
      categoryTotals[cost.category] = (categoryTotals[cost.category] ?? 0) + huf;
    }

    const categoryData = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      label: COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS] ?? category,
      amount,
    }));

    return {
      ...breakdown,
      costCount: trip.costs.length,
      categoryData,
      settlement,
    };
  });

  return {
    tripBreakdowns,
    rates,
  };
}

const getCachedReportsData = (userId: string) =>
  unstable_cache(
    () => buildReportsForUser(userId),
    [`reports-${userId}`],
    { revalidate: 30, tags: [userDataTag(userId)] }
  )();

export async function fetchReportsData() {
  const userId = await requireAuthUserId();
  return getCachedReportsData(userId);
}

export type ReportsData = Awaited<ReturnType<typeof fetchReportsData>>;
