import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-dashed bg-muted/20 text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "mx-auto text-muted-foreground",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}
          aria-hidden
        />
      ) : null}
      <h3
        className={cn(
          "font-semibold tracking-tight",
          Icon ? (compact ? "mt-3" : "mt-4") : null,
          compact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? (
        <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          {children}
        </div>
      ) : null}
    </section>
  );
}
