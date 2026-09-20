export const CURRENCIES = ["HUF", "EUR", "USD", "AED", "THB"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  HUF: "Ft",
  EUR: "EUR",
  USD: "USD",
  AED: "AED",
  THB: "THB",
};

/** Becsült árfolyamok megjelenítéshez (1 egység → HUF) — AED ≈ 84–86 */
export const DEFAULT_HUF_RATES: Record<Currency, number> = {
  HUF: 1,
  EUR: 395,
  USD: 365,
  AED: 86,
  THB: 10,
};

function asCurrency(currency: string): Currency {
  return CURRENCIES.includes(currency as Currency) ? (currency as Currency) : "HUF";
}

export function toHuf(
  amount: number,
  currency: string,
  rates: Record<Currency, number> = DEFAULT_HUF_RATES
): number {
  return amount * rates[asCurrency(currency)];
}

export function formatMoney(amount: number, currency: string): string {
  const c = asCurrency(currency);
  const decimals = c === "HUF" ? 0 : 2;
  return `${amount.toLocaleString("hu-HU", { maximumFractionDigits: decimals })} ${CURRENCY_LABELS[c]}`;
}

/** Pl. `1 AED ≈ 86 Ft` — HUF-nál null. */
export function formatUnitHufRate(
  currency: string,
  rates: Record<Currency, number> = DEFAULT_HUF_RATES
): string | null {
  const c = asCurrency(currency);
  if (c === "HUF") return null;
  const rate = rates[c];
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const formatted =
    rate >= 100
      ? Math.round(rate).toLocaleString("hu-HU")
      : rate.toLocaleString("hu-HU", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return `1 ${CURRENCY_LABELS[c]} ≈ ${formatted} Ft`;
}

export function formatMoneyWithHuf(
  amount: number,
  currency: string,
  rates: Record<Currency, number> = DEFAULT_HUF_RATES
): string {
  const primary = formatMoney(amount, currency);
  if (currency === "HUF" || asCurrency(currency) === "HUF") return primary;
  const huf = Math.round(toHuf(amount, currency, rates));
  const unitRate = formatUnitHufRate(currency, rates);
  const hufPart = `≈ ${huf.toLocaleString("hu-HU")} Ft`;
  return unitRate ? `${primary} (${unitRate}) ${hufPart}` : `${primary} ${hufPart}`;
}
