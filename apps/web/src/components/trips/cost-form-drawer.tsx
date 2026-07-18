"use client";

import { useState, useEffect } from "react";
import {
  formatAmountInput,
  parseAmountInput,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { TRIP_DIALOG_BTN_CLASS } from "./trip-section-styles";
import { useCreateCost, useUpdateCost } from "@/hooks/use-costs";
import {
  CostFieldsBlock,
  createEmptyCostFields,
  type CostFieldsValue,
} from "@/components/trips/cost-fields-block";

interface CostFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  participantOptions?: { id: string; name: string }[];
  onSaved?: (cost: {
    id: string;
    tripId: string;
    title: string;
    amount: number;
    currency: string;
    amountScope: string;
    category: string;
    programId: string | null;
    accommodationId?: string | null;
    paidByFamilyMemberId?: string | null;
  }) => void;
  cost?: {
    id: string;
    title: string;
    amount: number;
    currency: string;
    amountScope?: string;
    category: string;
    programId: string | null;
    accommodationId?: string | null;
    paidByFamilyMemberId?: string | null;
    program?: { title: string } | null;
    accommodation?: { title: string } | null;
  };
}

export function CostFormDrawer({
  open,
  onOpenChange,
  tripId,
  participantOptions = [],
  onSaved,
  cost,
}: CostFormDrawerProps) {
  const createMutation = useCreateCost();
  const updateMutation = useUpdateCost();

  const [title, setTitle] = useState("");
  const [costFields, setCostFields] = useState<CostFieldsValue>(() =>
    createEmptyCostFields("OTHER")
  );

  const isLinkedCost = Boolean(cost?.programId || cost?.accommodationId);
  const linkedLabel = cost?.programId
    ? `Program: ${cost.program?.title ?? "—"}`
    : cost?.accommodationId
      ? `Szállás: ${cost.accommodation?.title ?? "—"}`
      : null;

  useEffect(() => {
    if (cost && open) {
      setTitle(cost.title);
      setCostFields({
        amount: formatAmountInput(String(Math.round(cost.amount))),
        currency: cost.currency,
        amountScope: cost.amountScope ?? "TOTAL",
        category: cost.category,
        paidByFamilyMemberId: cost.paidByFamilyMemberId ?? "",
      });
    } else if (!cost && open) {
      setTitle("");
      setCostFields(createEmptyCostFields("OTHER"));
    }
  }, [cost, open]);

  async function handleSubmit() {
    const parsedAmount = parseAmountInput(costFields.amount);
    if (parsedAmount <= 0) return;

    const savedPayload = {
      tripId,
      programId: cost?.programId ?? null,
      accommodationId: cost?.accommodationId ?? null,
      amount: parsedAmount,
      currency: costFields.currency,
      amountScope: costFields.amountScope,
      category: costFields.category,
      title,
      paidByFamilyMemberId: costFields.paidByFamilyMemberId || null,
    };

    if (cost) {
      const result = await updateMutation.mutateAsync({ id: cost.id, ...savedPayload });
      if (!result.success) return;
      onOpenChange(false);
      onSaved?.({ id: cost.id, ...savedPayload });
    } else {
      const result = await createMutation.mutateAsync(savedPayload);
      if (!result.success) return;
      onOpenChange(false);
      onSaved?.({ id: result.data.id, ...savedPayload });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cost ? "Költség szerkesztése" : "Új költség"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {!cost && (
            <p className="text-sm text-muted-foreground">
              Utazás szintű extra költség (ételek, bérlések, egyéb). Program és szállás költségeit a
              program vagy szállás rögzítésekor add meg.
            </p>
          )}

          {isLinkedCost && linkedLabel && (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Kapcsolódik: <span className="font-medium text-foreground">{linkedLabel}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <CostFieldsBlock
            value={costFields}
            onChange={(patch) => setCostFields((prev) => ({ ...prev, ...patch }))}
            participantOptions={participantOptions}
            heading="Költség adatai"
          />
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="outline" className={TRIP_DIALOG_BTN_CLASS}
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Mégse
          </Button>
          <Button
            className={TRIP_DIALOG_BTN_CLASS}
            onClick={handleSubmit}
            disabled={
              !title ||
              parseAmountInput(costFields.amount) <= 0 ||
              createMutation.isPending ||
              updateMutation.isPending
            }
          >
            {createMutation.isPending || updateMutation.isPending ? "Mentés…" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
