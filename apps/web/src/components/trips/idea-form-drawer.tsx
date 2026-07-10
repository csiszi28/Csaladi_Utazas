"use client";

import { useState, useEffect } from "react";
import {
  IDEA_AMOUNT_SCOPES,
  IDEA_AMOUNT_SCOPE_LABELS,
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  formatAmountInput,
  parseAmountInput,
} from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCreateTripIdea, useUpdateTripIdea } from "@/hooks/use-ideas";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { cn } from "@/lib/utils";

export interface TripIdeaFormData {
  id: string;
  title: string;
  url: string | null;
  amount: number | null;
  currency: string;
  amountScope: string;
  category: string;
  interestedParticipantIds: string[];
}

interface IdeaFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  participants: { id: string; name: string }[];
  onSaved?: () => void;
  idea?: TripIdeaFormData;
}

export function IdeaFormDrawer({
  open,
  onOpenChange,
  tripId,
  participants,
  onSaved,
  idea,
}: IdeaFormDrawerProps) {
  const createMutation = useCreateTripIdea();
  const updateMutation = useUpdateTripIdea();

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [amountScope, setAmountScope] = useState<string>("TOTAL");
  const [category, setCategory] = useState<string>("OTHER");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (idea && open) {
      setTitle(idea.title);
      setUrl(idea.url ?? "");
      setAmountInput(idea.amount != null ? formatAmountInput(String(idea.amount)) : "");
      setCurrency(idea.currency);
      setAmountScope(idea.amountScope);
      setCategory(idea.category);
      setParticipantIds(idea.interestedParticipantIds);
    } else if (!idea && open) {
      setTitle("");
      setUrl("");
      setAmountInput("");
      setCurrency("HUF");
      setAmountScope("TOTAL");
      setCategory("OTHER");
      setParticipantIds([]);
    }
  }, [idea, open]);

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
      category,
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
            <Label className="text-xs">Program neve</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Becsült összeg (opcionális)</Label>
              <Input
                value={amountInput}
                onChange={(e) => setAmountInput(formatAmountInput(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pénznem</Label>
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
              <Label className="text-xs">Összeg értelmezése</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Költség kategória</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {COST_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {participants.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Kit érdekel?</Label>
              <div className="flex flex-wrap gap-1.5">
                {participants.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors min-h-[var(--touch-target)] sm:min-h-0",
                      participantIds.includes(member.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:bg-accent"
                    )}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || isPending}>
            Mentés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
