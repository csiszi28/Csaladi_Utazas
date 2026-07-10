"use client";

import { cn } from "@/lib/utils";

export type TripDetailTab = "planning" | "finances" | "documents";

const TABS: { id: TripDetailTab; label: string }[] = [
  { id: "planning", label: "Tervezés" },
  { id: "finances", label: "Pénzügyek" },
  { id: "documents", label: "Dokumentumok" },
];

interface TripDetailTabsProps {
  active: TripDetailTab;
  onChange: (tab: TripDetailTab) => void;
  counts: Record<TripDetailTab, number>;
}

export function TripDetailTabs({ active, onChange, counts }: TripDetailTabsProps) {
  return (
    <nav
      className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border bg-muted/50 p-1 backdrop-blur-sm"
      aria-label="Utazás szekciók"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex min-h-[var(--touch-target)] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:min-h-9 sm:flex-none sm:px-4",
            active === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs tabular-nums",
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
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
