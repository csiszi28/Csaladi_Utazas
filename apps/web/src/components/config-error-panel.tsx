import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfigErrorPanel({
  title = "Telepítési hiba",
  message,
  digest,
}: {
  title?: string;
  message: string;
  digest?: string;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div className="space-y-2">
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            {digest && (
              <p className="text-xs text-muted-foreground">
                Hibakód (Vercel logokhoz): <code className="rounded bg-muted px-1">{digest}</code>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-4 text-sm">
          <p className="font-medium">Ellenőrzőlista</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>Vercel → Settings → Environment Variables (mind a 6 változó)</li>
            <li>Redeploy a mentés után</li>
            <li>Supabase SQL: init.sql + rls.sql + migrate fájlok</li>
            <li>
              Diagnosztika:{" "}
              <a href="/api/health" className="text-primary underline">
                /api/health
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href="/api/health" target="_blank" rel="noopener noreferrer">
              Rendszerállapot
            </a>
          </Button>
          <Button asChild>
            <a href="/auth/login">Bejelentkezés</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
