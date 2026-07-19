"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, Info, Printer, Undo2 } from "lucide-react";
import {
  applySettlementPayments,
  buildTripSettlement,
  type HufRateMap,
} from "@csaladi-utazas/shared";
import { useHufRates } from "@/components/exchange-rates-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    participants: { familyMember: { id: string; name: string } }[];
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
      fromMember?: { name: string };
      toMember?: { name: string };
    }[];
  };
}

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
}

export function TripSettlementPanel({ tripId, tripTitle, trip }: TripSettlementPanelProps) {
  const rates = useHufRates() as HufRateMap;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({});

  const payments = trip.settlementPayments ?? [];

  const settlement = useMemo(
    () =>
      buildTripSettlement(
        {
          participants: trip.participants.map((p) => ({
            id: p.familyMember.id,
            name: p.familyMember.name,
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
        },
        rates
      ),
    [trip, rates]
  );

  const remainingTransfers = useMemo(
    () =>
      applySettlementPayments(
        settlement.transfers,
        payments.map((p) => ({
          fromFamilyMemberId: p.fromFamilyMemberId,
          toFamilyMemberId: p.toFamilyMemberId,
          amountHuf: p.amountHuf,
        }))
      ),
    [settlement.transfers, payments]
  );

  function transferKey(fromId: string, toId: string) {
    return `${fromId}->${toId}`;
  }

  function markPaid(fromId: string, toId: string, maxAmount: number) {
    const key = transferKey(fromId, toId);
    const raw = partialAmounts[key];
    const amount = raw?.trim() ? Math.round(Number(raw.replace(/\s/g, ""))) : maxAmount;
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
      });
      if (!result.success) toast.error(result.error);
      else {
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

  function undoPayment(id: string) {
    startTransition(async () => {
      const result = await deleteSettlementPayment(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Kifizetés visszavonva");
        router.refresh();
      }
    });
  }

  function handlePrint() {
    window.print();
  }

  if (trip.costs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Még nincsenek költségek az elszámoláshoz.
      </p>
    );
  }

  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          {settlement.settledCostCount} / {settlement.totalCostCount} költségnél van megadva, ki
          fizette.
        </p>
        <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Összefoglaló
        </Button>
      </div>

      <div className="hidden print:block">
        <h2 className="text-lg font-bold">{tripTitle} — elszámolás</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("hu-HU")}
        </p>
      </div>

      {remainingTransfers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fennmaradó kiegyenlítések</p>
          {remainingTransfers.map((transfer, index) => {
            const key = transferKey(transfer.fromId, transfer.toId);
            return (
              <div
                key={`${key}-${index}`}
                className="space-y-2 rounded-lg border px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{transfer.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{transfer.toName}</span>
                  <span className="ml-auto font-semibold text-primary">
                    {huf(transfer.amountHuf)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Részösszeg (opcionális)"
                    value={partialAmounts[key] ?? ""}
                    onChange={(e) =>
                      setPartialAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="min-h-[var(--touch-target)] max-w-[10rem]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-[var(--touch-target)]"
                    disabled={pending}
                    onClick={() =>
                      markPaid(transfer.fromId, transfer.toId, transfer.amountHuf)
                    }
                  >
                    <Check className="h-4 w-4" />
                    Kifizetve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : settlement.settledCostCount > 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Minden rögzített költség kiegyenlített — nincs tartozás.
        </p>
      ) : null}

      {payments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Rögzített kifizetések</p>
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
            >
              <span>
                {p.fromMember?.name ?? "?"} → {p.toMember?.name ?? "?"}
              </span>
              <span className="ml-auto font-medium">{huf(p.amountHuf)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 print:hidden"
                disabled={pending}
                onClick={() => undoPayment(p.id)}
                aria-label="Visszavonás"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Egyenlegek</p>
        {settlement.balances.map((balance) => (
          <div
            key={balance.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <span>{balance.name}</span>
            <span
              className={cn(
                "font-medium",
                balance.balanceHuf > 0
                  ? "text-emerald-600"
                  : balance.balanceHuf < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              )}
            >
              {balance.balanceHuf > 0 && "+"}
              {huf(balance.balanceHuf)}
              {balance.balanceHuf > 0 && " (kap)"}
              {balance.balanceHuf < 0 && " (tartozik)"}
            </span>
          </div>
        ))}
      </div>

      {settlement.unsettledCosts.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3 print:hidden">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Fizető nélküli költségek ({settlement.unsettledCosts.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Add meg a „Ki fizette?” mezőt a költség szerkesztésénél az elszámoláshoz.
          </p>
          <div className="space-y-1">
            {settlement.unsettledCosts.map((cost) => (
              <div key={cost.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cost.title}</span>
                <span>{huf(cost.totalHuf)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground print:hidden">
        Ft összegek az aktuális árfolyamon, óránként frissítve.
      </p>
    </div>
  );
}
