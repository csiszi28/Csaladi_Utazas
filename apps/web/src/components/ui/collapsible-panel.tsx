"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
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
  badge,
  actions,
  alwaysVisible,
  children,
  className,
  headerClassName,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className={cn("flex items-start gap-2 p-3 sm:p-4", headerClassName)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold leading-tight">{title}</span>
              {badge}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </button>
        {actions && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
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
