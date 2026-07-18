"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_HUF_RATES, type Currency } from "@csaladi-utazas/shared";
import type { HufRates } from "@/lib/exchange-rates";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const ExchangeRatesContext = createContext<HufRates>(DEFAULT_HUF_RATES);

let cachedRates: HufRates | null = null;
let cachedAt = 0;

function ratesAreFresh(): boolean {
  return cachedRates != null && Date.now() - cachedAt < REFRESH_INTERVAL_MS;
}

async function fetchRatesFromApi(): Promise<HufRates | null> {
  try {
    const response = await fetch("/api/exchange-rates");
    if (!response.ok) return null;
    return (await response.json()) as HufRates;
  } catch {
    return null;
  }
}

export function ExchangeRatesProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<HufRates>(
    ratesAreFresh() ? cachedRates! : DEFAULT_HUF_RATES
  );

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const data = await fetchRatesFromApi();
      if (cancelled || !data) return;
      cachedRates = data;
      cachedAt = Date.now();
      setRates(data);
    }

    if (!ratesAreFresh()) {
      void refresh();
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    function handleVisibility() {
      if (document.visibilityState === "visible" && !ratesAreFresh()) {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <ExchangeRatesContext.Provider value={rates}>{children}</ExchangeRatesContext.Provider>
  );
}

export function useHufRates(): HufRates {
  return useContext(ExchangeRatesContext);
}

export type { Currency };
