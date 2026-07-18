"use client";

import type { ReactNode } from "react";
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
    <span className={cn("inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5", className)}>
      <MoneyDisplay amount={amount} currency={currency} className="min-w-0 break-words" />
      <ScopeBadge label={scopeLabel} />
    </span>
  );
}

/** Unified chip shell for registered / idea cost amounts. */
export function CostAmountChip({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-1 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm sm:text-base",
        className
      )}
    >
      {label ? <span className="truncate font-medium text-foreground">{label}</span> : null}
      {children}
    </span>
  );
}

export function CostAmountDisplay({
  amount,
  currency,
  amountScope,
  participantCount,
  className,
  chip,
  chipLabel,
}: {
  amount: number;
  currency: string;
  amountScope?: string | null;
  participantCount?: number;
  className?: string;
  /** Wrap in the shared muted chip used on program/accommodation cards. */
  chip?: boolean;
  chipLabel?: string;
}) {
  const scope = amountScope ?? "TOTAL";
  const scopeLabel = IDEA_AMOUNT_SCOPE_LABELS[scope as IdeaAmountScope] ?? scope;
  const split =
    participantCount != null && participantCount > 0
      ? computeScopedAmounts(amount, scope, participantCount)
      : null;

  const body = !split ? (
    <AmountWithScope
      amount={amount}
      currency={currency}
      scopeLabel={scopeLabel}
      className={chip ? undefined : className}
    />
  ) : (
    <span
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1.5",
        !chip && className
      )}
    >
      <AmountWithScope amount={split.perPerson} currency={currency} scopeLabel="1 főre" />
      <span className="hidden text-muted-foreground sm:inline" aria-hidden>
        ·
      </span>
      <AmountWithScope amount={split.total} currency={currency} scopeLabel="Összesen" />
    </span>
  );

  if (!chip) return body;

  return (
    <CostAmountChip label={chipLabel} className={className}>
      {body}
    </CostAmountChip>
  );
}
