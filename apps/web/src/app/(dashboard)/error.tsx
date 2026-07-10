"use client";

import { ConfigErrorPanel } from "@/components/config-error-panel";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isGenericProductionMessage = error.message.includes(
    "omitted in production builds"
  );

  return (
    <ConfigErrorPanel
      title="Valami hiba történt"
      message={
        isGenericProductionMessage
          ? "Szerver oldali hiba történt (gyakran hiányzó Vercel env változó vagy adatbázis séma). Nyisd meg a /api/health oldalt a pontos okért, vagy nézd meg a Vercel → Deployments → Functions logot."
          : error.message
      }
      digest={error.digest}
    />
  );
}
