"use client";

import { Monogram } from "@/components/monogram";
import { cn } from "@/lib/utils";

interface ParticipantPickerProps {
  members: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

export function ParticipantPicker({
  members,
  selectedIds,
  onToggle,
  disabled,
  emptyMessage = "Előbb adj hozzá családtagot a Család oldalon.",
}: ParticipantPickerProps) {
  if (members.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const selected = selectedIds.includes(member.id);
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onToggle(member.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
              "inline-flex min-h-[var(--touch-target)] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors sm:min-h-0",
              "touch-manipulation active:scale-[0.98]",
              selected
                ? "border-primary/40 bg-primary/8 text-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <Monogram
              name={member.name}
              className={cn(
                "h-7 w-7",
                selected ? "ring-2 ring-primary/25" : "opacity-80"
              )}
            />
            <span className="max-w-[10rem] truncate text-sm font-medium">{member.name}</span>
            <span
              className={cn(
                "ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border border-muted-foreground/30 text-transparent"
              )}
              aria-hidden
            >
              {selected ? "✓" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
