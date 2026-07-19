"use client";

import { useEffect, useState, useTransition } from "react";
import { packingProgress, PACKING_PRESET_GROUPS } from "@csaladi-utazas/shared";
import { ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
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
  createPackingItemsBatch,
  deletePackingItem,
  updatePackingItem,
} from "@/actions/feature-pack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PackingItemRow {
  id: string;
  title: string;
  quantity: number;
  isPacked: boolean;
  assigneeFamilyMemberId: string | null;
  assignee?: { id: string; name: string } | null;
}

interface PackingListPanelProps {
  tripId: string;
  items: PackingItemRow[];
  participants: { id: string; name: string }[];
}

function normalizeItems(items: PackingItemRow[]): PackingItemRow[] {
  return items.map((item) => ({
    ...item,
    quantity: item.quantity ?? 1,
  }));
}

export function PackingListPanel({ tripId, items, participants }: PackingListPanelProps) {
  const [, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(() => normalizeItems(items));
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalItems(normalizeItems(items));
  }, [items]);

  const progress = packingProgress(localItems);
  const assignee = assigneeId
    ? participants.find((p) => p.id === assigneeId) ?? null
    : null;

  function clampQty(value: number) {
    return Math.min(99, Math.max(1, value));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const qty = clampQty(quantity);
    const optimistic: PackingItemRow = {
      id: tempId,
      title: trimmed,
      quantity: qty,
      isPacked: false,
      assigneeFamilyMemberId: assigneeId || null,
      assignee,
    };

    setLocalItems((prev) => [...prev, optimistic]);
    setTitle("");
    setQuantity(1);

    startTransition(async () => {
      const result = await createPackingItem({
        tripId,
        title: trimmed,
        quantity: qty,
        assigneeFamilyMemberId: assigneeId || null,
      });
      if (!result.success) {
        setLocalItems((prev) => prev.filter((item) => item.id !== tempId));
        toast.error(result.error);
        return;
      }
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, id: result.data.id, quantity: result.data.quantity }
            : item
        )
      );
    });
  }

  function togglePacked(item: PackingItemRow) {
    const nextPacked = !item.isPacked;
    setLocalItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isPacked: nextPacked } : row))
    );
    startTransition(async () => {
      const result = await updatePackingItem({ id: item.id, isPacked: nextPacked });
      if (!result.success) {
        setLocalItems((prev) =>
          prev.map((row) => (row.id === item.id ? { ...row, isPacked: item.isPacked } : row))
        );
        toast.error(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    const previous = localItems;
    setLocalItems((prev) => prev.filter((item) => item.id !== id));
    startTransition(async () => {
      const result = await deletePackingItem(id);
      if (!result.success) {
        setLocalItems(previous);
        toast.error(result.error);
      }
    });
  }

  function togglePreset(name: string) {
    setSelectedPresets((prev) => {
      if (prev[name] != null) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: quantity };
    });
  }

  function setPresetQty(name: string, value: number) {
    setSelectedPresets((prev) => {
      if (prev[name] == null) return prev;
      return { ...prev, [name]: clampQty(value) };
    });
  }

  function addSelectedPresets() {
    const entries = Object.entries(selectedPresets);
    if (entries.length === 0) return;

    const existingTitles = new Set(localItems.map((item) => item.title.toLowerCase()));
    const toAdd = entries.filter(([name]) => !existingTitles.has(name.toLowerCase()));
    if (toAdd.length === 0) {
      toast.message("Ezek a tételek már a listán vannak");
      setSelectedPresets({});
      return;
    }

    const optimistic = toAdd.map(([name, qty], index) => ({
      id: `temp-${crypto.randomUUID()}-${index}`,
      title: name,
      quantity: clampQty(qty),
      isPacked: false,
      assigneeFamilyMemberId: assigneeId || null,
      assignee,
    }));

    setLocalItems((prev) => [...prev, ...optimistic]);
    setSelectedPresets({});

    startTransition(async () => {
      const result = await createPackingItemsBatch({
        tripId,
        assigneeFamilyMemberId: assigneeId || null,
        items: optimistic.map((item) => ({ title: item.title, quantity: item.quantity })),
      });
      if (!result.success) {
        const tempIds = new Set(optimistic.map((item) => item.id));
        setLocalItems((prev) => prev.filter((item) => !tempIds.has(item.id)));
        toast.error(result.error);
        return;
      }
      setLocalItems((prev) => {
        const idMap = new Map(
          optimistic.map((item, index) => [item.id, result.data.ids[index]] as const)
        );
        return prev.map((item) => {
          const realId = idMap.get(item.id);
          return realId ? { ...item, id: realId } : item;
        });
      });
    });
  }

  const selectedCount = Object.keys(selectedPresets).length;

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

      <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setQuantity((q) => clampQty(q - 1))}
            aria-label="Kevesebb darab"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(clampQty(Number(e.target.value) || 1))}
            className="h-10 w-14 text-center tabular-nums"
            aria-label="Darabszám"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setQuantity((q) => clampQty(q + 1))}
            aria-label="Több darab"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Új tétel…"
          className="min-h-[var(--touch-target)] min-w-0 flex-1 sm:min-w-[12rem]"
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
        <Button type="submit" disabled={!title.trim()} className="min-h-[var(--touch-target)]">
          <Plus className="h-4 w-4" />
          Hozzáad
        </Button>
      </form>

      <div className="rounded-xl border">
        <button
          type="button"
          onClick={() => setPresetsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium"
        >
          <span>Gyorslista (sablonok)</span>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", presetsOpen && "rotate-180")}
          />
        </button>
        {presetsOpen ? (
          <div className="space-y-4 border-t px-3 py-3">
            {PACKING_PRESET_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((name) => {
                    const selected = selectedPresets[name] != null;
                    return (
                      <div key={name} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePreset(name)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "hover:bg-muted/60"
                          )}
                        >
                          {name}
                        </button>
                        {selected ? (
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={selectedPresets[name]}
                            onChange={(e) => setPresetQty(name, Number(e.target.value) || 1)}
                            className="h-8 w-12 px-1 text-center text-xs tabular-nums"
                            aria-label={`${name} darabszám`}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={addSelectedPresets}
              className="w-full sm:w-auto"
            >
              {selectedCount > 0
                ? `${selectedCount} kijelölt tétel hozzáadása`
                : "Válassz tételeket"}
            </Button>
          </div>
        ) : null}
      </div>

      {localItems.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Még nincs csomagolási tétel. Add hozzá kézzel, vagy válassz a gyorslistából.
        </p>
      ) : (
        <ul className="space-y-2">
          {localItems.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex min-h-[var(--touch-target)] items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                item.isPacked && "border-transparent bg-muted/50"
              )}
            >
              <button
                type="button"
                onClick={() => togglePacked(item)}
                disabled={item.id.startsWith("temp-")}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                  item.isPacked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/35 hover:border-primary/60"
                )}
                aria-label={item.isPacked ? "Kicsomagolva" : "Becsomagolva"}
              >
                {item.isPacked ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-[15px] font-medium leading-tight",
                      item.isPacked && "text-muted-foreground line-through decoration-muted-foreground/60"
                    )}
                  >
                    {item.title}
                  </p>
                  {item.quantity > 1 ? (
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums",
                        item.isPacked
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {item.quantity} db
                    </span>
                  ) : null}
                </div>
                {item.assignee?.name ? (
                  <p className="truncate text-xs text-muted-foreground">{item.assignee.name}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={item.id.startsWith("temp-")}
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
