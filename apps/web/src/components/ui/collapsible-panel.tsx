"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  /** Növelése kívülről kinyitja a panelt */
  openSignal?: number;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  /** Mindig látható tartalom a fejléc alatt (pl. URL előnézet kártya) */
  alwaysVisible?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CollapsiblePanel({
  title,
  subtitle,
  defaultOpen = false,
  openSignal,
  badge,
  actions,
  alwaysVisible,
  children,
  className,
  headerClassName,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (openSignal !== undefined && openSignal > 0) {
      setOpen(true);
    }
  }, [openSignal]);

  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className={cn("p-3 sm:p-4", headerClassName)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60"
          >
            <ChevronDown
              className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
            />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold leading-snug">{title}</span>
              {badge}
            </div>
          </button>
          {actions && (
            <div
              className="flex shrink-0 items-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
        {subtitle && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 block w-full pl-11 text-left text-sm text-muted-foreground sm:pl-12"
          >
            {subtitle}
          </button>
        )}
      </div>
      {alwaysVisible && (
        <div className="border-t px-3 py-3 sm:px-4">{alwaysVisible}</div>
      )}
      <div className={cn("border-t px-3 pb-3 pt-3 sm:px-4 sm:pb-4", !open && "hidden")}>
        {children}
      </div>
    </section>
  );
}
