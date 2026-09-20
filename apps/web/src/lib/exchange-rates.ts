import { unstable_cache } from "next/cache";
import { DEFAULT_HUF_RATES, type Currency } from "@csaladi-utazas/shared";

export type HufRates = Record<Currency, number>;

type FrankfurterResponse = { rates?: { HUF?: number } };
type OpenErApiResponse = { result?: string; rates?: { HUF?: number } };

async function fetchFrankfurterHuf(from: "EUR" | "USD" | "THB"): Promise<number | null> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=HUF`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FrankfurterResponse;
  return data.rates?.HUF ?? null;
}

/** Frankfurter (ECB) nem listázza az AED-et — open.er-api napi középárfolyam. */
async function fetchAedHuf(): Promise<number | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/AED", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as OpenErApiResponse;
  if (data.result && data.result !== "success") return null;
  return data.rates?.HUF ?? null;
}

async function fetchRatesFromApi(): Promise<HufRates> {
  try {
    const [eur, usd, thb, aed] = await Promise.all([
      fetchFrankfurterHuf("EUR"),
      fetchFrankfurterHuf("USD"),
      fetchFrankfurterHuf("THB"),
      fetchAedHuf(),
    ]);

    if (eur == null || usd == null) {
      return DEFAULT_HUF_RATES;
    }

    return {
      HUF: 1,
      EUR: eur,
      USD: usd,
      AED: aed ?? DEFAULT_HUF_RATES.AED,
      THB: thb ?? DEFAULT_HUF_RATES.THB,
    };
  } catch {
    return DEFAULT_HUF_RATES;
  }
}

export const getHufExchangeRates = unstable_cache(
  fetchRatesFromApi,
  ["huf-exchange-rates-v2"],
  { revalidate: 3600 }
);
