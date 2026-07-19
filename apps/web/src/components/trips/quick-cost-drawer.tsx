"use client";

import { useEffect, useState } from "react";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  formatAmountInput,
  parseAmountInput,
  type CostCategory,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { TRIP_DIALOG_BTN_CLASS } from "./trip-section-styles";
import { createQuickCost } from "@/actions/costs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface QuickCostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  participantOptions: { id: string; name: string }[];
  onSaved?: () => void;
}

export function QuickCostDrawer({
  open,
  onOpenChange,
  tripId,
  participantOptions,
  onSaved,
}: QuickCostDrawerProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [category, setCategory] = useState<CostCategory>("OTHER");
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCurrency("HUF");
    setCategory("OTHER");
    setTitle("");
    setPaidBy(participantOptions[0]?.id ?? "");
  }, [open, participantOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(amount);
    if (parsed == null || parsed <= 0) {
      toast.error("Adj meg érvényes összeget");
      return;
    }
    setPending(true);
    try {
      const result = await createQuickCost({
        tripId,
        amount: parsed,
        currency: currency as (typeof CURRENCIES)[number],
        category,
        title: title.trim() || "Költség",
        paidByFamilyMemberId: paidBy || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Költség rögzítve");
      onOpenChange(false);
      onSaved?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gyors költség</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Összeg</Label>
                <Input
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  required
                  className="min-h-[var(--touch-target)] text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Pénznem</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="min-h-[var(--touch-target)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CURRENCY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kategória</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CostCategory)}>
                <SelectTrigger className="min-h-[var(--touch-target)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COST_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ki fizette?</Label>
              <Select value={paidBy || "__none"} onValueChange={(v) => setPaidBy(v === "__none" ? "" : v)}>
                <SelectTrigger className="min-h-[var(--touch-target)]">
                  <SelectValue placeholder="Válassz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nincs megadva</SelectItem>
                  {participantOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Megnevezés (opcionális)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Költség"
                className="min-h-[var(--touch-target)]"
              />
            </div>
          </DialogBody>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className={TRIP_DIALOG_BTN_CLASS}
              onClick={() => onOpenChange(false)}
            >
              Mégse
            </Button>
            <Button type="submit" className={TRIP_DIALOG_BTN_CLASS} disabled={pending}>
              {pending ? "Mentés…" : "Rögzítés"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
