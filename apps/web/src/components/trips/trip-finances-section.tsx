"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Receipt, Wallet } from "lucide-react";
import { COST_CATEGORY_LABELS } from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { TripSettlementPanel } from "@/components/trips/trip-settlement-panel";
import { TripSubviewNav } from "@/components/trips/trip-subview-nav";
import { TripSectionHeading } from "@/components/trips/trip-detail-tabs";
import { TRIP_SECTION_BTN_CLASS } from "@/components/trips/trip-section-styles";
import { cn } from "@/lib/utils";
import type { TripDetailRow } from "@/lib/queries/trips";

type CostRow = TripDetailRow["costs"][number];
type FinanceSubview = "costs" | "settlement";
type CostFilter = "all" | "trip" | "program" | "accommodation";

interface TripFinancesSectionProps {
  trip: {
    participants: TripDetailRow["participants"];
    programs: TripDetailRow["programs"];
    accommodations: TripDetailRow["accommodations"];
  };
  costs: CostRow[];
  programTitleById: Map<string, string>;
  accommodationTitleById: Map<string, string>;
  participantNameById: Map<string, string>;
  isPending?: boolean;
  costOpenSignal?: number;
  onAddCost: () => void;
  onEditCost: (cost: CostRow) => void;
  onDeleteCost: (id: string) => void;
}

const COST_FILTERS: { id: CostFilter; label: string; shortLabel?: string }[] = [
  { id: "all", label: "Összes" },
  { id: "trip", label: "Utazás", shortLabel: "Utaz." },
  { id: "program", label: "Program", shortLabel: "Prog." },
  { id: "accommodation", label: "Szállás" },
];

function costLevelLabel(
  cost: CostRow,
  programTitleById: Map<string, string>,
  accommodationTitleById: Map<string, string>
) {
  if (cost.programId) return programTitleById.get(cost.programId) ?? "Program";
  if (cost.accommodationId) return accommodationTitleById.get(cost.accommodationId) ?? "Szállás";
  return "Utazás szint";
}

export function TripFinancesSection({
  trip,
  costs,
  programTitleById,
  accommodationTitleById,
  participantNameById,
  isPending = false,
  costOpenSignal = 0,
  onAddCost,
  onEditCost,
  onDeleteCost,
}: TripFinancesSectionProps) {
  const [subview, setSubview] = useState<FinanceSubview>("costs");
  const [costFilter, setCostFilter] = useState<CostFilter>("all");

  const filteredCosts = useMemo(() => {
    switch (costFilter) {
      case "trip":
        return costs.filter((c) => !c.programId && !c.accommodationId);
      case "program":
        return costs.filter((c) => Boolean(c.programId));
      case "accommodation":
        return costs.filter((c) => Boolean(c.accommodationId));
      default:
        return costs;
    }
  }, [costs, costFilter]);

  const filterCounts = useMemo(
    () => ({
      all: costs.length,
      trip: costs.filter((c) => !c.programId && !c.accommodationId).length,
      program: costs.filter((c) => c.programId).length,
      accommodation: costs.filter((c) => c.accommodationId).length,
    }),
    [costs]
  );

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="space-y-6">
        <TripSubviewNav
          ariaLabel="Pénzügyek alnézet"
          active={subview}
          onChange={(id) => setSubview(id as FinanceSubview)}
          items={[
            {
              id: "costs",
              label: "Költségek",
              shortLabel: "Költs.",
              count: costs.length,
              icon: <Receipt className="h-4 w-4 shrink-0" />,
            },
            {
              id: "settlement",
              label: "Elszámolás",
              shortLabel: "Elsz.",
              count: costs.filter((c) => c.paidByFamilyMemberId).length,
              icon: <Wallet className="h-4 w-4 shrink-0" />,
            },
          ]}
        />

        {subview === "costs" && (
          <div className="space-y-4">
            <TripSectionHeading
              title="Költségek"
              description="Utazás, program és szállás szintű kiadások"
              action={
                <Button size="sm" className={TRIP_SECTION_BTN_CLASS} onClick={onAddCost}>
                  <Plus className="mr-2 h-4 w-4" />
                  Új költség
                </Button>
              }
            />

            <nav
              className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Költség szűrő"
            >
              {COST_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCostFilter(filter.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-h-[var(--touch-target)] sm:min-h-8",
                    costFilter === filter.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span className="sm:hidden">{filter.shortLabel ?? filter.label}</span>
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className="ml-1 tabular-nums opacity-80">({filterCounts[filter.id]})</span>
                </button>
              ))}
            </nav>

            <div className="space-y-3">
              {filteredCosts.map((cost) => {
                const participantCount = cost.programId
                  ? (trip.programs.find((p) => p.id === cost.programId)?.participants.length ?? 0)
                  : cost.accommodationId
                    ? (trip.accommodations.find((a) => a.id === cost.accommodationId)?.participants
                        .length ?? 0)
                    : trip.participants.length;

                return (
                  <CollapsiblePanel
                    key={cost.id}
                    defaultOpen={false}
                    title={cost.title}
                    subtitle={
                      <span className="flex flex-col gap-0.5">
                        <CostAmountDisplay
                          amount={cost.amount}
                          currency={cost.currency}
                          amountScope={cost.amountScope}
                          participantCount={participantCount}
                        />
                        <span className="text-xs text-muted-foreground">
                          {costLevelLabel(cost, programTitleById, accommodationTitleById)}
                        </span>
                      </span>
                    }
                    badge={
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {COST_CATEGORY_LABELS[cost.category as keyof typeof COST_CATEGORY_LABELS] ??
                          cost.category}
                      </span>
                    }
                    actions={
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onEditCost(cost)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onDeleteCost(cost.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                    className="shadow-none"
                  >
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Szint</dt>
                        <dd className="font-medium">
                          {costLevelLabel(cost, programTitleById, accommodationTitleById)}
                        </dd>
                      </div>
                      {cost.paidByFamilyMemberId && (
                        <div>
                          <dt className="text-muted-foreground">Fizette</dt>
                          <dd className="font-medium">
                            {participantNameById.get(cost.paidByFamilyMemberId) ?? "Ismeretlen"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </CollapsiblePanel>
                );
              })}

              {filteredCosts.length === 0 && (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  {costs.length === 0
                    ? "Még nincsenek költségek."
                    : "Nincs költség ebben a kategóriában."}
                </p>
              )}
            </div>
          </div>
        )}

        {subview === "settlement" && (
          <div className="space-y-4">
            <TripSectionHeading
              title="Elszámolás"
              description="Ki mennyit fizetett és kinek kell visszafizetnie"
            />
            <TripSettlementPanel
              trip={{
                participants: trip.participants,
                programs: trip.programs.map((p) => ({
                  id: p.id,
                  participants: p.participants.map((x) => ({ familyMemberId: x.familyMember.id })),
                })),
                accommodations: trip.accommodations.map((a) => ({
                  id: a.id,
                  participants: a.participants.map((x) => ({ familyMemberId: x.familyMember.id })),
                })),
                costs,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
