"use client";

import { CostAmountDisplay } from "@/components/cost-amount-display";

interface CostChipItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountScope?: string;
}

export function CostChips({
  costs,
  participantCount,
  maxVisible = 2,
}: {
  costs: CostChipItem[];
  participantCount: number;
  maxVisible?: number;
}) {
  if (costs.length === 0) return null;

  const visible = costs.slice(0, maxVisible);
  const hiddenCount = costs.length - visible.length;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {visible.map((cost) => (
        <span
          key={cost.id}
          className="inline-flex max-w-full items-center rounded-lg border bg-muted/40 px-2.5 py-1 text-sm sm:text-base"
        >
          <span className="truncate">{cost.title}:</span>
          <CostAmountDisplay
            amount={cost.amount}
            currency={cost.currency}
            amountScope={cost.amountScope}
            participantCount={participantCount}
            className="ml-1 shrink-0 font-medium"
          />
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="text-sm text-muted-foreground sm:text-base">+{hiddenCount} költség</span>
      )}
    </span>
  );
}
