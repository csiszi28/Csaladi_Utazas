"use client";

import { useState, useEffect } from "react";
import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  IDEA_AMOUNT_SCOPES,
  IDEA_AMOUNT_SCOPE_LABELS,
  formatAmountInput,
  formatDate,
  parseAmountInput,
  type IdeaAmountScope,
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
import { useCreateCost, useUpdateCost } from "@/hooks/use-costs";
import { Sparkles } from "lucide-react";

interface CostProgramOption {
  id: string;
  title: string;
  date?: Date | string;
}

interface CostAccommodationOption {
  id: string;
  title: string;
  checkIn: Date | string;
  checkOut: Date | string;
}

export interface CostIdeaOption {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  amountScope: string;
  category: string;
}

interface CostFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  programs: CostProgramOption[];
  accommodations?: CostAccommodationOption[];
  participantOptions?: { id: string; name: string }[];
  ideaOptions?: CostIdeaOption[];
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
  defaultProgramId?: string;
  defaultAccommodationId?: string;
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
  };
}

const amountInputClassName =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

export function CostFormDrawer({
  open,
  onOpenChange,
  tripId,
  programs,
  accommodations = [],
  participantOptions = [],
  ideaOptions = [],
  onSaved,
  defaultProgramId,
  defaultAccommodationId,
  cost,
}: CostFormDrawerProps) {
  const createMutation = useCreateCost();
  const updateMutation = useUpdateCost();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [amountScope, setAmountScope] = useState<string>("TOTAL");
  const [category, setCategory] = useState<string>("OTHER");
  const [programId, setProgramId] = useState<string>("");
  const [accommodationId, setAccommodationId] = useState<string>("");
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [selectedProgramPrefillId, setSelectedProgramPrefillId] = useState("");
  const [selectedAccommodationPrefillId, setSelectedAccommodationPrefillId] = useState("");
  const [paidByFamilyMemberId, setPaidByFamilyMemberId] = useState("");

  const selectedIdea = ideaOptions.find((i) => i.id === selectedIdeaId);
  const isProgramPrefillMode = !cost && Boolean(defaultProgramId);
  const isAccommodationPrefillMode = !cost && Boolean(defaultAccommodationId);

  useEffect(() => {
    if (cost && open) {
      setTitle(cost.title);
      setAmount(formatAmountInput(String(Math.round(cost.amount))));
      setCurrency(cost.currency);
      setAmountScope(cost.amountScope ?? "TOTAL");
      setCategory(cost.category);
      setProgramId(cost.programId ?? "");
      setAccommodationId(cost.accommodationId ?? "");
      setPaidByFamilyMemberId(cost.paidByFamilyMemberId ?? "");
      setSelectedIdeaId("");
      setSelectedProgramPrefillId(cost.programId ?? "");
      setSelectedAccommodationPrefillId(cost.accommodationId ?? "");
    } else if (!cost && open) {
      setTitle("");
      setAmount("");
      setCurrency("HUF");
      setAmountScope("TOTAL");
      setCategory("OTHER");
      setProgramId("");
      setAccommodationId("");
      setPaidByFamilyMemberId("");
      setSelectedIdeaId("");
      setSelectedProgramPrefillId("");
      setSelectedAccommodationPrefillId("");

      if (defaultProgramId) {
        const program = programs.find((p) => p.id === defaultProgramId);
        if (program) {
          setProgramId(program.id);
          setAccommodationId("");
          setTitle(program.title);
          setCategory("TICKET");
          setSelectedProgramPrefillId(program.id);
        }
      } else if (defaultAccommodationId) {
        const accommodation = accommodations.find((a) => a.id === defaultAccommodationId);
        if (accommodation) {
          setAccommodationId(accommodation.id);
          setProgramId("");
          setTitle(accommodation.title);
          setCategory("ACCOMMODATION");
          setSelectedAccommodationPrefillId(accommodation.id);
        }
      }
    }
  }, [cost, open, defaultProgramId, defaultAccommodationId, programs, accommodations]);

  function applyProgram(programPrefillId: string) {
    setSelectedProgramPrefillId(programPrefillId);
    setSelectedAccommodationPrefillId("");
    if (!programPrefillId) {
      setProgramId("");
      return;
    }

    const program = programs.find((p) => p.id === programPrefillId);
    if (!program) return;

    setProgramId(program.id);
    setAccommodationId("");
    setTitle(program.title);
    setCategory("TICKET");
  }

  function applyAccommodation(accommodationPrefillId: string) {
    setSelectedAccommodationPrefillId(accommodationPrefillId);
    setSelectedProgramPrefillId("");
    if (!accommodationPrefillId) {
      setAccommodationId("");
      return;
    }

    const accommodation = accommodations.find((a) => a.id === accommodationPrefillId);
    if (!accommodation) return;

    setAccommodationId(accommodation.id);
    setProgramId("");
    setTitle(accommodation.title);
    setCategory("ACCOMMODATION");
  }

  function applyIdea(ideaId: string) {
    setSelectedIdeaId(ideaId);
    if (!ideaId) return;
    const idea = ideaOptions.find((i) => i.id === ideaId);
    if (!idea) return;
    setTitle(idea.title);
    if (idea.amount != null) {
      setAmount(formatAmountInput(String(Math.round(idea.amount))));
    }
    setCurrency(idea.currency);
    setAmountScope(idea.amountScope);
    setCategory(idea.category ?? "OTHER");
  }

  function handleAmountChange(value: string) {
    setAmount(formatAmountInput(value));
  }

  async function handleSubmit() {
    const parsedAmount = parseAmountInput(amount);
    if (parsedAmount <= 0) return;

    const savedPayload = {
      tripId,
      programId: programId || null,
      accommodationId: accommodationId || null,
      amount: parsedAmount,
      currency,
      amountScope,
      category,
      title,
      paidByFamilyMemberId: paidByFamilyMemberId || null,
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

  function programLabel(program: CostProgramOption) {
    if (!program.date) return program.title;
    return `${program.title} (${formatDate(program.date)})`;
  }

  function accommodationLabel(accommodation: CostAccommodationOption) {
    return `${accommodation.title} (${formatDate(accommodation.checkIn)} – ${formatDate(accommodation.checkOut)})`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cost
              ? "Költség szerkesztése"
              : isProgramPrefillMode
                ? "Költség a programhoz"
                : isAccommodationPrefillMode
                  ? "Költség a szálláshoz"
                  : "Új költség"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {isProgramPrefillMode && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                A program adatai előtöltve. Add meg az összeget és a fizetőt, majd mentsd a költséget.
              </p>
            </div>
          )}

          {isAccommodationPrefillMode && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                A szállás adatai előtöltve. Add meg az összeget és a fizetőt, majd mentsd a költséget.
              </p>
            </div>
          )}

          {!cost && programs.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Programból (opcionális)</Label>
              <Select
                value={selectedProgramPrefillId || "__none__"}
                onValueChange={(value) => applyProgram(value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz programot…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nincs kiválasztva</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {programLabel(program)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A program címe és hozzárendelése automatikusan kitöltődik.
              </p>
            </div>
          )}

          {!cost && ideaOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ötletből (opcionális)</Label>
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
            <Label className="text-xs">Megnevezés</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Összeg</Label>
              <Input
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                type="text"
                inputMode="numeric"
                placeholder="0"
                className={amountInputClassName}
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
                    {IDEA_AMOUNT_SCOPE_LABELS[scope as IdeaAmountScope]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!cost && accommodations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Szállásból (opcionális)</Label>
              <Select
                value={selectedAccommodationPrefillId || "__none__"}
                onValueChange={(value) =>
                  applyAccommodation(value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz szállást…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nincs kiválasztva</SelectItem>
                  {accommodations.map((accommodation) => (
                    <SelectItem key={accommodation.id} value={accommodation.id}>
                      {accommodationLabel(accommodation)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Hozzárendelés</Label>
            <Select
              value={
                accommodationId
                  ? `acc:${accommodationId}`
                  : programId
                    ? `prog:${programId}`
                    : "none"
              }
              onValueChange={(v) => {
                if (v === "none") {
                  setProgramId("");
                  setAccommodationId("");
                  setSelectedProgramPrefillId("");
                  setSelectedAccommodationPrefillId("");
                  return;
                }
                if (v.startsWith("acc:")) {
                  const id = v.slice(4);
                  applyAccommodation(id);
                  return;
                }
                if (v.startsWith("prog:")) {
                  const id = v.slice(5);
                  applyProgram(id);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Utazás, program vagy szállás" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Utazás szintű költség</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={`prog:${p.id}`}>
                    Program: {programLabel(p)}
                  </SelectItem>
                ))}
                {accommodations.map((a) => (
                  <SelectItem key={a.id} value={`acc:${a.id}`}>
                    Szállás: {accommodationLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Kategória</Label>
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

          {participantOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ki fizette? (elszámoláshoz)</Label>
              <Select
                value={paidByFamilyMemberId || "__none__"}
                onValueChange={(v) => setPaidByFamilyMemberId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz fizetőt…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nincs megadva</SelectItem>
                  {participantOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Az elszámolás csak a fizetővel rendelkező költségeket veszi figyelembe.
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full min-h-[var(--touch-target)] sm:min-h-9"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Mégse
          </Button>
          <Button
            size="sm"
            className="w-full min-h-[var(--touch-target)] sm:min-h-9"
            onClick={handleSubmit}
            disabled={
              !title ||
              parseAmountInput(amount) <= 0 ||
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
