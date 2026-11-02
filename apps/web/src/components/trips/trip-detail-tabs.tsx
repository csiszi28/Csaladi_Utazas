"use client";

import { useEffect, useRef } from "react";
import {
  BedDouble,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TripDetailTab =
  | "overview"
  | "transport"
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
    id: "transport",
    label: "Közlekedés",
    icon: <Plane className="h-4 w-4 shrink-0" />,
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
  const railRef = useRef<HTMLElement>(null);

  // Az aktív fül mindig látszódjon a görgethető sávban
  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <>
      {/* Mobil + keskeny tablet: vízszintesen görgethető fülsáv */}
      <nav
        ref={railRef}
        role="tablist"
        aria-label="Utazás szekciók"
        className="sticky top-0 z-10 -mx-[var(--app-content-padding)] flex gap-1.5 overflow-x-auto bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-[var(--app-content-padding)] py-1.5 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => {
          const count = counts[tab.id];
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {count != null ? (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
                    isActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Large screens: content-sized tabs, evenly spaced across the bar */}
      <nav
        className="sticky top-0 z-10 hidden w-full justify-between gap-1 rounded-xl border bg-card p-1 shadow-sm lg:flex"
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
                "flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                active === tab.id
                  ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {showCount && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums",
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** Segmented filter rail — full-width on mobile, compact on desktop. */
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
      className="flex w-full gap-0.5 overflow-x-auto rounded-2xl border border-border/70 bg-muted/35 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none [-ms-overflow-style:none] [scrollbar-width:none] sm:w-auto sm:inline-flex [&::-webkit-scrollbar]:hidden"
      aria-label={ariaLabel}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex min-h-[var(--touch-target)] min-w-fit flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium tracking-tight transition-[color,background-color,box-shadow] duration-200 touch-manipulation sm:min-h-9 sm:flex-none sm:px-3.5",
              isActive
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/12 dark:text-white dark:ring-white/15"
                : "text-muted-foreground hover:text-foreground dark:hover:bg-white/[0.04] dark:hover:text-white/90"
            )}
          >
            <span className="whitespace-nowrap">
              <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
            <span
              className={cn(
                "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-[var(--brand-accent)]/20 dark:text-[var(--brand-accent)]"
                  : "bg-background/80 text-muted-foreground dark:bg-white/8 dark:text-white/55"
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
