"use client";

import {
  BedDouble,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TripDetailTab =
  | "overview"
  | "planning"
  | "accommodations"
  | "finances"
  | "documents"
  | "people";

const TABS: {
  id: TripDetailTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "Áttekintés",
    icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
  },
  {
    id: "planning",
    label: "Programok",
    icon: <CalendarDays className="h-4 w-4 shrink-0" />,
  },
  {
    id: "accommodations",
    label: "Szállás",
    icon: <BedDouble className="h-4 w-4 shrink-0" />,
  },
  {
    id: "finances",
    label: "Pénzügyek",
    icon: <Wallet className="h-4 w-4 shrink-0" />,
  },
  {
    id: "documents",
    label: "Dokumentumok",
    icon: <FileText className="h-4 w-4 shrink-0" />,
  },
  {
    id: "people",
    label: "Résztvevők",
    icon: <Users className="h-4 w-4 shrink-0" />,
  },
];

export const TRIP_DETAIL_TAB_IDS = TABS.map((t) => t.id);

interface TripDetailTabsProps {
  active: TripDetailTab;
  onChange: (tab: TripDetailTab) => void;
  counts: Partial<Record<TripDetailTab, number>>;
}

export function TripDetailTabs({ active, onChange, counts }: TripDetailTabsProps) {
  return (
    <>
      {/* Mobile: full-width section picker — 6 pills don't fit legibly */}
      <div className="sticky top-0 z-10 sm:hidden">
        <label className="sr-only" htmlFor="trip-section-select">
          Utazás szekció
        </label>
        <Select value={active} onValueChange={(value) => onChange(value as TripDetailTab)}>
          <SelectTrigger
            id="trip-section-select"
            className="h-12 w-full rounded-xl border bg-background px-3 text-base shadow-sm"
          >
            <SelectValue placeholder="Szekció választása" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {TABS.map((tab) => {
              const count = counts[tab.id];
              return (
                <SelectItem key={tab.id} value={tab.id} className="py-3">
                  <span className="flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                    {count != null && (
                      <span className="text-xs tabular-nums text-muted-foreground">({count})</span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop / tablet: horizontal tabs */}
      <nav
        className="sticky top-0 z-10 hidden gap-1 overflow-x-auto rounded-xl border bg-background p-1 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
        aria-label="Utazás szekciók"
      >
        {TABS.map((tab) => {
          const count = counts[tab.id];
          const showCount = count != null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors md:flex-none",
                active === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              )}
            >
              <span className="hidden lg:inline">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              {showCount && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                    active === tab.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
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

/** Lightweight filter chips — one nav level instead of nested tab bars. */
export function TripFilterChips<T extends string>({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: { id: T; label: string; shortLabel?: string; count: number }[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "min-h-[var(--touch-target)] shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:min-h-9 sm:py-1.5",
            active === item.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:bg-accent"
          )}
        >
          {item.label}
          <span className="ml-1.5 tabular-nums opacity-80">({item.count})</span>
        </button>
      ))}
    </nav>
  );
}
