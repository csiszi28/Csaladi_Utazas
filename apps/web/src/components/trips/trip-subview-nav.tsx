"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TripSubviewNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  count?: number;
  icon?: ReactNode;
}

interface TripSubviewNavProps {
  items: TripSubviewNavItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

/** Segmented view switcher — badge style matches TripFilterChips (Programok). */
export function TripSubviewNav({ items, active, onChange, ariaLabel }: TripSubviewNavProps) {
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
              "relative flex min-h-[var(--touch-target)] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium tracking-tight transition-[color,background-color,box-shadow] duration-200 touch-manipulation sm:min-h-9 sm:flex-none sm:px-3.5",
              isActive
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60 dark:bg-white/12 dark:text-white dark:ring-white/15"
                : "text-muted-foreground hover:text-foreground dark:hover:bg-white/[0.04] dark:hover:text-white/90"
            )}
          >
            {item.icon}
            <span className="truncate">
              <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
            {item.count != null ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-[var(--brand-accent)]/20 dark:text-[var(--brand-accent)]"
                    : "bg-background/80 text-muted-foreground dark:bg-white/8 dark:text-white/55"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
