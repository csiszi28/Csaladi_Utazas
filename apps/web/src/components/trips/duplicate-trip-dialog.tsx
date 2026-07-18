"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@csaladi-utazas/shared";
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
import { duplicateTrip } from "@/actions/trips";

interface DuplicateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTrip: {
    id: string;
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
}

export function DuplicateTripDialog({
  open,
  onOpenChange,
  sourceTrip,
}: DuplicateTripDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(`${sourceTrip.title} (másolat)`);
  const [startDate, setStartDate] = useState(formatDate(sourceTrip.startDate));
  const [endDate, setEndDate] = useState(formatDate(sourceTrip.endDate));
  const [copyPrograms, setCopyPrograms] = useState(true);
  const [copyAccommodations, setCopyAccommodations] = useState(true);
  const [copyIdeas, setCopyIdeas] = useState(true);
  const [copyBudget, setCopyBudget] = useState(true);
  const [shiftProgramDates, setShiftProgramDates] = useState(true);

  function handleStartChange(value: string) {
    setStartDate(value);
    if (endDate && value > endDate) setEndDate(value);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await duplicateTrip({
        sourceTripId: sourceTrip.id,
        title: title.trim(),
        startDate,
        endDate,
        copyPrograms,
        copyAccommodations,
        copyIdeas,
        copyBudget,
        shiftProgramDates,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Utazás másolva");
      onOpenChange(false);
      router.push(`/trips/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Utazás másolása</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sablonként másolja az utazást. A költségek és dokumentumok nem kerülnek át.
          </p>

          <div className="space-y-1.5">
            <Label>Új megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kezdő dátum</Label>
              <DatePicker value={startDate} onChange={handleStartChange} inDialog />
            </div>
            <div className="space-y-1.5">
              <Label>Záró dátum</Label>
              <DatePicker value={endDate} onChange={setEndDate} minDate={startDate || undefined} inDialog />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            {[
              ["copyPrograms", "Programok másolása", copyPrograms, setCopyPrograms],
              ["copyAccommodations", "Szállások másolása", copyAccommodations, setCopyAccommodations],
              ["copyIdeas", "Ötletek másolása", copyIdeas, setCopyIdeas],
              ["copyBudget", "Költségvetési limit másolása", copyBudget, setCopyBudget],
              ["shiftProgramDates", "Dátumok eltolása az új kezdő dátumhoz", shiftProgramDates, setShiftProgramDates],
            ].map(([key, label, checked, setter]) => (
              <label key={key as string} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input"
                  disabled={isPending}
                />
                <span>{label as string}</span>
              </label>
            ))}
          </div>
        </DialogBody>
        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenChange(false)} disabled={isPending}>
            Mégse
          </Button>
          <Button size="sm" className="w-full" onClick={handleSubmit} disabled={isPending || !title.trim()}>
            <Copy className="mr-2 h-4 w-4" />
            Másolás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
