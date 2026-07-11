"use client";

import { useMemo } from "react";
import { ArrowRight, Info } from "lucide-react";
import { buildTripSettlement, type HufRateMap } from "@csaladi-utazas/shared";
import { useHufRates } from "@/components/exchange-rates-provider";
import { cn } from "@/lib/utils";

interface TripSettlementPanelProps {
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
    costs: {
      id: string;
      title: string;
      amount: number;
      currency: string;
      amountScope?: string;
      programId?: string | null;
      accommodationId?: string | null;
      paidByFamilyMemberId?: string | null;
    }[];
  };
}

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
}

export function TripSettlementPanel({ trip }: TripSettlementPanelProps) {
  const rates = useHufRates() as HufRateMap;

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
          costs: trip.costs.map((c) => ({
            ...c,
            amountScope: c.amountScope ?? "TOTAL",
          })),
        },
        rates
      ),
    [trip, rates]
  );

  if (trip.costs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Még nincsenek költségek az elszámoláshoz.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {settlement.settledCostCount} / {settlement.totalCostCount} költségnél van megadva, ki fizette.
      </p>

      {settlement.transfers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Ajánlott kiegyenlítések</p>
          {settlement.transfers.map((transfer, index) => (
            <div
              key={`${transfer.fromId}-${transfer.toId}-${index}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
            >
              <span className="font-medium">{transfer.fromName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{transfer.toName}</span>
              <span className="ml-auto font-semibold text-primary">{huf(transfer.amountHuf)}</span>
            </div>
          ))}
        </div>
      ) : settlement.settledCostCount > 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Minden rögzített költség kiegyenlített — nincs tartozás.
        </p>
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
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
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

      <p className="text-xs text-muted-foreground">
        Ft összegek az aktuális árfolyamon, óránként frissítve.
      </p>
    </div>
  );
}