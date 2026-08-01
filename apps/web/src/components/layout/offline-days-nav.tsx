"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  readOfflineDaySnapshots,
  type OfflineDaySnapshot,
} from "@/lib/offline-snapshots";

interface OfflineDaysNavProps {
  onNavigate?: () => void;
  compact?: boolean;
}

export function OfflineDaysNav({ onNavigate, compact }: OfflineDaysNavProps) {
  const [snapshots, setSnapshots] = useState<OfflineDaySnapshot[]>([]);

  useEffect(() => {
    function refresh() {
      setSnapshots(readOfflineDaySnapshots(5));
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (snapshots.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", compact && "pt-1")}>
      <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 dark:text-sky-100/40">
        Offline
      </p>
      {snapshots.map((snap) => (
        <Link
          key={`${snap.tripId}:${snap.day}`}
          href={`/~offline`}
          onClick={onNavigate}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-2xl px-2.5 font-medium transition-[color,background-color,transform] duration-200 touch-manipulation",
            "min-h-[var(--touch-target)] text-sm",
            "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
            "dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white",
            "active:scale-[0.98]"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground ring-1 ring-border dark:bg-white/8 dark:text-sky-100/80 dark:ring-white/10">
            <WifiOff className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{snap.tripTitle}</span>
            <span className="block truncate text-[11px] font-normal opacity-70">
              {snap.day}
              {snap.items.length > 0 ? ` · ${snap.items.length} tétel` : ""}
            </span>
          </span>
          <span className="sr-only">
            <CalendarDays />
          </span>
        </Link>
      ))}
      {snapshots.length >= 5 ? (
        <Link
          href="/~offline"
          onClick={onNavigate}
          className="block px-2.5 py-1 text-xs text-muted-foreground underline-offset-2 hover:underline dark:text-white/50"
        >
          Összes offline nap
        </Link>
      ) : null}
    </div>
  );
}
