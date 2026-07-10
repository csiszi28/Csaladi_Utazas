"use client";

import {
  IDEA_AMOUNT_SCOPE_LABELS,
  computeScopedAmounts,
  type IdeaAmountScope,
} from "@csaladi-utazas/shared";
import { MoneyDisplay } from "@/components/money-display";
import { cn } from "@/lib/utils";

function ScopeBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  );
}

function AmountWithScope({
  amount,
  currency,
  scopeLabel,
  className,
}: {
  amount: number;
  currency: string;
  scopeLabel: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <MoneyDisplay amount={amount} currency={currency} />
      <ScopeBadge label={scopeLabel} />
    </span>
  );
}

export function CostAmountDisplay({
  amount,
  currency,
  amountScope,
  participantCount,
  className,
}: {
  amount: number;
  currency: string;
  amountScope?: string | null;
  participantCount?: number;
  className?: string;
}) {
  const scope = amountScope ?? "TOTAL";
  const scopeLabel = IDEA_AMOUNT_SCOPE_LABELS[scope as IdeaAmountScope] ?? scope;
  const split =
    participantCount != null && participantCount > 0
      ? computeScopedAmounts(amount, scope, participantCount)
      : null;

  if (!split) {
    return (
      <AmountWithScope
        amount={amount}
        currency={currency}
        scopeLabel={scopeLabel}
        className={className}
      />
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}>
      <AmountWithScope amount={split.perPerson} currency={currency} scopeLabel="1 főre" />
      <span className="text-muted-foreground">·</span>
      <AmountWithScope amount={split.total} currency={currency} scopeLabel="Összesen" />
    </span>
  );
}
