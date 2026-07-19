"use client";

import { useState, useEffect } from "react";
import {
  IDEA_AMOUNT_SCOPES,
  IDEA_AMOUNT_SCOPE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  formatAmountInput,
  parseAmountInput,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useCreateTripIdea, useUpdateTripIdea } from "@/hooks/use-ideas";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { ParticipantPicker } from "@/components/trips/participant-picker";

export interface AccommodationIdeaFormData {
  id: string;
  title: string;
  url: string | null;
  amount: number | null;
  currency: string;
  amountScope: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  interestedParticipantIds: string[];
}

interface AccommodationIdeaFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  participants: { id: string; name: string }[];
  onSaved?: () => void;
  idea?: AccommodationIdeaFormData;
}

export function AccommodationIdeaFormDrawer({
  open,
  onOpenChange,
  tripId,
  tripStartDate,
  tripEndDate,
  participants,
  onSaved,
  idea,
}: AccommodationIdeaFormDrawerProps) {
  const createMutation = useCreateTripIdea();
  const updateMutation = useUpdateTripIdea();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [amountScope, setAmountScope] = useState<string>("TOTAL");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (idea && open) {
      setTitle(idea.title);
      setUrl(idea.url ?? "");
      setAmountInput(idea.amount != null ? formatAmountInput(String(idea.amount)) : "");
      setCurrency(idea.currency);
      setAmountScope(idea.amountScope);
      setCheckInDate(idea.checkInDate ?? "");
      setCheckOutDate(idea.checkOutDate ?? "");
      setParticipantIds(idea.interestedParticipantIds);
    } else if (!idea && open) {
      setTitle("");
      setUrl("");
      setAmountInput("");
      setCurrency("HUF");
      setAmountScope("TOTAL");
      setCheckInDate(tripStartDate);
      setCheckOutDate(tripEndDate);
      setParticipantIds([]);
    }
  }, [idea, open, tripStartDate, tripEndDate]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    const trimmedAmount = amountInput.trim();
    const amount = trimmedAmount ? parseAmountInput(trimmedAmount) : null;

    const data = {
      tripId,
      title,
      url: url.trim() || null,
      amount,
      currency,
      amountScope,
      category: "ACCOMMODATION" as const,
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
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
      <DialogContent className="dialog-accommodation-idea-form">
        <DialogHeader>
          <DialogTitle>{idea ? "Szállás ötlet szerkesztése" : "Új szállás ötlet"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Bejelentkezés (tervezett)</Label>
              <DatePicker
                value={checkInDate}
                onChange={setCheckInDate}
                minDate={tripStartDate}
                maxDate={tripEndDate}
                inDialog
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kijelentkezés (tervezett)</Label>
              <DatePicker
                value={checkOutDate}
                onChange={setCheckOutDate}
                minDate={checkInDate || tripStartDate}
                maxDate={tripEndDate}
                inDialog
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Becsült összeg (opcionális)</Label>
              <Input
                value={amountInput}
                onChange={(e) => setAmountInput(formatAmountInput(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pénznem</Label>
              <Select value={currency} onValueChange={setCurrency}>
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
            <div className="space-y-1.5">
              <Label>Összeg értelmezése</Label>
              <Select value={amountScope} onValueChange={setAmountScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDEA_AMOUNT_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {IDEA_AMOUNT_SCOPE_LABELS[scope]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {participants.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kinek tetszik?</Label>
              <ParticipantPicker
                members={participants}
                selectedIds={participantIds}
                onToggle={toggleParticipant}
              />
            </div>
          )}

        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="outline" className={TRIP_DIALOG_BTN_CLASS}
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Mégse
          </Button>
          <Button
            className={TRIP_DIALOG_BTN_CLASS}
            onClick={handleSubmit}
            disabled={!title.trim() || !checkInDate || !checkOutDate || isPending}
          >
            {isPending ? "Mentés…" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
