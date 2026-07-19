"use client";

import { useState, useEffect } from "react";
import {
  formatDate,
  formatTimeWhileTyping,
  normalizeTimeValue,
  formatAmountInput,
  parseAmountInput,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABELS,
  type TransportType,
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
import { useCreateTransport, useUpdateTransport } from "@/hooks/use-transports";
import { useCreateCost } from "@/hooks/use-costs";
import { ParticipantPicker } from "@/components/trips/participant-picker";
import {
  CostFieldsBlock,
  createEmptyCostFields,
  type CostFieldsValue,
} from "@/components/trips/cost-fields-block";

interface TransportFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  participantOptions: { id: string; name: string }[];
  onSaved?: () => void;
  transport?: {
    id: string;
    type: string;
    title: string;
    departureDate: Date;
    departureTime: string | null;
    arrivalDate: Date | null;
    arrivalTime: string | null;
    fromLocation: string | null;
    toLocation: string | null;
    bookingRef: string | null;
    url: string | null;
    note: string | null;
    participants: { familyMember: { id: string } }[];
  };
}

export function TransportFormDrawer({
  open,
  onOpenChange,
  tripId,
  tripStartDate,
  tripEndDate,
  participantOptions,
  onSaved,
  transport,
}: TransportFormDrawerProps) {
  const createMutation = useCreateTransport();
  const updateMutation = useUpdateTransport();
  const createCostMutation = useCreateCost();
  const isEditing = !!transport;

  const [type, setType] = useState<TransportType>("OTHER");
  const [title, setTitle] = useState("");
  const [departureDate, setDepartureDate] = useState(tripStartDate);
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [costFields, setCostFields] = useState<CostFieldsValue>(() =>
    createEmptyCostFields("TRANSPORT")
  );
  const [includeCost, setIncludeCost] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (transport) {
      setType((transport.type as TransportType) || "OTHER");
      setTitle(transport.title);
      setDepartureDate(formatDate(transport.departureDate));
      setDepartureTime(transport.departureTime ?? "");
      setArrivalDate(transport.arrivalDate ? formatDate(transport.arrivalDate) : "");
      setArrivalTime(transport.arrivalTime ?? "");
      setFromLocation(transport.fromLocation ?? "");
      setToLocation(transport.toLocation ?? "");
      setBookingRef(transport.bookingRef ?? "");
      setUrl(transport.url ?? "");
      setNote(transport.note ?? "");
      setParticipantIds(transport.participants.map((p) => p.familyMember.id));
      setIncludeCost(false);
    } else {
      setType("OTHER");
      setTitle("");
      setDepartureDate(tripStartDate);
      setDepartureTime("");
      setArrivalDate("");
      setArrivalTime("");
      setFromLocation("");
      setToLocation("");
      setBookingRef("");
      setUrl("");
      setNote("");
      setParticipantIds(participantOptions.map((p) => p.id));
      setCostFields(createEmptyCostFields("TRANSPORT"));
      setIncludeCost(false);
    }
  }, [open, transport, tripStartDate, participantOptions]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      tripId,
      type,
      title,
      departureDate,
      departureTime: normalizeTimeValue(departureTime) || null,
      arrivalDate: arrivalDate || null,
      arrivalTime: normalizeTimeValue(arrivalTime) || null,
      fromLocation: fromLocation || null,
      toLocation: toLocation || null,
      bookingRef: bookingRef || null,
      url: url || null,
      note: note || null,
      participantIds,
    };

    if (isEditing && transport) {
      const result = await updateMutation.mutateAsync({ id: transport.id, ...payload });
      if (result.success) {
        onOpenChange(false);
        onSaved?.();
      }
      return;
    }

    const result = await createMutation.mutateAsync(payload);
    if (!result.success) return;

    if (includeCost && costFields.amount.trim()) {
      const amount = parseAmountInput(costFields.amount);
      if (amount != null && amount > 0) {
        await createCostMutation.mutateAsync({
          tripId,
          transportId: result.data.id,
          title: title || "Közlekedés",
          amount,
          currency: costFields.currency,
          amountScope: costFields.amountScope as "TOTAL" | "PER_PERSON",
          category: (costFields.category || "TRANSPORT") as CostCategory,
          paidByFamilyMemberId: costFields.paidByFamilyMemberId || null,
        });
      }
    }

    onOpenChange(false);
    onSaved?.();
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Közlekedés szerkesztése" : "Új közlekedés"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Típus</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransportType)}>
                <SelectTrigger className="min-h-[var(--touch-target)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRANSPORT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport-title">Megnevezés</Label>
              <Input
                id="transport-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="min-h-[var(--touch-target)]"
                placeholder="pl. BUD → BCN járat"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-2">
                <Label>Indulás napja</Label>
                <DatePicker
                  value={departureDate}
                  onChange={setDepartureDate}
                  inDialog
                  className="min-h-[var(--touch-target)] w-full md:min-h-9"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="dep-time">Indulás ideje</Label>
                <Input
                  id="dep-time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(formatTimeWhileTyping(e.target.value))}
                  placeholder="HH:MM"
                  className="min-h-[var(--touch-target)] w-full md:min-h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-2">
                <Label>Érkezés napja</Label>
                <DatePicker
                  value={arrivalDate}
                  onChange={setArrivalDate}
                  inDialog
                  className="min-h-[var(--touch-target)] w-full md:min-h-9"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="arr-time">Érkezés ideje</Label>
                <Input
                  id="arr-time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(formatTimeWhileTyping(e.target.value))}
                  placeholder="HH:MM"
                  className="min-h-[var(--touch-target)] w-full md:min-h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from-loc">Honnan</Label>
                <Input
                  id="from-loc"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="min-h-[var(--touch-target)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-loc">Hova</Label>
                <Input
                  id="to-loc"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="min-h-[var(--touch-target)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-ref">Foglalási szám</Label>
              <Input
                id="booking-ref"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className="min-h-[var(--touch-target)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport-url">URL</Label>
              <Input
                id="transport-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="min-h-[var(--touch-target)]"
              />
            </div>

            <div className="space-y-2">
              <Label>Résztvevők</Label>
              <ParticipantPicker
                members={participantOptions}
                selectedIds={participantIds}
                onToggle={toggleParticipant}
              />
            </div>

            {!isEditing ? (
              <div className="space-y-3 rounded-xl border p-3">
                <label className="flex min-h-[var(--touch-target)] items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={includeCost}
                    onChange={(e) => setIncludeCost(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Költség rögzítése
                </label>
                {includeCost ? (
                  <CostFieldsBlock
                    value={costFields}
                    onChange={(patch) => setCostFields((prev) => ({ ...prev, ...patch }))}
                    participantOptions={participantOptions}
                    heading="Közlekedés költsége"
                  />
                ) : null}
              </div>
            ) : null}
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
              {pending ? "Mentés…" : isEditing ? "Mentés" : "Létrehozás"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
