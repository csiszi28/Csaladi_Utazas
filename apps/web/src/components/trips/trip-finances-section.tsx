"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { COST_CATEGORY_LABELS } from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { TripSettlementPanel } from "@/components/trips/trip-settlement-panel";
import { TripBudgetPanel } from "@/components/trips/trip-budget-panel";
import { TripFilterChips, TripSectionHeading } from "@/components/trips/trip-detail-tabs";
import { TRIP_SECTION_BTN_CLASS } from "@/components/trips/trip-section-styles";
import type { TripDetailRow } from "@/lib/queries/trips";

type CostRow = TripDetailRow["costs"][number];
type CostFilter = "all" | "trip" | "program" | "accommodation";

interface TripFinancesSectionProps {
  trip: TripDetailRow;
  costs: CostRow[];
  programTitleById: Map<string, string>;
  accommodationTitleById: Map<string, string>;
  participantNameById: Map<string, string>;
  isPending?: boolean;
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
  onAddCost,
  onEditCost,
  onDeleteCost,
}: TripFinancesSectionProps) {
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
    <section className="space-y-8 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="space-y-4">
        <TripSectionHeading
          title="Költségvetés"
          description="Terv vs. tény összehasonlítás az aktuális árfolyamon"
        />
        <TripBudgetPanel trip={trip} />
      </div>

      <div className="space-y-4">
        <TripSectionHeading
          title="Költségek"
          description="Utazás, program és szállás szintű kiadások"
          action={
            <Button className={TRIP_SECTION_BTN_CLASS} onClick={onAddCost}>
              <Plus className="h-4 w-4" />
              Új költség
            </Button>
          }
        />

        <TripFilterChips
          ariaLabel="Költség szűrő"
          active={costFilter}
          onChange={setCostFilter}
          items={COST_FILTERS.map((filter) => ({
            ...filter,
            count: filterCounts[filter.id],
          }))}
        />

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
                      chip
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

      <div className="space-y-4">
        <TripSectionHeading
          title="Elszámolás"
          description="Ki mennyit fizetett és kinek kell visszafizetnie"
        />
        <TripSettlementPanel
          tripId={trip.id}
          tripTitle={trip.title}
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
            transports: (trip.transports ?? []).map((t) => ({
              id: t.id,
              participants: t.participants.map((x) => ({ familyMemberId: x.familyMember.id })),
            })),
            costs,
            settlementPayments: trip.settlementPayments ?? [],
          }}
        />
      </div>
    </section>
  );
}
