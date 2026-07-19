"use client";

import { useState, useTransition } from "react";
import { packingProgress } from "@csaladi-utazas/shared";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPackingItem,
  deletePackingItem,
  updatePackingItem,
} from "@/actions/feature-pack";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PackingItemRow {
  id: string;
  title: string;
  isPacked: boolean;
  assigneeFamilyMemberId: string | null;
  assignee?: { id: string; name: string } | null;
}

interface PackingListPanelProps {
  tripId: string;
  items: PackingItemRow[];
  participants: { id: string; name: string }[];
}

export function PackingListPanel({ tripId, items, participants }: PackingListPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const progress = packingProgress(items);

  function refresh() {
    router.refresh();
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createPackingItem({
        tripId,
        title: title.trim(),
        assigneeFamilyMemberId: assigneeId || null,
      });
      if (!result.success) toast.error(result.error);
      else {
        setTitle("");
        setAssigneeId("");
        refresh();
      }
    });
  }

  function togglePacked(item: PackingItemRow) {
    startTransition(async () => {
      const result = await updatePackingItem({ id: item.id, isPacked: !item.isPacked });
      if (!result.success) toast.error(result.error);
      else refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePackingItem(id);
      if (!result.success) toast.error(result.error);
      else refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Csomagolási lista</span>
          <span className="text-muted-foreground">
            {progress.packed}/{progress.total} · {progress.percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Új tétel…"
          className="min-h-[var(--touch-target)] flex-1"
        />
        <Select value={assigneeId || "__all"} onValueChange={(v) => setAssigneeId(v === "__all" ? "" : v)}>
          <SelectTrigger className="min-h-[var(--touch-target)] sm:w-40">
            <SelectValue placeholder="Ki viszi?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Közös</SelectItem>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={pending || !title.trim()} className="min-h-[var(--touch-target)]">
          <Plus className="h-4 w-4" />
          Hozzáad
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Még nincs csomagolási tétel. Add hozzá, amit vinni kell.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex min-h-[var(--touch-target)] items-center gap-3 rounded-xl border px-3 py-2",
                item.isPacked && "bg-muted/40 opacity-70"
              )}
            >
              <button
                type="button"
                onClick={() => togglePacked(item)}
                disabled={pending}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2",
                  item.isPacked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
                aria-label={item.isPacked ? "Kicsomagolva" : "Becsomagolva"}
              >
                {item.isPacked ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", item.isPacked && "line-through")}>{item.title}</p>
                {item.assignee?.name ? (
                  <p className="text-xs text-muted-foreground">{item.assignee.name}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                disabled={pending}
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
