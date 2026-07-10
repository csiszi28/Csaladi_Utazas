import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">Nincs internetkapcsolat</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Az alkalmazás offline módban korlátozottan érhető el. Csatlakozz újra a friss adatok
          betöltéséhez.
        </p>
      </div>
      <Button asChild className="min-h-[var(--touch-target)]">
        <a href="/">Újrapróbálás</a>
      </Button>
    </div>
  );
}
