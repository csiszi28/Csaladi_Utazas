import { NextResponse } from "next/server";
import { getHufExchangeRates } from "@/lib/exchange-rates";

export async function GET() {
  const rates = await getHufExchangeRates();
  return NextResponse.json(rates, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
