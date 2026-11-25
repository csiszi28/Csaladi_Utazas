import { costTotalHuf, type CostParticipant, type HufRateMap } from "./cost-allocation";

export interface SettlementCost {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountScope?: string;
  programId?: string | null;
  accommodationId?: string | null;
  transportId?: string | null;
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

export interface SettlementTransport {
  id: string;
  participantIds: string[];
}

export interface SettlementContext {
  participants: CostParticipant[];
  programs: SettlementProgram[];
  accommodations?: SettlementAccommodation[];
  transports?: SettlementTransport[];
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

/**
 * Azonos fiókhoz kötött profilok (több háztartás) → egy kanonikus azonosító.
 * A névsorral egyezően az átvett (más háztartásbeli) profil az elsődleges.
 * Csak a nem azonos azonosítók szerepelnek a térképben.
 */
export function buildSettlementAliasMap(
  participants: CostParticipant[]
): Map<string, string> {
  const groups = new Map<string, CostParticipant[]>();
  for (const p of participants) {
    if (!p.linkedUserId) continue;
    const list = groups.get(p.linkedUserId) ?? [];
    list.push(p);
    groups.set(p.linkedUserId, list);
  }
  const aliases = new Map<string, string>();
  for (const [userId, list] of groups) {
    if (list.length < 2) continue;
    const canonical =
      list.find((p) => p.ownerUserId && p.ownerUserId !== userId) ?? list[0]!;
    for (const p of list) {
      if (p.id !== canonical.id) aliases.set(p.id, canonical.id);
    }
  }
  return aliases;
}

function uniq(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function participantIdsForCost(
  cost: SettlementCost,
  programs: SettlementProgram[],
  accommodations: SettlementAccommodation[],
  transports: SettlementTransport[],
  allParticipantIds: string[]
): string[] {
  if (cost.transportId) {
    const transport = transports.find((t) => t.id === cost.transportId);
    if (!transport || transport.participantIds.length === 0) return allParticipantIds;
    return transport.participantIds;
  }
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

interface CostAllocation {
  costId: string;
  title: string;
  totalHuf: number;
  payerId: string;
  /** Ki mennyit visel a költségből (a fizetőt is beleértve). */
  debits: Map<string, number>;
}

interface PreparedSettlement {
  adults: CostParticipant[];
  allocations: CostAllocation[];
  unsettledCosts: UnsettledCost[];
  totalCostCount: number;
  aliases: Map<string, string>;
}

function prepareSettlement(rawCtx: SettlementContext, rates: HufRateMap): PreparedSettlement {
  const aliases = buildSettlementAliasMap(rawCtx.participants);
  const canon = (id: string) => aliases.get(id) ?? id;
  const canonIds = (ids: string[]) => uniq(ids.map(canon));
  const ctx: SettlementContext = {
    participants: rawCtx.participants.filter((p) => !aliases.has(p.id)),
    programs: rawCtx.programs.map((x) => ({ ...x, participantIds: canonIds(x.participantIds) })),
    accommodations: rawCtx.accommodations?.map((x) => ({
      ...x,
      participantIds: canonIds(x.participantIds),
    })),
    transports: rawCtx.transports?.map((x) => ({
      ...x,
      participantIds: canonIds(x.participantIds),
    })),
    costs: rawCtx.costs.map((c) => ({
      ...c,
      paidByFamilyMemberId: c.paidByFamilyMemberId ? canon(c.paidByFamilyMemberId) : c.paidByFamilyMemberId,
    })),
  };
  const adults = ctx.participants.filter((p) => !p.isChild);
  const adultIdSet = new Set(adults.map((p) => p.id));
  const allIds = ctx.participants.map((p) => p.id);
  const adultIds = adults.map((p) => p.id);

  // Gyerek → szülő: az a felnőtt résztvevő, akinek a fiókja a gyerek háztartásának tulajdonosa
  const guardianOf = new Map<string, string>();
  for (const child of ctx.participants.filter((p) => p.isChild)) {
    const guardian = adults.find(
      (a) => a.linkedUserId && a.linkedUserId === child.ownerUserId
    );
    if (guardian) guardianOf.set(child.id, guardian.id);
  }

  const unsettledCosts: UnsettledCost[] = [];
  const allocations: CostAllocation[] = [];

  for (const cost of ctx.costs) {
    const rawIds = participantIdsForCost(
      cost,
      ctx.programs,
      ctx.accommodations ?? [],
      ctx.transports ?? [],
      allIds
    );
    // Gyerekek nem kerülnek az elszámolásba — részesedésüket a felnőttek viszik
    let ids = rawIds.filter((id) => adultIdSet.has(id));
    if (ids.length === 0) ids = adultIds;
    if (ids.length === 0) continue;

    // A teljes összeg a VALÓDI résztvevőszám alapján számolódik (gyerekekkel együtt) —
    // egy "1 főre" költség a gyerekre is kerül; a részesedésüket a felnőttek viszik.
    const headcount = Math.max(rawIds.length, ids.length, 1);
    const totalHuf = costTotalHuf(cost, headcount, rates);

    if (!cost.paidByFamilyMemberId) {
      unsettledCosts.push({ id: cost.id, title: cost.title, totalHuf });
      continue;
    }

    // Ha gyerek „fizetett”, a tartozás nem náluk landol — első felnőtt kapja a creditet
    const payerId = adultIdSet.has(cost.paidByFamilyMemberId)
      ? cost.paidByFamilyMemberId
      : ids[0];

    const debits = new Map<string, number>();
    const debit = (id: string, amount: number) =>
      debits.set(id, (debits.get(id) ?? 0) + amount);

    const hasAdultOnCost = rawIds.some((id) => adultIdSet.has(id));
    if (!hasAdultOnCost) {
      // Csak gyerekek szerepelnek a költségen — egyenlően a felnőttek viszik
      const shares = splitShare(totalHuf, ids.length);
      ids.forEach((id, index) => debit(id, shares[index] ?? 0));
    } else {
      // Fejenkénti részesedés a valódi létszám szerint; a gyerek részét a szülő (a gyerek
      // háztartásának tulajdonosa) viszi, a többiek nem terhelődnek vele.
      const shares = splitShare(totalHuf, rawIds.length);
      const adultsOnCost = rawIds.filter((id) => adultIdSet.has(id));
      rawIds.forEach((id, index) => {
        const share = shares[index] ?? 0;
        if (adultIdSet.has(id)) return debit(id, share);
        const guardianId = guardianOf.get(id);
        if (guardianId) return debit(guardianId, share);
        // Nincs ismert szülő: a költségen szereplő felnőttek között egyenlően
        const split = splitShare(share, adultsOnCost.length);
        adultsOnCost.forEach((adultId, i) => debit(adultId, split[i] ?? 0));
      });
    }

    allocations.push({ costId: cost.id, title: cost.title, totalHuf, payerId, debits });
  }

  return { adults, allocations, unsettledCosts, totalCostCount: ctx.costs.length, aliases };
}

export function buildTripSettlement(
  rawCtx: SettlementContext,
  rates: HufRateMap
): TripSettlement {
  const { adults, allocations, unsettledCosts, totalCostCount } = prepareSettlement(rawCtx, rates);

  const balanceMap = new Map<string, number>();
  for (const p of adults) balanceMap.set(p.id, 0);
  for (const alloc of allocations) {
    balanceMap.set(alloc.payerId, (balanceMap.get(alloc.payerId) ?? 0) + alloc.totalHuf);
    for (const [id, amount] of alloc.debits) {
      balanceMap.set(id, (balanceMap.get(id) ?? 0) - amount);
    }
  }

  const balances: PersonBalance[] = adults.map((p) => ({
    id: p.id,
    name: p.name,
    balanceHuf: Math.round(balanceMap.get(p.id) ?? 0),
  }));

  return {
    balances,
    transfers: simplifyTransfers(balances),
    unsettledCosts,
    settledCostCount: allocations.length,
    totalCostCount,
  };
}

export type CostPaymentStatus = "settled" | "partial" | "open";

export interface CostSettlementDebtor {
  id: string;
  name: string;
  amountHuf: number;
  paidHuf: number;
}

export interface CostSettlementStatus {
  costId: string;
  title: string;
  totalHuf: number;
  payerId: string;
  payerName: string;
  status: CostPaymentStatus;
  /** Amit a többiek a fizetőnek tartoznak ezért a költségért. */
  owedHuf: number;
  /** Ebből már rendezve. */
  paidHuf: number;
  debtors: CostSettlementDebtor[];
}

/**
 * Költségenkénti állapot: ki fizette, ki mennyivel tartozik érte, és mennyi van már rendezve.
 * A rögzített kifizetések (fizető → kedvezményezett páronként) a költségeket sorrendben fedezik.
 * Ha az egész elszámolás már nulla (nincs fennmaradó átutalás), minden költség rendezett.
 */
export function buildCostSettlementStatuses(
  rawCtx: SettlementContext,
  rates: HufRateMap,
  payments: RecordedSettlementPaymentLike[] = []
): CostSettlementStatus[] {
  const { adults, allocations, aliases } = prepareSettlement(rawCtx, rates);
  const canon = (id: string) => aliases.get(id) ?? id;
  const nameOf = new Map(adults.map((p) => [p.id, p.name]));

  // 1) Költséghez rendelt kifizetések: közvetlenül arra a költségre számítanak
  const directPaid = new Map<string, Map<string, number>>(); // costId -> debtorId -> paid
  const pools = new Map<string, number>();
  const addPool = (key: string, amount: number) =>
    pools.set(key, (pools.get(key) ?? 0) + amount);

  for (const pay of payments) {
    const from = canon(pay.fromFamilyMemberId);
    const to = canon(pay.toFamilyMemberId);
    const alloc = pay.costId ? allocations.find((a) => a.costId === pay.costId) : undefined;
    if (!alloc) {
      addPool(`${from}->${to}`, pay.amountHuf);
      continue;
    }
    const owed = alloc.debits.get(from) ?? 0;
    const byDebtor = directPaid.get(alloc.costId) ?? new Map<string, number>();
    const already = byDebtor.get(from) ?? 0;
    const applied = alloc.payerId === to ? Math.min(Math.max(owed - already, 0), pay.amountHuf) : 0;
    byDebtor.set(from, already + applied);
    directPaid.set(alloc.costId, byDebtor);
    // Ami a költség tartozásán felül van, az általános kifizetésként számít
    if (pay.amountHuf - applied > 0) addPool(`${from}->${to}`, pay.amountHuf - applied);
  }

  // 2) Ha az egész elszámolás már nulla, minden költség rendezett
  const settlementAll = buildTripSettlement(rawCtx, rates);
  const everythingSettled =
    settlementAll.transfers.length > 0 &&
    buildRemainingTransfers(settlementAll.balances, payments, aliases).length === 0;

  // 3) A fennmaradó (költség nélküli) kifizetések sorrendben fedezik a költségeket
  return allocations.map((alloc) => {
    const debtors: CostSettlementDebtor[] = [];
    for (const [id, amount] of alloc.debits) {
      if (id === alloc.payerId || amount <= 0) continue;
      const direct = Math.min(directPaid.get(alloc.costId)?.get(id) ?? 0, amount);
      const key = `${id}->${alloc.payerId}`;
      const available = pools.get(key) ?? 0;
      const fromPool = everythingSettled ? 0 : Math.min(amount - direct, available);
      if (!everythingSettled) pools.set(key, available - fromPool);
      const covered = everythingSettled ? amount : direct + fromPool;
      debtors.push({ id, name: nameOf.get(id) ?? "?", amountHuf: amount, paidHuf: covered });
    }
    const owedHuf = debtors.reduce((sum, d) => sum + d.amountHuf, 0);
    const paidHuf = debtors.reduce((sum, d) => sum + d.paidHuf, 0);
    const status: CostPaymentStatus =
      paidHuf >= owedHuf ? "settled" : paidHuf > 0 ? "partial" : "open";
    return {
      costId: alloc.costId,
      title: alloc.title,
      totalHuf: alloc.totalHuf,
      payerId: alloc.payerId,
      payerName: nameOf.get(alloc.payerId) ?? "?",
      status,
      owedHuf,
      paidHuf,
      debtors,
    };
  });
}

/**
 * A fennmaradó átutalások: a rögzített kifizetések az egyenlegeket módosítják
 * (a fizető tartozása csökken, a kedvezményezett követelése is), majd újra egyszerűsítünk.
 * Így akkor is helyes, ha a kifizetés nem pontosan az ajánlott átutalás párosa.
 */
export function buildRemainingTransfers(
  balances: PersonBalance[],
  payments: RecordedSettlementPaymentLike[],
  aliases: Map<string, string> = new Map()
): SettlementTransfer[] {
  const canon = (id: string) => aliases.get(id) ?? id;
  const adjusted = new Map(balances.map((b) => [b.id, b.balanceHuf]));
  for (const pay of payments) {
    const from = canon(pay.fromFamilyMemberId);
    const to = canon(pay.toFamilyMemberId);
    if (adjusted.has(from)) adjusted.set(from, adjusted.get(from)! + pay.amountHuf);
    if (adjusted.has(to)) adjusted.set(to, adjusted.get(to)! - pay.amountHuf);
  }
  return simplifyTransfers(
    balances.map((b) => ({ ...b, balanceHuf: adjusted.get(b.id) ?? b.balanceHuf }))
  );
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

export interface RecordedSettlementPaymentLike {
  fromFamilyMemberId: string;
  toFamilyMemberId: string;
  amountHuf: number;
  costId?: string | null;
}
