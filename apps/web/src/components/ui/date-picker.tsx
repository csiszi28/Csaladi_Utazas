"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { hu } from "date-fns/locale";
import { formatDate } from "@csaladi-utazas/shared";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "react-day-picker/style.css";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const CALENDAR_HEIGHT = "h-[22rem]";

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

export function DatePicker({
  value,
  onChange,
  placeholder = "Válassz dátumot",
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => resolveDisplayMonth(value, minDate, maxDate));
  const selected = value ? parseDisplayDate(value) : undefined;

  React.useEffect(() => {
    if (open) {
      setMonth(resolveDisplayMonth(value, minDate, maxDate));
    }
  }, [open, value, minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-auto p-0" align="start">
        <div className={cn(CALENDAR_HEIGHT, "flex flex-col overflow-hidden p-3")}>
          <DayPicker
            mode="single"
            fixedWeeks
            showOutsideDays
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            defaultMonth={month}
            onSelect={(date) => {
              if (date) {
                onChange(formatDate(date));
                setOpen(false);
              }
            }}
            locale={hu}
            disabled={[
              ...(minDate ? [{ before: parseDisplayDate(minDate) }] : []),
              ...(maxDate ? [{ after: parseDisplayDate(maxDate) }] : []),
            ]}
            className="mx-auto [&_.rdp-month]:w-full [&_.rdp-week]:min-h-9"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
