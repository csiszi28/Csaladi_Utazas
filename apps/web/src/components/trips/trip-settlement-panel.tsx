"use client";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, CheckCircle2, Info, Printer, Trash2 } from "lucide-react";
import {
  buildRemainingTransfers,
  buildCostSettlementStatuses,
  buildSettlementAliasMap,
  buildTripSettlement,
  formatAmountInput,
  parseAmountInput,
  type HufRateMap,
  type SettlementTransfer,
} from "@csaladi-utazas/shared";
import { useHufRates } from "@/components/exchange-rates-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Monogram } from "@/components/monogram";
import { useMemberAvatarUrl } from "@/components/member-avatar-provider";
import {
  createSettlementPayment,
  deleteSettlementPayment,
} from "@/actions/feature-pack";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TripSettlementPanelProps {
  tripId: string;
  tripTitle: string;
  trip: {
    participants: {
      familyMember: {
        id: string;
        name: string;
        isChild?: boolean;
        linkedUserId?: string | null;
        userId?: string | null;
      };
    }[];
    programs: {
      id: string;
      participants: { familyMemberId: string }[];
    }[];
    accommodations?: {
      id: string;
      participants: { familyMemberId: string }[];
    }[];
    transports?: {
      id: string;
      participants: { familyMemberId: string }[];
    }[];
    costs: {
      id: string;
      title: string;
      amount: number;
      currency: string;
      amountScope?: string;
      programId?: string | null;
      accommodationId?: string | null;
      transportId?: string | null;
      paidByFamilyMemberId?: string | null;
    }[];
    settlementPayments?: {
      id: string;
      fromFamilyMemberId: string;
      toFamilyMemberId: string;
      amountHuf: number;
      paidAt: Date | string;
      costId?: string | null;
      fromMember?: { name: string };
      toMember?: { name: string };
    }[];
  };
  childMemberIds?: string[];
}

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
}

function sumToPerson(transfers: SettlementTransfer[], personId: string) {
  return transfers
    .filter((t) => t.toId === personId)
    .reduce((sum, t) => sum + t.amountHuf, 0);
}

function sumFromPerson(transfers: SettlementTransfer[], personId: string) {
  return transfers
    .filter((t) => t.fromId === personId)
    .reduce((sum, t) => sum + t.amountHuf, 0);
}

function PersonChip({
  memberId,
  name,
  size = "sm",
}: {
  memberId?: string;
  name: string;
  size?: "sm" | "md";
}) {
  const avatarUrl = useMemberAvatarUrl(memberId);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Monogram
        name={name}
        imageUrl={avatarUrl}
        className={size === "md" ? "h-8 w-8" : "h-6 w-6"}
      />
      <span className="truncate font-medium">{name}</span>
    </span>
  );
}

