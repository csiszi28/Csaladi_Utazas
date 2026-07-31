"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { TRIP_DIALOG_BTN_CLASS } from "./trip-section-styles";
import { ParticipantPicker } from "@/components/trips/participant-picker";
import { createTripFromTemplate } from "@/actions/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";

interface CreateTripFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: { id: string; title: string; destination: string } | null;
  members: FamilyMemberRow[];
}

export function CreateTripFromTemplateDialog({
  open,
  onOpenChange,
  template,
  members,
}: CreateTripFromTemplateDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && template) {
      setTitle(template.title);
      setStartDate(formatDate(new Date()));
      setParticipantIds(members[0] ? [members[0].id] : []);
    }
  }, [open, template, members]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (!template) return;
    startTransition(async () => {
      const result = await createTripFromTemplate({
        templateId: template.id,
        title,
        startDate,
        participantIds,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Utazás létrehozva a sablonból");
      onOpenChange(false);
      router.push(`/trips/${result.data.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új utazás sablonból</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {template ? (
            <p className="text-sm text-muted-foreground">
              Sablon: <span className="font-medium text-foreground">{template.title}</span> ·{" "}
              {template.destination}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label>Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label>Kezdő dátum</Label>
            <DatePicker value={startDate} onChange={setStartDate} inDialog />
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
          <Button
            variant="outline"
            className={TRIP_DIALOG_BTN_CLASS}
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Mégse
          </Button>
          <Button
            className={TRIP_DIALOG_BTN_CLASS}
            onClick={handleSubmit}
            disabled={!title.trim() || !startDate || !participantIds.length || isPending}
          >
            Létrehozás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
