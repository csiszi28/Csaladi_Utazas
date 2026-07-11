"use client";

import { useState, useEffect } from "react";
import {
  formatDate,
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
import { useCreateAccommodation, useUpdateAccommodation } from "@/hooks/use-accommodations";
import { useCreateCost } from "@/hooks/use-costs";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

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

  const [title, setTitle] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [createCostFromIdea, setCreateCostFromIdea] = useState(true);

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
      setCreateCostFromIdea(false);
    } else if (!accommodation && open) {
      setTitle("");
      setCheckIn(tripStartDate);
      setCheckOut(tripEndDate);
      setLocation("");
      setUrl("");
      setNote("");
      setParticipantIds(participantOptions.map((p) => p.id));
      setSelectedIdeaId("");
      setCreateCostFromIdea(true);

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

    setCreateCostFromIdea(idea.amount != null && idea.amount > 0);
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
    createCostMutation.isPending;

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

    if (accommodation) {
      const result = await updateMutation.mutateAsync({ id: accommodation.id, ...data });
      if (!result.success) return;
    } else {
      const result = await createMutation.mutateAsync({
        ...data,
        ideaId: selectedIdeaId || defaultIdeaId || null,
      });
      if (!result.success) return;

      if (
        createCostFromIdea &&
        selectedIdea?.amount != null &&
        selectedIdea.amount > 0 &&
        result.data?.id
      ) {
        await createCostMutation.mutateAsync({
          tripId,
          accommodationId: result.data.id,
          title: selectedIdea.title,
          amount: selectedIdea.amount,
          currency: selectedIdea.currency,
          amountScope: selectedIdea.amountScope,
          category: "ACCOMMODATION" as CostCategory,
        });
      }
    }

    onOpenChange(false);
    onSaved?.();
  }

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
            <Label className="text-xs">Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Bejelentkezés</Label>
              <DatePicker
                value={checkIn}
                onChange={setCheckIn}
                minDate={tripStartDate}
                maxDate={tripEndDate}
                inDialog
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kijelentkezés</Label>
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
            <Label className="text-xs">Helyszín (opcionális)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">URL (opcionális)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
            <UrlPreviewCard url={url} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Megjegyzés (opcionális)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex max-h-[4.5rem] min-h-[4.5rem] w-full resize-none overflow-y-auto rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Kik szállnak meg?</Label>
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

          {!accommodation && selectedIdea?.amount != null && selectedIdea.amount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={createCostFromIdea}
                onChange={(e) => setCreateCostFromIdea(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="inline-flex flex-wrap items-center gap-x-1">
                Becsült költség rögzítése is (
                <CostAmountDisplay
                  amount={selectedIdea.amount}
                  currency={selectedIdea.currency}
                  amountScope={selectedIdea.amountScope}
                  participantCount={selectedIdea.interests.length}
                  className="inline-flex"
                />
                )
              </span>
            </label>
          )}
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full min-h-[var(--touch-target)] sm:min-h-9"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Mégse
          </Button>
          <Button
            size="sm"
            className="w-full min-h-[var(--touch-target)] sm:min-h-9"
            onClick={handleSubmit}
            disabled={!participantIds.length || !title || !checkIn || !checkOut || isPending}
          >
            {isPending ? "Mentés…" : isConvertMode ? "Szállás rögzítése" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
