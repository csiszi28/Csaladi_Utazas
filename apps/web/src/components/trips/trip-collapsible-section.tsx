"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripCollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function TripCollapsibleSection({
  title,
  count = 0,
  defaultOpen = false,
  action,
  children,
}: TripCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
          <span className="text-base font-semibold">{title}</span>
          {!open && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">
              {count} tétel
            </span>
          )}
        </button>
        {action && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
      <div className={cn("border-t px-4 py-4", !open && "hidden")}>{children}</div>
    </section>
  );
}
