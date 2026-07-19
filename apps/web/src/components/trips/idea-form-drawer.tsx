"use client";

import { useState, useEffect } from "react";
import {
  formatAmountInput,
  parseAmountInput,
  formatDate,
  formatTimeWhileTyping,
  normalizeTimeValue,
  type CostCategory,
} from "@csaladi-utazas/shared";
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
import { useCreateTripIdea, useUpdateTripIdea } from "@/hooks/use-ideas";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import {
  CostFieldsBlock,
  createEmptyCostFields,
  type CostFieldsValue,
} from "@/components/trips/cost-fields-block";
import { ParticipantPicker } from "@/components/trips/participant-picker";

export interface TripIdeaFormData {
  id: string;
  title: string;
  url: string | null;
  amount: number | null;
  currency: string;
  amountScope: string;
  category: string;
  date: Date | string | null;
  startTime: string | null;
  endTime: string | null;
  interestedParticipantIds: string[];
}

interface IdeaFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  participants: { id: string; name: string }[];
  onSaved?: () => void;
  idea?: TripIdeaFormData;
}

export function IdeaFormDrawer({
  open,
  onOpenChange,
  tripId,
  tripStartDate,
  tripEndDate,
  participants,
  onSaved,
  idea,
}: IdeaFormDrawerProps) {
  const createMutation = useCreateTripIdea();
  const updateMutation = useUpdateTripIdea();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [costFields, setCostFields] = useState<CostFieldsValue>(() =>
    createEmptyCostFields("OTHER")
  );
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (idea && open) {
      setTitle(idea.title);
      setUrl(idea.url ?? "");
      setDate(idea.date ? formatDate(idea.date) : "");
      setStartTime(idea.startTime ?? "");
      setEndTime(idea.endTime ?? "");
      setCostFields({
        amount: idea.amount != null ? formatAmountInput(String(idea.amount)) : "",
        currency: idea.currency,
        amountScope: idea.amountScope,
        category: idea.category,
        paidByFamilyMemberId: "",
      });
      setParticipantIds(idea.interestedParticipantIds);
    } else if (!idea && open) {
      setTitle("");
      setUrl("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setCostFields(createEmptyCostFields("OTHER"));
      setParticipantIds([]);
    }
  }, [idea, open]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleTimeChange(setter: (value: string) => void, value: string) {
    setter(formatTimeWhileTyping(value));
  }

  function handleTimeBlur(setter: (value: string) => void, value: string) {
    if (value) setter(normalizeTimeValue(value));
  }

  async function handleSubmit() {
    const trimmedAmount = costFields.amount.trim();
    const amount = trimmedAmount ? parseAmountInput(trimmedAmount) : null;

    const data = {
      tripId,
      title,
      url: url.trim() || null,
      date: date.trim() || null,
      startTime: startTime ? normalizeTimeValue(startTime) : null,
      endTime: endTime ? normalizeTimeValue(endTime) : null,
      amount,
      currency: costFields.currency,
      amountScope: costFields.amountScope,
      category: costFields.category as CostCategory,
      interestedParticipantIds: participantIds,
    };

    if (idea) {
      const result = await updateMutation.mutateAsync({ id: idea.id, ...data });
      if (!result.success) return;
    } else {
      const result = await createMutation.mutateAsync(data);
      if (!result.success) return;
    }

    onOpenChange(false);
    onSaved?.();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{idea ? "Ötlet szerkesztése" : "Új ötlet"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cím</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Dátum (opcionális)</Label>
            <p className="text-sm text-muted-foreground">
              Egy napot válassz az utazás ideje alatt ({tripStartDate} – {tripEndDate})
            </p>
            <DatePicker
              value={date}
              onChange={setDate}
              minDate={tripStartDate}
              maxDate={tripEndDate}
              placeholder={tripStartDate}
              dropdownWidth={380}
              inDialog
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kezdés</Label>
              <Input
                value={startTime}
                onChange={(e) => handleTimeChange(setStartTime, e.target.value)}
                onBlur={() => handleTimeBlur(setStartTime, startTime)}
                placeholder="0900"
                inputMode="numeric"
                maxLength={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Befejezés</Label>
              <Input
                value={endTime}
                onChange={(e) => handleTimeChange(setEndTime, e.target.value)}
                onBlur={() => handleTimeBlur(setEndTime, endTime)}
                placeholder="1200"
                inputMode="numeric"
                maxLength={5}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL (opcionális)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
            <UrlPreviewCard url={url} />
          </div>

          <CostFieldsBlock
            value={costFields}
            onChange={(patch) => setCostFields((prev) => ({ ...prev, ...patch }))}
            heading="Költség"
          />

          {participants.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kit érdekel?</Label>
              <ParticipantPicker
                members={participants}
                selectedIds={participantIds}
                onToggle={toggleParticipant}
              />
            </div>
          )}
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" className={TRIP_DIALOG_BTN_CLASS} onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button className={TRIP_DIALOG_BTN_CLASS} onClick={handleSubmit} disabled={!title.trim() || isPending}>
            Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
