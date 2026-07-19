"use client";

import { useState, useEffect } from "react";
import {
  formatDate,
  formatTimeWhileTyping,
  normalizeTimeValue,
  formatAmountInput,
  parseAmountInput,
  type CostCategory,
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
import { useCreateProgram, useUpdateProgram } from "@/hooks/use-programs";
import { useCreateCost } from "@/hooks/use-costs";
import { ParticipantPicker } from "@/components/trips/participant-picker";
import { Sparkles } from "lucide-react";
import {
  CostFieldsBlock,
  createEmptyCostFields,
  type CostFieldsValue,
} from "@/components/trips/cost-fields-block";

export interface ProgramIdeaOption {
  id: string;
  title: string;
  url: string | null;
  amount: number | null;
  currency: string;
  amountScope: string;
  category?: string;
  date?: Date | string | null;
  startTime?: string | null;
  endTime?: string | null;
  interests: { familyMember: { id: string } }[];
}

interface ProgramFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  participantOptions: { id: string; name: string }[];
  ideaOptions?: ProgramIdeaOption[];
  onSaved?: () => void;
  defaultDate?: string;
  defaultIdeaId?: string;
  program?: {
    id: string;
    title: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    url: string;
    participants: { familyMember: { id: string } }[];
  };
}

export function ProgramFormDrawer({
  open,
  onOpenChange,
  tripId,
  tripStartDate,
  tripEndDate,
  participantOptions,
  ideaOptions = [],
  onSaved,
  defaultDate,
  defaultIdeaId,
  program,
}: ProgramFormDrawerProps) {
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const createCostMutation = useCreateCost();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>("");
  const [costFields, setCostFields] = useState<CostFieldsValue>(() =>
    createEmptyCostFields("TICKET")
  );

  const isConvertMode = !program && Boolean(defaultIdeaId);

  useEffect(() => {
    if (program && open) {
      setTitle(program.title);
      setDate(formatDate(program.date));
      setStartTime(program.startTime ?? "");
      setEndTime(program.endTime ?? "");
      setLocation(program.location ?? "");
      setUrl(program.url ?? "");
      setParticipantIds(program.participants.map((p) => p.familyMember.id));
      setSelectedIdeaId("");
      setCostFields(createEmptyCostFields("TICKET"));
    } else if (!program && open) {
      setTitle("");
      setDate(defaultDate ?? tripStartDate);
      setStartTime("");
      setEndTime("");
      setLocation("");
      setUrl("");
      setParticipantIds(participantOptions.map((p) => p.id));
      setSelectedIdeaId("");
      setCostFields(createEmptyCostFields("TICKET"));

      if (defaultIdeaId) {
        applyIdea(defaultIdeaId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, open, participantOptions, defaultDate, tripStartDate, defaultIdeaId]);

  function applyIdea(ideaId: string) {
    setSelectedIdeaId(ideaId);
    if (!ideaId) return;

    const idea = ideaOptions.find((i) => i.id === ideaId);
    if (!idea) return;

    setTitle(idea.title);
    setUrl(idea.url ?? "");
    setDate(idea.date ? formatDate(idea.date) : defaultDate ?? tripStartDate);
    setStartTime(idea.startTime ?? "");
    setEndTime(idea.endTime ?? "");

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
        category: (idea.category ?? "TICKET") as CostCategory,
        paidByFamilyMemberId: "",
      });
    } else {
      setCostFields(createEmptyCostFields("TICKET"));
    }
  }

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleTimeChange(setter: (value: string) => void, value: string) {
    setter(formatTimeWhileTyping(value));
  }

  function handleTimeBlur(setter: (value: string) => void, value: string) {
    if (value) setter(normalizeTimeValue(value));
  }

  const selectedIdea = ideaOptions.find((i) => i.id === selectedIdeaId);

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    createCostMutation.isPending;

  async function handleSubmit() {
    const normalizedStart = startTime ? normalizeTimeValue(startTime) : null;
    const normalizedEnd = endTime ? normalizeTimeValue(endTime) : null;

    const data = {
      tripId,
      title,
      date,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      location: location || null,
      url: url.trim() || null,
      participantIds,
    };

    if (program) {
      const result = await updateMutation.mutateAsync({ id: program.id, ...data });
      if (!result.success) return;
    } else {
      const parsedAmount = parseAmountInput(costFields.amount);
      if (parsedAmount <= 0) return;

      const result = await createMutation.mutateAsync({
        ...data,
        ideaId: selectedIdeaId || null,
      });
      if (!result.success) return;

      if (result.data?.id) {
        await createCostMutation.mutateAsync({
          tripId,
          programId: result.data.id,
          title,
          amount: parsedAmount,
          currency: costFields.currency,
          amountScope: costFields.amountScope,
          category: costFields.category as CostCategory,
          paidByFamilyMemberId: costFields.paidByFamilyMemberId || null,
        });
      }
    }

    onOpenChange(false);
    onSaved?.();
  }

  const isCreateCostValid = program || parseAmountInput(costFields.amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {program ? "Program szerkesztése" : isConvertMode ? "Ötlet programmá alakítása" : "Új program"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {isConvertMode && selectedIdea && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Az ötlet adatai előtöltve. Válaszd ki a dátumot és időpontot, majd mentsd a programot.
              </p>
            </div>
          )}

          {!program && ideaOptions.length > 0 && !isConvertMode && (
            <div className="space-y-1.5">
              <Label>Ötletből (opcionális)</Label>
              <Select
                value={selectedIdeaId || "__none__"}
                onValueChange={(value) => applyIdea(value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz ötletet…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nincs kiválasztva</SelectItem>
                  {ideaOptions.map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Cím</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Dátum</Label>
            <p className="text-xs text-muted-foreground">
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
            <Label>Helyszín</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>URL (opcionális)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Résztvevők</Label>
            <ParticipantPicker
              members={participantOptions}
              selectedIds={participantIds}
              onToggle={toggleParticipant}
            />
          </div>

          {!program && (
            <CostFieldsBlock
              value={costFields}
              onChange={(patch) => setCostFields((prev) => ({ ...prev, ...patch }))}
              participantOptions={participantOptions}
              heading="Program költsége"
            />
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
            disabled={!participantIds.length || !title || !date || !isCreateCostValid || isPending}
          >
            {isPending
              ? "Mentés…"
              : isConvertMode
                ? "Program létrehozása"
                : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
