import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  /** Compact bar without floating badge (e.g. per-person chips) */
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "success" | "warning" | "danger" | "brand" | "auto";
  /** Show floating % badge under the leading edge */
  showValue?: boolean;
}

function resolveTone(value: number, tone: ProgressBarProps["tone"]) {
  if (tone && tone !== "auto") return tone;
  if (value >= 100) return "success";
  if (value >= 70) return "brand";
  if (value >= 40) return "primary";
  if (value >= 20) return "warning";
  return "danger";
}

const FILL = {
  brand: "from-[#ffb866] via-[#f0a050] to-[#e8923a]",
  primary:
    "from-[#1a365d] via-[#2a4a7a] to-[#3d6bb3] dark:from-[#3d6bb3] dark:via-[#5a8fd4] dark:to-[#7eb0f0]",
  success: "from-emerald-500 via-emerald-400 to-teal-400",
  warning: "from-amber-500 via-orange-400 to-[#f0a050]",
  danger: "from-rose-500 via-rose-400 to-orange-400",
} as const;

const TIP = {
  brand: "bg-[#ffb866] shadow-[0_0_0_4px_rgba(255,184,102,0.28)]",
  primary: "bg-[#3d6bb3] shadow-[0_0_0_4px_rgba(61,107,179,0.28)]",
  success: "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.28)]",
  warning: "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.28)]",
  danger: "bg-rose-400 shadow-[0_0_0_4px_rgba(251,113,133,0.28)]",
} as const;

const BADGE = {
  brand: "bg-[#1a2744] text-[#ffb866]",
  primary: "bg-primary text-primary-foreground",
  success: "bg-emerald-600 text-white dark:bg-emerald-500",
  warning: "bg-amber-600 text-white",
  danger: "bg-rose-600 text-white",
} as const;

const TRACK_H = {
  sm: "h-2",
  md: "h-3",
  lg: "h-3.5",
} as const;

const TIP_SIZE = {
  sm: "h-2.5 w-2.5",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
} as const;

export function ProgressBar({
  value,
  className,
  size = "md",
  tone = "auto",
  showValue = size !== "sm",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const resolved = resolveTone(clamped, tone);
  const rounded = Math.round(clamped);
  const tipLeft = `clamp(0.5rem, ${clamped}%, calc(100% - 0.5rem))`;

  return (
    <div className={cn(showValue ? "space-y-2" : undefined, className)}>
      <div
        className={cn("relative", TRACK_H[size])}
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${rounded}%`}
      >
        {/* Soft meter track */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden rounded-full",
            "bg-muted/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] ring-1 ring-inset ring-black/5 dark:bg-white/10 dark:ring-white/10"
          )}
        >
          {/* Quarter ticks */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {[25, 50, 75].map((mark) => (
              <span
                key={mark}
                className="absolute top-0.5 bottom-0.5 w-px bg-foreground/10 dark:bg-white/20"
                style={{ left: `${mark}%` }}
              />
            ))}
          </div>

          {/* Fill */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out",
              FILL[resolved]
            )}
            style={{ width: `${clamped}%` }}
          >
            <div
              aria-hidden
              className="progress-bar-sheen absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            />
          </div>
        </div>

        {/* Leading tip orb — sits on the track centerline */}
        {clamped > 0 ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-[left] duration-500 ease-out dark:border-[#0b1e38]",
              TIP_SIZE[size],
              TIP[resolved]
            )}
            style={{ left: tipLeft }}
          />
        ) : null}
      </div>

      {showValue ? (
        <div className="relative h-5">
          <span
            className={cn(
              "absolute top-0 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm transition-[left] duration-500 ease-out sm:text-[11px]",
              BADGE[resolved]
            )}
            style={{ left: tipLeft }}
          >
            {rounded}%
          </span>
        </div>
      ) : null}
    </div>
  );
}
