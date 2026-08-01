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

const COST_SELECT = {
  id: true,
  title: true,
  amount: true,
  currency: true,
  amountScope: true,
  programId: true,
  accommodationId: true,
  category: true,
  paidByFamilyMemberId: true,
} as const;

function userDataTag(userId: string) {
  return `${USER_DATA_TAG}-${userId}`;
}

function withScope<T extends { amountScope: string | null }>(cost: T) {
  return { ...cost, amountScope: cost.amountScope ?? "TOTAL" };
}

/** Drop heavy line-item payloads the reports UI never renders. */
function slimBreakdown(
  breakdown: TripCostBreakdown,
  extras: {
    costCount: number;
    categoryData: { category: string; label: string; amount: number }[];
    settlement: TripSettlement;
  }
): TripCostBreakdown {
  return {
    tripId: breakdown.tripId,
    title: breakdown.title,
    startDate: breakdown.startDate,
    totalHuf: breakdown.totalHuf,
    perPerson: breakdown.perPerson,
    costCount: extras.costCount,
    categoryData: extras.categoryData,
    settlement: {
      balances: extras.settlement.balances,
      transfers: extras.settlement.transfers,
      settledCostCount: extras.settlement.settledCostCount,
      totalCostCount: extras.settlement.totalCostCount,
      unsettledCosts: [],
    },
    days: breakdown.days.map((day) => ({
      date: day.date,
      totalHuf: day.totalHuf,
      perPerson: day.perPerson,
      items: [],
    })),
    programs: breakdown.programs.map((program) => ({
      id: program.id,
      title: program.title,
      date: program.date,
      totalHuf: program.totalHuf,
      perPerson: program.perPerson,
      items: [],
    })),
    accommodations: breakdown.accommodations.map((accommodation) => ({
      id: accommodation.id,
      title: accommodation.title,
      checkIn: accommodation.checkIn,
      checkOut: accommodation.checkOut,
      totalHuf: accommodation.totalHuf,
      perPerson: accommodation.perPerson,
      items: [],
    })),
  };
}

async function buildReportsForUser(userId: string) {
  const [rates, trips] = await Promise.all([
    getHufExchangeRates(),
    prisma.trip.findMany({
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
          },
          orderBy: { date: "asc" },
        },
        accommodations: {
          select: {
            id: true,
            title: true,
            checkIn: true,
            checkOut: true,
            participants: { select: { familyMemberId: true } },
          },
          orderBy: { checkIn: "asc" },
        },
        costs: { select: COST_SELECT },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const tripBreakdowns: TripCostBreakdown[] = trips.map((trip) => {
    const costsByProgram = new Map<string, typeof trip.costs>();
    const costsByAccommodation = new Map<string, typeof trip.costs>();
    const tripLevelCosts: typeof trip.costs = [];

    for (const cost of trip.costs) {
      if (cost.programId) {
        const list = costsByProgram.get(cost.programId) ?? [];
        list.push(cost);
        costsByProgram.set(cost.programId, list);
      } else if (cost.accommodationId) {
        const list = costsByAccommodation.get(cost.accommodationId) ?? [];
        list.push(cost);
        costsByAccommodation.set(cost.accommodationId, list);
      } else {
        tripLevelCosts.push(cost);
      }
    }

    const participants = trip.participants.map((p) => ({
      id: p.familyMember.id,
      name: p.familyMember.name,
    }));

    const ctx: TripCostContext = {
      id: trip.id,
      title: trip.title,
      startDate: trip.startDate,
      endDate: trip.endDate,
      participants,
      programs: trip.programs.map((p) => ({
        id: p.id,
        title: p.title,
        date: p.date,
        participantIds: p.participants.map((x) => x.familyMemberId),
        costs: (costsByProgram.get(p.id) ?? []).map(withScope),
      })),
      accommodations: trip.accommodations.map((a) => ({
        id: a.id,
        title: a.title,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        participantIds: a.participants.map((x) => x.familyMemberId),
        costs: (costsByAccommodation.get(a.id) ?? []).map(withScope),
      })),
      tripLevelCosts: tripLevelCosts.map(withScope),
    };

    const breakdown = buildTripCostBreakdown(ctx, rates);
    const scopedCosts = trip.costs.map(withScope);
    const settlement: TripSettlement = buildTripSettlement(
      {
        participants,
        programs: trip.programs.map((p) => ({
          id: p.id,
          participantIds: p.participants.map((x) => x.familyMemberId),
        })),
        accommodations: trip.accommodations.map((a) => ({
          id: a.id,
          participantIds: a.participants.map((x) => x.familyMemberId),
        })),
        costs: scopedCosts,
      },
      rates
    );

    const participantCount = participants.length;
    const categoryTotals: Record<string, number> = {};
    for (const cost of scopedCosts) {
      const huf = costTotalHuf(cost, participantCount, rates);
      categoryTotals[cost.category] = (categoryTotals[cost.category] ?? 0) + huf;
    }

    const categoryData = Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      label: COST_CATEGORY_LABELS[category as keyof typeof COST_CATEGORY_LABELS] ?? category,
      amount,
    }));

    return slimBreakdown(breakdown, {
      costCount: trip.costs.length,
      categoryData,
      settlement,
    });
  });

  return { tripBreakdowns };
}

const getCachedReportsData = (userId: string) =>
  unstable_cache(
    () => buildReportsForUser(userId),
    [`reports-${userId}`],
    { revalidate: 60, tags: [userDataTag(userId)] }
  )();

export async function fetchReportsData() {
  const userId = await requireAuthUserId();
  return getCachedReportsData(userId);
}

export type ReportsData = Awaited<ReturnType<typeof fetchReportsData>>;
