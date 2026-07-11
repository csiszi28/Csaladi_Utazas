"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import {
  buildTripBudgetSummary,
  buildTripCostBreakdown,
  type TripCostContext,
  type HufRateMap,
} from "@csaladi-utazas/shared";
import { useHufRates } from "@/components/exchange-rates-provider";
import { cn } from "@/lib/utils";

interface TripBudgetPanelProps {
  trip: {
    budgetAmount: number | null;
    budgetCurrency: string;
    startDate: Date;
    endDate: Date;
    participants: { familyMember: { id: string; name: string } }[];
    programs: {
      id: string;
      title: string;
      date: Date;
      participants: { familyMember: { id: string } }[];
      costs: {
        id: string;
        title: string;
        amount: number;
        currency: string;
        amountScope?: string;
        programId?: string | null;
        accommodationId?: string | null;
        category: string;
      }[];
    }[];
    accommodations?: {
      id: string;
      title: string;
      checkIn: Date;
      checkOut: Date;
      participants: { familyMember: { id: string } }[];
      costs: {
        id: string;
        title: string;
        amount: number;
        currency: string;
        amountScope?: string;
        programId?: string | null;
        accommodationId?: string | null;
        category: string;
      }[];
    }[];
    costs: {
      id: string;
      title: string;
      amount: number;
      currency: string;
      amountScope?: string;
      programId?: string | null;
      accommodationId?: string | null;
      category: string;
    }[];
    ideas: {
      id: string;
      amount: number | null;
      currency: string;
      amountScope: string;
      interests: { familyMember: { id: string } }[];
    }[];
  };
}

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
}

function statusLabel(status: ReturnType<typeof buildTripBudgetSummary>["status"]) {
  switch (status) {
    case "over":
      return { text: "Túllépve", className: "text-destructive" };
    case "warning":
      return { text: "Közel a limithez", className: "text-amber-600" };
    case "ok":
      return { text: "Rendben", className: "text-emerald-600" };
    default:
      return { text: "Nincs limit", className: "text-muted-foreground" };
  }
}

export function TripBudgetPanel({ trip }: TripBudgetPanelProps) {
  const rates = useHufRates() as HufRateMap;

  const summary = useMemo(() => {
    const ctx: TripCostContext = {
      id: "trip",
      title: "",
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
        participantIds: p.participants.map((x) => x.familyMember.id),
        costs: p.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
      })),
      accommodations: (trip.accommodations ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        participantIds: a.participants.map((x) => x.familyMember.id),
        costs: a.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
      })),
      tripLevelCosts: trip.costs
        .filter((c) => !c.programId && !c.accommodationId)
        .map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
    };

    const breakdown = buildTripCostBreakdown(ctx, rates);

    return buildTripBudgetSummary(
      {
        budgetAmount: trip.budgetAmount,
        budgetCurrency: trip.budgetCurrency,
        participantCount: trip.participants.length,
        ideas: trip.ideas.map((idea) => ({
          id: idea.id,
          amount: idea.amount,
          currency: idea.currency,
          amountScope: idea.amountScope,
          interestedParticipantIds: idea.interests.map((i) => i.familyMember.id),
        })),
        actualTotalHuf: breakdown.totalHuf,
      },
      rates
    );
  }, [trip, rates]);

  const status = statusLabel(summary.status);
  const hasBudget = summary.budgetHuf != null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Becsült (ötletek)</p>
          <p className="mt-1 text-lg font-semibold">{huf(summary.estimatedHuf)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Tényleges költség</p>
          <p className="mt-1 text-lg font-semibold">{huf(summary.actualHuf)}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {hasBudget ? "Költségvetés / maradék" : "Költségvetés"}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {hasBudget ? huf(summary.budgetHuf!) : "Nincs beállítva"}
          </p>
          {hasBudget && summary.remainingHuf != null && (
            <p className={cn("text-xs", summary.remainingHuf < 0 ? "text-destructive" : "text-muted-foreground")}>
              Maradék: {huf(summary.remainingHuf)}
            </p>
          )}
        </div>
      </div>

      {hasBudget && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Felhasználás (tényleges)</span>
            <span className={cn("font-medium", status.className)}>
              {summary.usagePercent}% · {status.text}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                summary.status === "over"
                  ? "bg-destructive"
                  : summary.status === "warning"
                    ? "bg-amber-500"
                    : "bg-primary"
              )}
              style={{ width: `${Math.min(summary.usagePercent ?? 0, 100)}%` }}
            />
          </div>
          {summary.estimatedUsagePercent != null && summary.estimatedUsagePercent > (summary.usagePercent ?? 0) && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Ha minden ötlet megvalósul: ~{summary.estimatedUsagePercent}% ({huf(summary.estimatedHuf)})
            </p>
          )}
        </div>
      )}

      {!hasBudget && (
        <p className="text-sm text-muted-foreground">
          Állíts be költségvetési limitet az utazás szerkesztésénél a terv vs. tény követéshez.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Ft összegek az aktuális árfolyamon (Frankfurter), óránként frissítve.
      </p>

      {summary.status === "over" && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          A tényleges költség meghaladja a beállított költségvetést.
        </p>
      )}
    </div>
  );
}
