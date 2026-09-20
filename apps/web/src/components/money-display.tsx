"use client";

import { formatMoney, formatMoneyWithHuf, formatUnitHufRate } from "@csaladi-utazas/shared";
import { useHufRates } from "@/components/exchange-rates-provider";

export function MoneyDisplay({
  amount,
  currency,
  withHuf = true,
  className,
}: {
  amount: number;
  currency: string;
  withHuf?: boolean;
  className?: string;
}) {
  const rates = useHufRates();
  const text = withHuf
    ? formatMoneyWithHuf(amount, currency, rates)
    : formatMoney(amount, currency);

  return <span className={className}>{text}</span>;
}

/** Aktuális egységárfolyam a pénznemválasztó / összegmező mellett. */
export function CurrencyRateHint({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}) {
  const rates = useHufRates();
  const text = formatUnitHufRate(currency, rates);
  if (!text) return null;
  return <p className={className ?? "text-xs text-muted-foreground"}>{text}</p>;
}

export function useFormatMoney() {
  const rates = useHufRates();
  return {
    formatWithHuf: (amount: number, currency: string) =>
      formatMoneyWithHuf(amount, currency, rates),
    format: formatMoney,
    formatRate: (currency: string) => formatUnitHufRate(currency, rates),
    rates,
  };
}
