"use client";

import { useState, useEffect } from "react";
import {
  formatDate,
  formatAmountInput,
  parseAmountInput,
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
import { useCreateAccommodation, useUpdateAccommodation } from "@/hooks/use-accommodations";
import { useCreateCost, useUpdateCost } from "@/hooks/use-costs";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import {
  CostFieldsBlock,
  createEmptyCostFields,
  type CostFieldsValue,
} from "@/components/trips/cost-fields-block";

export interface AccommodationIdeaOption {
  id: string;
  title: string;
  url: string | null;
  amount: number | null;
  currency: string;
  amountScope: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  interests: { familyMember: { id: string } }[];
}

interface AccommodationLinkedCost {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountScope: string;
  category: string;
  paidByFamilyMemberId: string | null;
}

interface AccommodationFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  participantOptions: { id: string; name: string }[];
  ideaOptions?: AccommodationIdeaOption[];
  onSaved?: () => void;
  defaultIdeaId?: string;
  accommodation?: {
    id: string;
    title: string;
    checkIn: Date;
    checkOut: Date;
    location: string | null;
    url: string | null;
    note: string | null;
    participants: { familyMember: { id: string } }[];
    costs?: AccommodationLinkedCost[];
  };
}

function pickPrimaryAccommodationCost(
  costs: AccommodationLinkedCost[] | undefined
): AccommodationLinkedCost | null {
  if (!costs?.length) return null;
  return costs.find((c) => c.category === "ACCOMMODATION") ?? costs[0] ?? null;
}

function costFieldsFromLinked(cost: AccommodationLinkedCost): CostFieldsValue {
  return {
    amount: formatAmountInput(String(Math.round(cost.amount))),
    currency: cost.currency,
    amountScope: cost.amountScope,
    category: cost.category,
    paidByFamilyMemberId: cost.paidByFamilyMemberId ?? "",
  };
}

