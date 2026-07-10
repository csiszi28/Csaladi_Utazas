"use client";

import { IDEA_AMOUNT_SCOPE_LABELS, type IdeaAmountScope } from "@csaladi-utazas/shared";
import { MoneyDisplay } from "@/components/money-display";
import { cn } from "@/lib/utils";

export function CostAmountDisplay({
  amount,
  currency,
  amountScope,
  className,
}: {
  amount: number;
  currency: string;
  amountScope?: string | null;
  className?: string;
}) {
  const scope = amountScope ?? "TOTAL";
  const scopeLabel = IDEA_AMOUNT_SCOPE_LABELS[scope as IdeaAmountScope] ?? scope;

  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <MoneyDisplay amount={amount} currency={currency} />
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {scopeLabel}
      </span>
    </span>
  );
}
