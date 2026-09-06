"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

/** Kompakt be/ki — h-7, egységes a form kontrollokkal (nem nagyobb inputnál). */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group relative inline-flex h-7 w-12 shrink-0 items-center rounded-md border p-0.5",
        "transition-[background-color,border-color] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 flex w-1/2 items-center justify-center text-[9px] font-bold uppercase tracking-wide transition-opacity",
          checked ? "left-0 text-primary-foreground opacity-100" : "left-0 opacity-0"
        )}
      >
        Be
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 flex w-1/2 items-center justify-center text-[9px] font-bold uppercase tracking-wide transition-opacity",
          checked ? "right-0 opacity-0" : "right-0 text-foreground opacity-100"
        )}
      >
        Ki
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none relative z-[1] block h-5 w-5 rounded-sm bg-white shadow-sm",
          "ring-1 ring-black/5 transition-transform duration-150 ease-out",
          checked ? "translate-x-[1.35rem]" : "translate-x-0"
        )}
      />
    </button>
  );
}
