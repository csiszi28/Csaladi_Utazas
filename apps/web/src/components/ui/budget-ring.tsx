"use client";

import { cn } from "@/lib/utils";

interface BudgetRingProps {
  percent: number;
  status?: "ok" | "warning" | "over" | "none";
  size?: "sm" | "md" | "lg";
  label?: string;
  sublabel?: string;
  className?: string;
}

const SIZE = {
  sm: { box: 64, stroke: 6, text: "text-sm" },
  md: { box: 88, stroke: 7, text: "text-base" },
  lg: { box: 112, stroke: 8, text: "text-lg" },
} as const;

const STATUS_STROKE = {
  ok: "stroke-emerald-500",
  warning: "stroke-amber-500",
  over: "stroke-destructive",
  none: "stroke-primary",
} as const;

export function BudgetRing({
  percent,
  status = "ok",
  size = "md",
  label,
  sublabel,
  className,
}: BudgetRingProps) {
  const { box, stroke, text } = SIZE[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative shrink-0"
        style={{ width: box, height: box }}
        role="img"
        aria-label={`Költségvetés felhasználás: ${Math.round(percent)}%`}
      >
        <svg width={box} height={box} className="-rotate-90" aria-hidden>
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              "transition-[stroke-dashoffset] duration-500 ease-out",
              STATUS_STROKE[status]
            )}
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-semibold tabular-nums",
            text
          )}
        >
          {Math.round(percent)}%
        </span>
      </div>
      {(label || sublabel) && (
        <div className="min-w-0 space-y-0.5">
          {label ? <p className="text-sm font-medium leading-snug">{label}</p> : null}
          {sublabel ? (
            <p className="text-xs text-muted-foreground leading-snug">{sublabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
