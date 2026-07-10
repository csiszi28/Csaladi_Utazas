import { unstable_cache } from "next/cache";
import { DEFAULT_HUF_RATES, type Currency } from "@csaladi-utazas/shared";

export type HufRates = Record<Currency, number>;

async function fetchRatesFromApi(): Promise<HufRates> {
  try {
    const [eurRes, usdRes, aedRes] = await Promise.all([
      fetch("https://api.frankfurter.app/latest?from=EUR&to=HUF", {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.frankfurter.app/latest?from=USD&to=HUF", {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.frankfurter.app/latest?from=AED&to=HUF", {
        next: { revalidate: 3600 },
      }),
    ]);

    if (!eurRes.ok || !usdRes.ok) {
      return DEFAULT_HUF_RATES;
    }

    const eurData = (await eurRes.json()) as { rates?: { HUF?: number } };
    const usdData = (await usdRes.json()) as { rates?: { HUF?: number } };
    const aedData = aedRes.ok
      ? ((await aedRes.json()) as { rates?: { HUF?: number } })
      : null;

    return {
      HUF: 1,
      EUR: eurData.rates?.HUF ?? DEFAULT_HUF_RATES.EUR,
      USD: usdData.rates?.HUF ?? DEFAULT_HUF_RATES.USD,
      AED: aedData?.rates?.HUF ?? DEFAULT_HUF_RATES.AED,
    };
  } catch {
    return DEFAULT_HUF_RATES;
  }
}

export const getHufExchangeRates = unstable_cache(
  fetchRatesFromApi,
  ["huf-exchange-rates"],
  { revalidate: 3600 }
);
