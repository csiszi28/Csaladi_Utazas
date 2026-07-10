"use client";

import { formatMoney, formatMoneyWithHuf } from "@csaladi-utazas/shared";
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

export function useFormatMoney() {
  const rates = useHufRates();
  return {
    formatWithHuf: (amount: number, currency: string) =>
      formatMoneyWithHuf(amount, currency, rates),
    format: formatMoney,
    rates,
  };
}
