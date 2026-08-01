"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDate, parseDate } from "@csaladi-utazas/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { updateProgram } from "@/actions/programs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineProgramTitleProps {
  tripId: string;
  program: {
    id: string;
    title: string;
    date: Date | string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    url?: string | null;
    participants: { familyMember: { id: string } }[];
    ideaId?: string | null;
  };
  canEdit: boolean;
  onSaved: () => void;
  className?: string;
}

export function InlineProgramTitle({
  tripId,
  program,
  canEdit,
  onSaved,
  className,
}: InlineProgramTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(program.title);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (!canEdit) return;
    setValue(program.title);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function cancel() {
    setValue(program.title);
    setEditing(false);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === program.title) {
      cancel();
      return;
    }

    startTransition(async () => {
      const result = await updateProgram({
        id: program.id,
        tripId,
        title: trimmed,
        date: formatDate(program.date),
        startTime: program.startTime ?? null,
        endTime: program.endTime ?? null,
        location: program.location ?? null,
        url: program.url ?? null,
        participantIds: program.participants.map((p) => p.familyMember.id),
        ideaId: program.ideaId ?? null,
      });
      if (!result.success) {
        toast.error(result.error);
        setValue(program.title);
      } else {
        toast.success("Cím frissítve");
        onSaved();
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          startEdit();
        }}
        disabled={!canEdit}
        className={cn(
          "max-w-full truncate text-left text-base font-semibold leading-snug",
          canEdit &&
            "rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        title={canEdit ? "Koppints a szerkesztéshez" : undefined}
      >
        {program.title}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      className={cn(
        "w-full min-w-0 rounded-md border bg-background px-2 py-1 text-base font-semibold outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      aria-label="Program címe"
    />
  );
}

interface ProgramDayShiftProps {
  tripId: string;
  program: InlineProgramTitleProps["program"];
  tripStartDate: string | Date;
  tripEndDate: string | Date;
  canEdit: boolean;
  onSaved: () => void;
}

export function ProgramDayShift({
  tripId,
  program,
  tripStartDate,
  tripEndDate,
  canEdit,
  onSaved,
}: ProgramDayShiftProps) {
  const [pending, startTransition] = useTransition();
  if (!canEdit) return null;

  const current = parseDate(formatDate(program.date));
  const start = parseDate(formatDate(tripStartDate));
  const end = parseDate(formatDate(tripEndDate));

  function shift(delta: number) {
    const next = new Date(current);
    next.setDate(next.getDate() + delta);
    next.setHours(0, 0, 0, 0);
    if (next < start || next > end) {
      toast.message("Az utazás időtartamán belül kell maradnia");
      return;
    }

    startTransition(async () => {
      const result = await updateProgram({
        id: program.id,
        tripId,
        title: program.title,
        date: formatDate(next),
        startTime: program.startTime ?? null,
        endTime: program.endTime ?? null,
        location: program.location ?? null,
        url: program.url ?? null,
        participantIds: program.participants.map((p) => p.familyMember.id),
        ideaId: program.ideaId ?? null,
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(`Áthelyezve: ${formatDate(next)}`);
        onSaved();
      }
    });
  }

  const atStart = formatDate(current) === formatDate(start);
  const atEnd = formatDate(current) === formatDate(end);

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={pending || atStart}
        onClick={() => shift(-1)}
        aria-label="Előző napra"
        title="Előző napra"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9"
        disabled={pending || atEnd}
        onClick={() => shift(1)}
        aria-label="Következő napra"
        title="Következő napra"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
