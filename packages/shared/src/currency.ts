export const CURRENCIES = ["HUF", "EUR", "USD", "AED"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  HUF: "Ft",
  EUR: "EUR",
  USD: "USD",
  AED: "AED",
};

/** Becsült árfolyamok megjelenítéshez (1 egység → HUF) */
export const DEFAULT_HUF_RATES: Record<Currency, number> = {
  HUF: 1,
  EUR: 395,
  USD: 365,
  AED: 108,
};

export function toHuf(
  amount: number,
  currency: string,
  rates: Record<Currency, number> = DEFAULT_HUF_RATES
): number {
  const c = CURRENCIES.includes(currency as Currency) ? (currency as Currency) : "HUF";
  return amount * rates[c];
}

export function formatMoney(amount: number, currency: string): string {
  const c = CURRENCIES.includes(currency as Currency) ? (currency as Currency) : "HUF";
  const decimals = c === "HUF" ? 0 : 2;
  return `${amount.toLocaleString("hu-HU", { maximumFractionDigits: decimals })} ${CURRENCY_LABELS[c]}`;
}

export function formatMoneyWithHuf(
  amount: number,
  currency: string,
  rates: Record<Currency, number> = DEFAULT_HUF_RATES
): string {
  const primary = formatMoney(amount, currency);
  if (currency === "HUF") return primary;
  const huf = Math.round(toHuf(amount, currency, rates));
  return `${primary} (≈ ${huf.toLocaleString("hu-HU")} Ft)`;
}
