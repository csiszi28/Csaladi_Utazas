import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewerBanner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-100",
        className
      )}
    >
      <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">Csak megtekintés</p>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/75">
          Nézőként nem tudsz módosítani. Ha szerkesztenéd az utat, kérj szerkesztő jogot a
          tulajdonostól.
        </p>
      </div>
    </div>
  );
}
