"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PhotoLightboxItem {
  id: string;
  fileName: string;
  url?: string;
  caption?: string;
}

interface PhotoLightboxProps {
  items: PhotoLightboxItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function PhotoLightbox({ items, index, onIndexChange }: PhotoLightboxProps) {
  const touchStartX = useRef<number | null>(null);
  const open = index != null && items.length > 0;
  const safeIndex = open ? Math.min(index, items.length - 1) : null;
  const active = safeIndex != null ? items[safeIndex] : undefined;
  const canGoPrev = safeIndex != null && safeIndex > 0;
  const canGoNext = safeIndex != null && safeIndex < items.length - 1;

  const goPrev = useCallback(() => {
    if (safeIndex == null || safeIndex <= 0) return;
    onIndexChange(safeIndex - 1);
  }, [onIndexChange, safeIndex]);

  const goNext = useCallback(() => {
    if (safeIndex == null || safeIndex >= items.length - 1) return;
    onIndexChange(safeIndex + 1);
  }, [items.length, onIndexChange, safeIndex]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onIndexChange(null);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goPrev, goNext, onIndexChange]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null) return;

    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 56) return;

    if (deltaX < 0) goNext();
    else goPrev();
  }

  if (!open || !active || safeIndex == null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label="Fotó megtekintése"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{active.fileName}</p>
          {active.caption ? (
            <p className="truncate text-xs text-white/70">{active.caption}</p>
          ) : null}
          {items.length > 1 ? (
            <p className="text-xs tabular-nums text-white/70">
              {safeIndex + 1}/{items.length}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => onIndexChange(null)}
          aria-label="Bezárás"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-14">
        {items.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "absolute left-2 z-10 h-11 w-11 shadow-md sm:left-3",
                !canGoPrev && "pointer-events-none opacity-30"
              )}
              disabled={!canGoPrev}
              onClick={goPrev}
              aria-label="Előző fotó"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn(
                "absolute right-2 z-10 h-11 w-11 shadow-md sm:right-3",
                !canGoNext && "pointer-events-none opacity-30"
              )}
              disabled={!canGoNext}
              onClick={goNext}
              aria-label="Következő fotó"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        ) : null}

        {active.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.url}
            alt={active.fileName}
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <p className="text-sm text-white/70">Betöltés…</p>
        )}
      </div>
    </div>
  );
}
