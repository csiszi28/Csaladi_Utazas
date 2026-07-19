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
    <span className="flex w-full min-w-0 max-w-full flex-col gap-1.5">
      {visible.map((cost) => (
        <CostAmountDisplay
          key={cost.id}
          amount={cost.amount}
          currency={cost.currency}
          amountScope={cost.amountScope}
          participantCount={participantCount}
          chip
          className="font-medium"
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-sm text-muted-foreground sm:text-base">+{hiddenCount} költség</span>
      )}
    </span>
  );
}
