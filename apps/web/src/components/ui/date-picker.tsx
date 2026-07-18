"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { DayPicker, type Modifiers, type WeekProps } from "react-day-picker";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { formatDate } from "@csaladi-utazas/shared";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { registerDatePickerOpenChange } from "@/lib/dialog-outside-guard";
import "react-day-picker/style.css";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  /** Dialógusban használva – a panel a body-ra portálva jelenik meg a dialógus felett */
  inDialog?: boolean;
  /** Desktop naptár szélessége (px). Mobilon mindig a mező szélessége. */
  dropdownWidth?: number;
}

const MOBILE_QUERY = "(max-width: 767px)";
const PANEL_Z_INDEX = 200;
const PANEL_ESTIMATED_HEIGHT = 380;
const DEFAULT_DESKTOP_DROPDOWN_WIDTH = 380;

let activeDatePickerId: string | null = null;
const datePickerCloseHandlers = new Map<string, () => void>();

function closeOtherDatePickers(exceptId: string) {
  const otherId = activeDatePickerId;
  if (!otherId || otherId === exceptId) return;
  queueMicrotask(() => {
    datePickerCloseHandlers.get(otherId)?.();
  });
}

function useDatePickerOpen(pickerId: string) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    datePickerCloseHandlers.set(pickerId, () => setOpen(false));
    return () => {
      datePickerCloseHandlers.delete(pickerId);
      if (activeDatePickerId === pickerId) {
        activeDatePickerId = null;
      }
    };
  }, [pickerId]);

  const setOpenExclusive = React.useCallback(
    (next: boolean) => {
      if (next) {
        closeOtherDatePickers(pickerId);
        activeDatePickerId = pickerId;
      } else if (activeDatePickerId === pickerId) {
        activeDatePickerId = null;
      }
      registerDatePickerOpenChange(next);
      setOpen(next);
    },
    [pickerId]
  );

  const toggle = React.useCallback(() => {
    setOpen((current) => {
      const next = !current;
      if (next) {
        closeOtherDatePickers(pickerId);
        activeDatePickerId = pickerId;
      } else if (activeDatePickerId === pickerId) {
        activeDatePickerId = null;
      }
      registerDatePickerOpenChange(next);
      return next;
    });
  }, [pickerId]);

  const close = React.useCallback(() => {
    setOpenExclusive(false);
  }, [setOpenExclusive]);

  return { open, toggle, close };
}

