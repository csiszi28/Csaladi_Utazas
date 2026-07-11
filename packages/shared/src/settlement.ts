import { costTotalHuf, type CostParticipant, type HufRateMap } from "./cost-allocation";

export interface SettlementCost {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountScope?: string;
  programId?: string | null;
  accommodationId?: string | null;
  paidByFamilyMemberId?: string | null;
}

export interface SettlementProgram {
  id: string;
  participantIds: string[];
}

export interface SettlementAccommodation {
  id: string;
  participantIds: string[];
}

export interface SettlementContext {
  participants: CostParticipant[];
  programs: SettlementProgram[];
  accommodations?: SettlementAccommodation[];
  costs: SettlementCost[];
}

export interface PersonBalance {
  id: string;
  name: string;
  /** Pozitív: mások tartoznak neki; negatív: neki tartoznak */
  balanceHuf: number;
}

export interface SettlementTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountHuf: number;
}

export interface UnsettledCost {
  id: string;
  title: string;
  totalHuf: number;
}

export interface TripSettlement {
  balances: PersonBalance[];
  transfers: SettlementTransfer[];
  unsettledCosts: UnsettledCost[];
  settledCostCount: number;
  totalCostCount: number;
}

function participantIdsForCost(
  cost: SettlementCost,
  programs: SettlementProgram[],
  accommodations: SettlementAccommodation[],
  allParticipantIds: string[]
): string[] {
  if (cost.accommodationId) {
    const accommodation = accommodations.find((a) => a.id === cost.accommodationId);
    if (!accommodation || accommodation.participantIds.length === 0) return allParticipantIds;
    return accommodation.participantIds;
  }
  if (!cost.programId) return allParticipantIds;
  const program = programs.find((p) => p.id === cost.programId);
  if (!program || program.participantIds.length === 0) return allParticipantIds;
  return program.participantIds;
}

function splitShare(totalHuf: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalHuf / count);
  const remainder = totalHuf - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildTripSettlement(
  ctx: SettlementContext,
  rates: HufRateMap
): TripSettlement {
  const allIds = ctx.participants.map((p) => p.id);
  const balanceMap = new Map<string, number>();
  for (const p of ctx.participants) balanceMap.set(p.id, 0);

  const unsettledCosts: UnsettledCost[] = [];
  let settledCostCount = 0;

  for (const cost of ctx.costs) {
    const ids = participantIdsForCost(
      cost,
      ctx.programs,
      ctx.accommodations ?? [],
      allIds
    );
    const totalHuf = costTotalHuf(cost, Math.max(ids.length, 1), rates);

    if (!cost.paidByFamilyMemberId) {
      unsettledCosts.push({ id: cost.id, title: cost.title, totalHuf });
      continue;
    }

    settledCostCount += 1;
    const shares = splitShare(totalHuf, Math.max(ids.length, 1));

    balanceMap.set(
      cost.paidByFamilyMemberId,
      (balanceMap.get(cost.paidByFamilyMemberId) ?? 0) + totalHuf
    );

    ids.forEach((id, index) => {
      balanceMap.set(id, (balanceMap.get(id) ?? 0) - (shares[index] ?? 0));
    });
  }

  const balances: PersonBalance[] = ctx.participants.map((p) => ({
    id: p.id,
    name: p.name,
    balanceHuf: Math.round(balanceMap.get(p.id) ?? 0),
  }));

  const transfers = simplifyTransfers(balances);

  return {
    balances,
    transfers,
    unsettledCosts,
    settledCostCount,
    totalCostCount: ctx.costs.length,
  };
}

function simplifyTransfers(balances: PersonBalance[]): SettlementTransfer[] {
  type Entry = { id: string; name: string; amount: number };
  const creditors: Entry[] = balances
    .filter((b) => b.balanceHuf > 0)
    .map((b) => ({ id: b.id, name: b.name, amount: b.balanceHuf }))
    .sort((a, b) => b.amount - a.amount);

  const debtors: Entry[] = balances
    .filter((b) => b.balanceHuf < 0)
    .map((b) => ({ id: b.id, name: b.name, amount: -b.balanceHuf }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountHuf: amount,
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount <= 0) ci += 1;
    if (debtor.amount <= 0) di += 1;
  }

  return transfers;
}