export function TripSettlementPanel({
  tripId,
  tripTitle,
  trip,
  childMemberIds = [],
}: TripSettlementPanelProps) {
  const rates = useHufRates() as HufRateMap;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});
  const childSet = useMemo(() => new Set(childMemberIds), [childMemberIds]);

  // Helyi másolat: a kifizetés rögzítése/törlése azonnal látszik, a szerver-frissítés háttérben fut
  const serverPayments = trip.settlementPayments;
  const [payments, setPayments] = useState(serverPayments ?? []);
  useEffect(() => {
    setPayments(serverPayments ?? []);
  }, [serverPayments]);

  const settlementCtx = useMemo(
    () => ({
      participants: trip.participants.map((p) => ({
        id: p.familyMember.id,
        name: p.familyMember.name,
        isChild: p.familyMember.isChild ?? childSet.has(p.familyMember.id),
        linkedUserId: p.familyMember.linkedUserId,
        ownerUserId: p.familyMember.userId,
      })),
      programs: trip.programs.map((p) => ({
        id: p.id,
        participantIds: p.participants.map((x) => x.familyMemberId),
      })),
      accommodations: (trip.accommodations ?? []).map((a) => ({
        id: a.id,
        participantIds: a.participants.map((x) => x.familyMemberId),
      })),
      transports: (trip.transports ?? []).map((t) => ({
        id: t.id,
        participantIds: t.participants.map((x) => x.familyMemberId),
      })),
      costs: trip.costs.map((c) => ({
        ...c,
        amountScope: c.amountScope ?? "TOTAL",
      })),
    }),
    [trip, childSet]
  );

  const settlement = useMemo(
    () => buildTripSettlement(settlementCtx, rates),
    [settlementCtx, rates]
  );

  const costStatuses = useMemo(
    () =>
      buildCostSettlementStatuses(
        settlementCtx,
        rates,
        payments.map((p) => ({
          fromFamilyMemberId: p.fromFamilyMemberId,
          toFamilyMemberId: p.toFamilyMemberId,
          amountHuf: p.amountHuf,
          costId: p.costId,
        }))
      ),
    [settlementCtx, rates, payments]
  );

  const paymentAliases = useMemo(
    () =>
      buildSettlementAliasMap(
        trip.participants.map((p) => ({
          id: p.familyMember.id,
          name: p.familyMember.name,
          linkedUserId: p.familyMember.linkedUserId,
          ownerUserId: p.familyMember.userId,
        }))
      ),
    [trip.participants]
  );

  /** Nyitott és részben fizetett költségek felül; tartozók között is a még nem fizetettek elöl */
  const sortedCostStatuses = useMemo(() => {
    const rank = { open: 0, partial: 1, settled: 2 } as const;
    return costStatuses
      .map((cost) => ({
        ...cost,
        debtors: [...cost.debtors].sort(
          (a, b) =>
            Number(a.paidHuf >= a.amountHuf) - Number(b.paidHuf >= b.amountHuf) ||
            b.amountHuf - b.paidHuf - (a.amountHuf - a.paidHuf)
        ),
      }))
      .sort((a, b) => rank[a.status] - rank[b.status]);
  }, [costStatuses]);

  const remainingTransfers = useMemo(
    () =>
      buildRemainingTransfers(
        settlement.transfers,
        settlement.balances,
        payments.map((p) => ({
          fromFamilyMemberId: p.fromFamilyMemberId,
          toFamilyMemberId: p.toFamilyMemberId,
          amountHuf: p.amountHuf,
          costId: p.costId,
        })),
        paymentAliases
      ),
    [settlement.transfers, settlement.balances, payments, paymentAliases]
  );

  const tripChildren = useMemo(
    () =>
      trip.participants
        .map((p) => p.familyMember)
        .filter((m) => m.isChild ?? childSet.has(m.id)),
    [trip.participants, childSet]
  );

  /** Kiegyenlítés utáni nettó egyenleg személyenként */
  const liveBalances = useMemo(() => {
    return settlement.balances.map((b) => {
      const stillOwes = sumFromPerson(remainingTransfers, b.id);
      const stillDue = sumToPerson(remainingTransfers, b.id);
      const live = stillDue - stillOwes;

      const originalDue = sumToPerson(settlement.transfers, b.id);
      const originalOwes = sumFromPerson(settlement.transfers, b.id);

      let progress = 100;
      let progressTone: "success" | "danger" | "primary" = "primary";
      let progressHint = "Kiegyenlített";

      if (originalDue > 0) {
        // Kap: tele = mindenki kifizette
        const collected = originalDue - stillDue;
        progress = Math.round((collected / originalDue) * 100);
        progressTone = progress >= 100 ? "success" : "primary";
        progressHint =
          progress >= 100
            ? "Teljes kiegyenlítés"
            : `${huf(collected)} / ${huf(originalDue)} megkapva`;
      } else if (originalOwes > 0) {
        // Tartozik: tele = mindent visszafizetett
        const paid = originalOwes - stillOwes;
        progress = Math.round((paid / originalOwes) * 100);
        progressTone = progress >= 100 ? "success" : "danger";
        progressHint =
          progress >= 100
            ? "Teljes kiegyenlítés"
            : `${huf(paid)} / ${huf(originalOwes)} rendezve`;
      } else if (b.balanceHuf === 0) {
        progress = 100;
        progressTone = "primary";
        progressHint = "Nulla egyenleg";
      }

      return {
        ...b,
        liveBalanceHuf: live,
        progress,
        progressTone,
        progressHint,
      };
    });
  }, [settlement.balances, settlement.transfers, remainingTransfers]);

  function transferKey(fromId: string, toId: string, costId?: string) {
    return costId ? `${costId}:${fromId}->${toId}` : `${fromId}->${toId}`;
  }

  function markPaid(fromId: string, toId: string, maxAmount: number, costId?: string) {
    const key = transferKey(fromId, toId, costId);
    const raw = partialAmounts[key];
    const amount = raw?.trim() ? Math.round(parseAmountInput(raw)) : maxAmount;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Érvénytelen összeg");
      return;
    }
    if (amount > maxAmount) {
      toast.error("Az összeg nem lehet nagyobb a tartozásnál");
      return;
    }

    startTransition(async () => {
      const result = await createSettlementPayment({
        tripId,
        fromFamilyMemberId: fromId,
        toFamilyMemberId: toId,
        amountHuf: amount,
        costId: costId ?? null,
      });
      if (!result.success) toast.error(result.error);
      else {
        const nameOf = (id: string) =>
          trip.participants.find((p) => p.familyMember.id === id)?.familyMember.name ?? "?";
        setPayments((prev) => [
          {
            id: result.data.id,
            fromFamilyMemberId: fromId,
            toFamilyMemberId: toId,
            amountHuf: amount,
            costId: costId ?? null,
            paidAt: new Date().toISOString(),
            fromMember: { name: nameOf(fromId) },
            toMember: { name: nameOf(toId) },
          },
          ...prev,
        ]);
        toast.success("Kifizetés rögzítve");
        setPartialAmounts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        router.refresh();
      }
    });
  }

  const confirmDelete = useConfirmDelete();

  async function undoPayment(id: string) {
    if (!(await confirmDelete("ezt a kifizetést"))) return;
    startTransition(async () => {
      const result = await deleteSettlementPayment(id);
      if (!result.success) toast.error(result.error);
      else {
        setPayments((prev) => prev.filter((p) => p.id !== id));
        toast.success("Kifizetés törölve");
        router.refresh();
      }
    });
  }

  if (trip.costs.length === 0) {
    return (
      <p className="text-sm text-foreground">Még nincsenek költségek az elszámoláshoz.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm text-foreground">
            {settlement.settledCostCount} / {settlement.totalCostCount} költségnél van megadva, ki
            fizette.
          </p>
          <p className="mt-0.5 text-xs text-foreground">
            A gyerekként jelölt családtagok nem szerepelnek a kiegyenlítésben.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Összefoglaló
        </Button>
      </div>

      <div className="hidden print:block">
        <h2 className="text-lg font-bold">{tripTitle} — elszámolás</h2>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Egyenlegek</h3>
          <p className="mt-0.5 text-xs text-foreground">
            A „kap” sáv akkor telik meg, ahogy a többiek rendezik a tartozásukat.
          </p>
          {tripChildren.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Gyerek: {tripChildren.map((c) => c.name).join(", ")} — a költségek számolásánál
              szerepel, de tartozás nem kerül hozzá, a részét a felnőttek viszik.
            </p>
          ) : null}
        </div>
        <ul className="divide-y">
          {liveBalances.map((balance) => {
            const positive = balance.liveBalanceHuf > 0;
            const negative = balance.liveBalanceHuf < 0;
            return (
              <li key={balance.id} className="space-y-2.5 px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <PersonChip memberId={balance.id} name={balance.name} size="md" />
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        positive && "text-emerald-700 dark:text-emerald-400",
                        negative && "text-destructive",
                        !positive && !negative && "text-foreground"
                      )}
                    >
                      {positive && "+"}
                      {huf(balance.liveBalanceHuf)}
                    </p>
                    <p className="text-[11px] text-foreground">
                      {positive ? "kap" : negative ? "tartozik" : "egyenlő"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <ProgressBar
                    value={balance.progress}
                    size="sm"
                    tone={balance.progressTone}
                    showValue={false}
                  />
                  <p className="text-[11px] text-foreground">{balance.progressHint}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {remainingTransfers.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">Fennmaradó kiegyenlítések</h3>
          <ul className="divide-y rounded-xl border bg-card">
            {remainingTransfers.map((transfer, index) => {
              const key = transferKey(transfer.fromId, transfer.toId);
              return (
                <li
                  key={`${key}-${index}`}
                  className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <PersonChip memberId={transfer.fromId} name={transfer.fromName} />
                    <ArrowRight className="h-4 w-4 shrink-0 text-foreground/50" aria-hidden />
                    <PersonChip memberId={transfer.toId} name={transfer.toName} />
                  </div>

                  <p className="shrink-0 text-base font-bold tabular-nums sm:w-32 sm:text-right">
                    {huf(transfer.amountHuf)}
                  </p>

                  <div className="flex shrink-0 items-center gap-2 print:hidden">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Részösszeg"
                      value={partialAmounts[key] ?? ""}
                      onChange={(e) =>
                        setPartialAmounts((prev) => ({
                          ...prev,
                          [key]: formatAmountInput(e.target.value),
                        }))
                      }
                      className="h-8 w-28 rounded-md text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1 rounded-md px-2.5 text-xs"
                      disabled={pending}
                      onClick={() =>
                        markPaid(transfer.fromId, transfer.toId, transfer.amountHuf)
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      Kifizetve
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : settlement.settledCostCount > 0 ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-foreground">
          Minden rögzített költség kiegyenlített — nincs tartozás.
        </p>
      ) : null}

      {sortedCostStatuses.length > 0 ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Költségek állapota</h3>
            <p className="mt-0.5 text-xs text-foreground">
              Melyik költséget fizették már ki. A kifizetések a költségeket sorrendben fedezik.
            </p>
          </div>
          <ul className="divide-y">
            {sortedCostStatuses.map((cost) => {
              const remaining = cost.owedHuf - cost.paidHuf;
              const badge =
                cost.status === "settled"
                  ? { label: "Kifizetve", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" }
                  : cost.status === "partial"
                    ? { label: "Részben", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" }
                    : { label: "Nyitott", className: "bg-destructive/10 text-destructive" };
              return (
                <li key={cost.costId} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{cost.title}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">
                    {huf(cost.totalHuf)} · fizette: {cost.payerName}
                    {cost.status !== "settled"
                      ? ` · még hátra: ${huf(remaining)}`
                      : cost.owedHuf > 0
                        ? ` · ${huf(cost.owedHuf)} rendezve`
                        : ""}
                  </p>
                  {cost.debtors.length > 0 ? (
                    <ul className="space-y-1.5 pt-0.5">
                      {cost.debtors.map((d) => {
                        const left = d.amountHuf - d.paidHuf;
                        const key = transferKey(d.id, cost.payerId, cost.costId);
                        return (
                          <li key={d.id} className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-muted-foreground">{d.name}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {left <= 0
                                  ? `${huf(d.amountHuf)} ✓`
                                  : `${huf(d.paidHuf)} / ${huf(d.amountHuf)}`}
                              </span>
                            </div>
                            {left > 0 ? (
                              <div className="flex items-center justify-end gap-1.5 print:hidden">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={huf(left)}
                                  value={partialAmounts[key] ?? ""}
                                  onChange={(e) =>
                                    setPartialAmounts((prev) => ({
                                      ...prev,
                                      [key]: formatAmountInput(e.target.value),
                                    }))
                                  }
                                  className="h-8 w-28 rounded-md text-xs"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 gap-1 rounded-md px-2.5 text-xs"
                                  disabled={pending}
                                  onClick={() => markPaid(d.id, cost.payerId, left, cost.costId)}
                                >
                                  <Check className="h-3 w-3" />
                                  Kifizetve
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {payments.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Teljesült kiegyenlítések</h3>
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              {payments.length} tétel
            </span>
          </div>
          <ul className="space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-card to-card px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.fromMember?.name ?? "?"}
                    <span className="mx-1.5 text-foreground/40">→</span>
                    {p.toMember?.name ?? "?"}
                  </p>
                  {p.costId ? (
                    <p className="truncate text-[11px] text-foreground">
                      Költség: {trip.costs.find((c) => c.id === p.costId)?.title ?? "törölt költség"}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-foreground">
                    {new Date(p.paidAt).toLocaleString("hu-HU", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                  {huf(p.amountHuf)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive print:hidden"
                  disabled={pending}
                  onClick={() => undoPayment(p.id)}
                  aria-label="Kifizetés törlése"
                  title="Kifizetés törlése"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {settlement.unsettledCosts.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed p-3 print:hidden">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Info className="h-4 w-4" />
            Fizető nélküli költségek ({settlement.unsettledCosts.length})
          </p>
          <p className="text-xs text-foreground">
            Add meg a „Ki fizette?” mezőt a költség szerkesztésénél.
          </p>
          {settlement.unsettledCosts.map((cost) => (
            <div key={cost.id} className="flex justify-between text-sm">
              <span>{cost.title}</span>
              <span className="tabular-nums">{huf(cost.totalHuf)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