function useIsMobileLayout() {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", onStoreChange);
      window.addEventListener("resize", onStoreChange);
      return () => {
        mq.removeEventListener("change", onStoreChange);
        window.removeEventListener("resize", onStoreChange);
      };
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

function parseDisplayDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

function resolveDisplayMonth(value?: string, minDate?: string, maxDate?: string): Date {
  if (value) return parseDisplayDate(value);
  const today = new Date();
  if (minDate && maxDate) {
    const min = parseDisplayDate(minDate);
    const max = parseDisplayDate(maxDate);
    if (today < min) return min;
    if (today > max) return max;
    return today;
  }
  if (minDate) return parseDisplayDate(minDate);
  return today;
}

function isEventInsideDatePicker(event: Event, anchor: HTMLElement | null, panel: HTMLElement | null) {
  const path = event.composedPath();
  if (anchor && path.includes(anchor)) return true;
  if (panel && path.includes(panel)) return true;
  return path.some(
    (node) => node instanceof Element && node.closest("[data-date-picker-panel]") != null
  );
}

const calendarClassName = {
  base: "date-picker-calendar w-full min-w-0",
  mobile:
    "[&_.rdp-nav]:mb-2 [&_.rdp-caption_label]:text-base [&_.rdp-weekday]:text-sm [&_.rdp-weekday]:font-medium touch-manipulation",
  desktop:
    "[&_.rdp-nav]:mb-3 [&_.rdp-caption_label]:text-lg [&_.rdp-caption_label]:font-semibold [&_.rdp-weekday]:text-sm [&_.rdp-weekday]:font-semibold",
};

function MonthWeekRow({ week, children, ...trProps }: WeekProps) {
  const hasCurrentMonthDay = week.days.some((day) => !day.outside);
  if (!hasCurrentMonthDay) {
    return <tr {...trProps} className={cn(trProps.className, "hidden")} aria-hidden />;
  }
  return <tr {...trProps}>{children}</tr>;
}

function usePanelPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLDivElement | null>,
  isMobile: boolean,
  dropdownWidth?: number
) {
  const [position, setPosition] = React.useState<React.CSSProperties | null>(null);

  React.useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const useFixedWidth = !isMobile && dropdownWidth != null;
      const width = useFixedWidth ? dropdownWidth : rect.width;
      const left = rect.left;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < PANEL_ESTIMATED_HEIGHT + 8 && rect.top > spaceBelow;

      setPosition({
        position: "fixed",
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
        width,
        zIndex: PANEL_Z_INDEX,
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, isMobile, dropdownWidth, anchorRef]);

  return position;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Válassz dátumot",
  className,
  minDate,
  maxDate,
  dropdownWidth,
}: DatePickerProps) {
  const isMobile = useIsMobileLayout();
  const pickerId = React.useId();
  const { open, toggle, close } = useDatePickerOpen(pickerId);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const ignoreOutsideUntilRef = React.useRef(0);
  const [mounted, setMounted] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => resolveDisplayMonth(value, minDate, maxDate));
  const selected = value ? parseDisplayDate(value) : undefined;
  const position = usePanelPosition(
    open,
    anchorRef,
    isMobile,
    dropdownWidth ?? DEFAULT_DESKTOP_DROPDOWN_WIDTH
  );

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      setMonth(resolveDisplayMonth(value, minDate, maxDate));
    }
  }, [open, value, minDate, maxDate]);

  React.useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (Date.now() < ignoreOutsideUntilRef.current) return;
      if (isEventInsideDatePicker(event, anchorRef.current, panelRef.current)) return;
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const pickDay = React.useCallback(
    (nextSelected: Date | undefined, triggerDate: Date, modifiers: Modifiers) => {
      if (modifiers.disabled) return;
      const chosen = nextSelected ?? triggerDate;
      onChange(formatDate(chosen));
      ignoreOutsideUntilRef.current = Date.now() + 400;
      queueMicrotask(() => close());
    },
    [onChange, close]
  );

  const handleToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      ignoreOutsideUntilRef.current = Date.now() + 300;
      toggle();
    },
    [toggle]
  );

  const panel =
    open && position ? (
      <div
        ref={panelRef}
        data-date-picker-panel=""
        className="pointer-events-auto rounded-lg border bg-popover text-popover-foreground shadow-lg"
        style={position}
      >
        <div className="p-3 sm:p-4">
          <DayPicker
            mode="single"
            showOutsideDays
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={pickDay}
            locale={hu}
            components={{
              Week: MonthWeekRow,
            }}
            formatters={{
              formatWeekdayName: (date, _options, dateLib) =>
                dateLib?.format(date, "EEE") ?? format(date, "EEE", { locale: hu }),
            }}
            disabled={[
              ...(minDate ? [{ before: parseDisplayDate(minDate) }] : []),
              ...(maxDate ? [{ after: parseDisplayDate(maxDate) }] : []),
            ]}
            className={cn(
              calendarClassName.base,
              isMobile ? calendarClassName.mobile : calendarClassName.desktop
            )}
          />
        </div>
      </div>
    ) : null;

  return (
    <div ref={anchorRef} className="relative w-full">
      <Button
        variant="outline"
        type="button"
        onClick={handleToggle}
        className={cn(
          "min-h-[var(--touch-target)] w-full justify-start text-left text-base font-normal md:min-h-9",
          !value && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{value || placeholder}</span>
      </Button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
