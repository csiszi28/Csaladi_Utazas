"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DayPicker, type SelectSingleEventHandler } from "react-day-picker";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { formatDate } from "@csaladi-utazas/shared";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import "react-day-picker/style.css";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const MOBILE_QUERY = "(max-width: 767px)";

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

const calendarClassName = {
  base: "date-picker-calendar mx-auto w-full min-w-0 max-w-full",
  mobile: "[&_.rdp-nav]:mb-1 [&_.rdp-caption_label]:text-base touch-manipulation",
  desktop: "[&_.rdp-week]:min-h-9",
};

function DatePickerCalendar({
  mobile,
  month,
  onMonthChange,
  selected,
  onSelect,
  minDate,
  maxDate,
}: {
  mobile: boolean;
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: Date;
  onSelect: SelectSingleEventHandler;
  minDate?: string;
  maxDate?: string;
}) {
  return (
    <DayPicker
      mode="single"
      fixedWeeks
      showOutsideDays
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      locale={hu}
      formatters={
        mobile
          ? {
              formatWeekdayName: (date, _options, dateLib) =>
                dateLib?.format(date, "EEEEE") ?? format(date, "EEEEE", { locale: hu }),
            }
          : undefined
      }
      disabled={[
        ...(minDate ? [{ before: parseDisplayDate(minDate) }] : []),
        ...(maxDate ? [{ after: parseDisplayDate(maxDate) }] : []),
      ]}
      className={cn(calendarClassName.base, mobile ? calendarClassName.mobile : calendarClassName.desktop)}
    />
  );
}

function DatePickerTriggerButton({
  value,
  placeholder,
  className,
  onClick,
}: {
  value?: string;
  placeholder: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[var(--touch-target)] w-full justify-start text-left font-normal md:min-h-9",
        !value && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
      <span className="truncate">{value || placeholder}</span>
    </Button>
  );
}

function MobileDatePickerSheet({
  open,
  onOpenChange,
  calendar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[75]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed bottom-0 left-1/2 z-[80] flex max-h-[min(92dvh,100dvh)] w-[var(--dialog-max-width)] max-w-[var(--dialog-max-width)] -translate-x-1/2 flex-col overflow-hidden rounded-t-2xl border bg-background shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
          <DialogPrimitive.Title className="px-4 pb-2 pt-1 text-left text-base font-semibold">
            Dátum választása
          </DialogPrimitive.Title>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {calendar}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Válassz dátumot",
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const isMobile = useIsMobileLayout();
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => resolveDisplayMonth(value, minDate, maxDate));
  const selected = value ? parseDisplayDate(value) : undefined;

  React.useEffect(() => {
    if (open) {
      setMonth(resolveDisplayMonth(value, minDate, maxDate));
    }
  }, [open, value, minDate, maxDate]);

  const handleSelect: SelectSingleEventHandler = (date) => {
    if (date) {
      onChange(formatDate(date));
      setOpen(false);
    }
  };

  const calendar = (
    <DatePickerCalendar
      mobile={isMobile}
      month={month}
      onMonthChange={setMonth}
      selected={selected}
      onSelect={handleSelect}
      minDate={minDate}
      maxDate={maxDate}
    />
  );

  if (isMobile) {
    return (
      <>
        <DatePickerTriggerButton
          value={value}
          placeholder={placeholder}
          className={className}
          onClick={() => setOpen(true)}
        />
        <MobileDatePickerSheet open={open} onOpenChange={setOpen} calendar={calendar} />
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DatePickerTriggerButton
          value={value}
          placeholder={placeholder}
          className={className}
          onClick={() => setOpen(true)}
        />
      </PopoverTrigger>
      <PopoverContent className="z-[80] w-auto p-0" align="start" side="bottom" collisionPadding={16}>
        <div className="flex h-[22rem] flex-col overflow-hidden p-3">{calendar}</div>
      </PopoverContent>
    </Popover>
  );
}
