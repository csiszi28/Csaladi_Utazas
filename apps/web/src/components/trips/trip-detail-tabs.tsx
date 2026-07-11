"use client";

import { cn } from "@/lib/utils";

export type TripDetailTab = "planning" | "accommodations" | "finances" | "documents";

const TABS: { id: TripDetailTab; label: string; shortLabel?: string }[] = [
  { id: "planning", label: "Programok", shortLabel: "Prog." },
  { id: "accommodations", label: "Szállás" },
  { id: "finances", label: "Pénzügyek", shortLabel: "Pénz" },
  { id: "documents", label: "Dokumentumok", shortLabel: "Dok." },
];

interface TripDetailTabsProps {
  active: TripDetailTab;
  onChange: (tab: TripDetailTab) => void;
  counts: Record<TripDetailTab, number>;
}

export function TripDetailTabs({ active, onChange, counts }: TripDetailTabsProps) {
  return (
    <nav
      className="sticky top-0 z-10 flex gap-0.5 overflow-x-auto rounded-xl border bg-background p-0.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1 sm:p-1 [&::-webkit-scrollbar]:hidden"
      aria-label="Utazás szekciók"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex min-h-[var(--touch-target)] min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:min-h-9 sm:flex-none sm:gap-1.5 sm:px-4",
            active === tab.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
          )}
        >
          <span className="truncate">
            <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums sm:px-2 sm:text-xs",
              active === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {counts[tab.id]}
          </span>
        </button>
      ))}
    </nav>
  );
}

export function TripSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
