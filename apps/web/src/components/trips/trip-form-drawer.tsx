"use client";

import { useState, useEffect, useTransition } from "react";
import { formatDate, CURRENCIES, CURRENCY_LABELS, formatAmountInput, parseAmountInput } from "@csaladi-utazas/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { TRIP_DIALOG_BTN_CLASS } from "./trip-section-styles";
import { createTrip, updateTrip } from "@/actions/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { ParticipantPicker } from "@/components/trips/participant-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TripFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: FamilyMemberRow[];
  onSaved?: () => void;
  trip?: {
    id: string;
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    budgetAmount?: number | null;
    budgetCurrency?: string;
    participants: { familyMember: { id: string; name: string } }[];
  };
}

export function TripFormDrawer({
  open,
  onOpenChange,
  members,
  onSaved,
  trip,
}: TripFormDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("HUF");

  useEffect(() => {
    if (!open) return;
    if (trip) {
      setTitle(trip.title);
      setDestination(trip.destination);
      setStartDate(formatDate(trip.startDate));
      setEndDate(formatDate(trip.endDate));
      setParticipantIds(trip.participants.map((p) => p.familyMember.id));
      setBudgetAmount(
        trip.budgetAmount != null ? formatAmountInput(String(Math.round(trip.budgetAmount))) : ""
      );
      setBudgetCurrency(trip.budgetCurrency ?? "HUF");
    } else {
      setTitle("");
      setDestination("");
      setStartDate("");
      setEndDate("");
      setParticipantIds(members[0] ? [members[0].id] : []);
      setBudgetAmount("");
      setBudgetCurrency("HUF");
    }
  }, [trip, open, members]);

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (endDate && value > endDate) setEndDate(value);
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      const parsedBudget = budgetAmount.trim() ? parseAmountInput(budgetAmount) : null;
      const data = {
        title,
        destination,
        startDate,
        endDate,
        participantIds,
        budgetAmount: parsedBudget && parsedBudget > 0 ? parsedBudget : null,
        budgetCurrency,
      };
      const result = trip
        ? await updateTrip({ id: trip.id, ...data })
        : await createTrip(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(trip ? "Utazás frissítve" : "Utazás létrehozva");
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{trip ? "Utazás szerkesztése" : "Új utazás"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. Horvátországi nyaralás" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label>Desztináció</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="pl. Dubrovnik" disabled={isPending} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kezdő dátum</Label>
              <DatePicker value={startDate} onChange={handleStartDateChange} inDialog />
            </div>
            <div className="space-y-1.5">
              <Label>Záró dátum</Label>
              <DatePicker value={endDate} onChange={setEndDate} minDate={startDate || undefined} inDialog />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Költségvetési limit (opcionális)</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(formatAmountInput(e.target.value))}
                placeholder="pl. 500000"
                inputMode="numeric"
                disabled={isPending}
              />
              <Select value={budgetCurrency} onValueChange={setBudgetCurrency} disabled={isPending}>
                <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              A terv vs. tény összehasonlításhoz használjuk. Üresen hagyva nincs limit.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Résztvevők</Label>
            <ParticipantPicker
              members={members}
              selectedIds={participantIds}
              onToggle={toggleParticipant}
              disabled={isPending}
            />
          </div>
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" className={TRIP_DIALOG_BTN_CLASS} onClick={() => onOpenChange(false)} disabled={isPending}>Mégse</Button>
          <Button className={TRIP_DIALOG_BTN_CLASS} onClick={handleSubmit} disabled={!participantIds.length || isPending}>Mentés</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