export function AccommodationFormDrawer({
  open,
  onOpenChange,
  tripId,
  tripStartDate,
  tripEndDate,
  participantOptions,
  ideaOptions = [],
  onSaved,
  defaultIdeaId,
  accommodation,
}: AccommodationFormDrawerProps) {
  const createMutation = useCreateAccommodation();
  const updateMutation = useUpdateAccommodation();
  const createCostMutation = useCreateCost();
  const updateCostMutation = useUpdateCost();

  const [title, setTitle] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [linkedCostId, setLinkedCostId] = useState<string | null>(null);
  const [costFields, setCostFields] = useState<CostFieldsValue>(() =>
    createEmptyCostFields("ACCOMMODATION")
  );

  const isConvertMode = !accommodation && Boolean(defaultIdeaId);

  useEffect(() => {
    if (accommodation && open) {
      setTitle(accommodation.title);
      setCheckIn(formatDate(accommodation.checkIn));
      setCheckOut(formatDate(accommodation.checkOut));
      setLocation(accommodation.location ?? "");
      setUrl(accommodation.url ?? "");
      setNote(accommodation.note ?? "");
      setParticipantIds(accommodation.participants.map((p) => p.familyMember.id));
      setSelectedIdeaId("");
      const linked = pickPrimaryAccommodationCost(accommodation.costs);
      setLinkedCostId(linked?.id ?? null);
      setCostFields(linked ? costFieldsFromLinked(linked) : createEmptyCostFields("ACCOMMODATION"));
    } else if (!accommodation && open) {
      setTitle("");
      setCheckIn(tripStartDate);
      setCheckOut(tripEndDate);
      setLocation("");
      setUrl("");
      setNote("");
      setParticipantIds(participantOptions.map((p) => p.id));
      setSelectedIdeaId("");
      setLinkedCostId(null);
      setCostFields(createEmptyCostFields("ACCOMMODATION"));

      if (defaultIdeaId) {
        applyIdea(defaultIdeaId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodation, open, participantOptions, tripStartDate, tripEndDate, defaultIdeaId]);

  function applyIdea(ideaId: string) {
    setSelectedIdeaId(ideaId);
    if (!ideaId) return;

    const idea = ideaOptions.find((i) => i.id === ideaId);
    if (!idea) return;

    setTitle(idea.title);
    setUrl(idea.url ?? "");
    if (idea.checkInDate) setCheckIn(formatDate(idea.checkInDate));
    if (idea.checkOutDate) setCheckOut(formatDate(idea.checkOutDate));

    const interestedIds = idea.interests.map((i) => i.familyMember.id);
    if (interestedIds.length > 0) {
      setParticipantIds(interestedIds);
    } else {
      setParticipantIds(participantOptions.map((p) => p.id));
    }

    if (idea.amount != null && idea.amount > 0) {
      setCostFields({
        amount: formatAmountInput(String(Math.round(idea.amount))),
        currency: idea.currency,
        amountScope: idea.amountScope,
        category: "ACCOMMODATION",
        paidByFamilyMemberId: "",
      });
    } else {
      setCostFields(createEmptyCostFields("ACCOMMODATION"));
    }
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const selectedIdea = ideaOptions.find((i) => i.id === selectedIdeaId);

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    createCostMutation.isPending ||
    updateCostMutation.isPending;

  async function saveCostForAccommodation(accommodationId: string, parsedAmount: number) {
    const payload = {
      tripId,
      accommodationId,
      title,
      amount: parsedAmount,
      currency: costFields.currency,
      amountScope: costFields.amountScope,
      category: costFields.category as CostCategory,
      paidByFamilyMemberId: costFields.paidByFamilyMemberId || null,
    };

    if (linkedCostId) {
      return updateCostMutation.mutateAsync({ id: linkedCostId, ...payload });
    }

    return createCostMutation.mutateAsync(payload);
  }

  async function handleSubmit() {
    const data = {
      tripId,
      title,
      checkIn,
      checkOut,
      location: location || null,
      url: url.trim() || null,
      note: note.trim() || null,
      participantIds,
    };

    const parsedAmount = parseAmountInput(costFields.amount);

    if (accommodation) {
      const result = await updateMutation.mutateAsync({ id: accommodation.id, ...data });
      if (!result.success) return;

      if (linkedCostId || parsedAmount > 0) {
        if (parsedAmount <= 0) return;
        const costResult = await saveCostForAccommodation(accommodation.id, parsedAmount);
        if (!costResult.success) return;
      }
    } else {
      if (parsedAmount <= 0) return;

      const result = await createMutation.mutateAsync({
        ...data,
        ideaId: selectedIdeaId || defaultIdeaId || null,
      });
      if (!result.success) return;

      if (result.data?.id) {
        const costResult = await saveCostForAccommodation(result.data.id, parsedAmount);
        if (!costResult.success) return;
      }
    }

    onOpenChange(false);
    onSaved?.();
  }

  const isCostValid =
    !accommodation
      ? parseAmountInput(costFields.amount) > 0
      : !linkedCostId || parseAmountInput(costFields.amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-accommodation-form">
        <DialogHeader>
          <DialogTitle>
            {accommodation
              ? "Szállás szerkesztése"
              : isConvertMode
                ? "Ötlet szállásként rögzítése"
                : "Új szállás"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {isConvertMode && selectedIdea && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                A szállás ötlet adatai előtöltve. Ellenőrizd a dátumokat és mentsd a foglalást.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Bejelentkezés</Label>
              <DatePicker
                value={checkIn}
                onChange={setCheckIn}
                minDate={tripStartDate}
                maxDate={tripEndDate}
                inDialog
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kijelentkezés</Label>
              <DatePicker
                value={checkOut}
                onChange={setCheckOut}
                minDate={checkIn || tripStartDate}
                maxDate={tripEndDate}
                inDialog
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Helyszín (opcionális)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
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

          <div className="space-y-1.5">
            <Label>Megjegyzés (opcionális)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex max-h-[4.5rem] min-h-[4.5rem] w-full resize-none overflow-y-auto rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kik szállnak meg?</Label>
            <div className="flex flex-wrap gap-1.5">
              {participantOptions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipant(m.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors min-h-[var(--touch-target)] sm:min-h-0",
                    participantIds.includes(m.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <CostFieldsBlock
            value={costFields}
            onChange={(patch) => setCostFields((prev) => ({ ...prev, ...patch }))}
            participantOptions={participantOptions}
            heading="Szállás költsége"
          />
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
            disabled={
              !participantIds.length ||
              !title ||
              !checkIn ||
              !checkOut ||
              !isCostValid ||
              isPending
            }
          >
            {isPending ? "Mentés…" : isConvertMode ? "Szállás rögzítése" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
