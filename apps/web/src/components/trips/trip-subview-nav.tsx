"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TripSubviewNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  count: number;
  icon?: ReactNode;
}

interface TripSubviewNavProps {
  items: TripSubviewNavItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

export function TripSubviewNav({ items, active, onChange, ariaLabel }: TripSubviewNavProps) {
  return (
    <nav
      className="flex gap-0.5 overflow-x-auto rounded-xl border bg-muted/40 p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:inline-flex sm:w-auto [&::-webkit-scrollbar]:hidden"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex min-h-[var(--touch-target)] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:min-h-9 sm:flex-none",
            active === item.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.icon}
          <span className="truncate">
            <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums">
            {item.count}
          </span>
        </button>
      ))}
    </nav>
  );
}
