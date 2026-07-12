"use client";

import {
  COST_CATEGORIES,
  COST_CATEGORY_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
  IDEA_AMOUNT_SCOPES,
  IDEA_AMOUNT_SCOPE_LABELS,
  formatAmountInput,
  type CostCategory,
  type IdeaAmountScope,
} from "@csaladi-utazas/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const amountInputClassName =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

export interface CostFieldsValue {
  amount: string;
  currency: string;
  amountScope: string;
  category: string;
  paidByFamilyMemberId: string;
}

interface CostFieldsBlockProps {
  value: CostFieldsValue;
  onChange: (patch: Partial<CostFieldsValue>) => void;
  participantOptions?: { id: string; name: string }[];
  defaultCategory?: CostCategory;
  heading?: string;
}

export function createEmptyCostFields(defaultCategory: CostCategory = "OTHER"): CostFieldsValue {
  return {
    amount: "",
    currency: "HUF",
    amountScope: "TOTAL",
    category: defaultCategory,
    paidByFamilyMemberId: "",
  };
}

export function CostFieldsBlock({
  value,
  onChange,
  participantOptions = [],
  heading = "Költség",
}: CostFieldsBlockProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 px-3 py-3">
      <p className="text-sm font-medium">{heading}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Összeg</Label>
          <Input
            value={value.amount}
            onChange={(e) => onChange({ amount: formatAmountInput(e.target.value) })}
            type="text"
            inputMode="numeric"
            placeholder="0"
            className={amountInputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pénznem</Label>
          <Select value={value.currency} onValueChange={(currency) => onChange({ currency })}>
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
        <Select
          value={value.amountScope}
          onValueChange={(amountScope) => onChange({ amountScope })}
        >
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

      <div className="space-y-1.5">
        <Label className="text-xs">Kategória</Label>
        <Select
          value={value.category}
          onValueChange={(category) => onChange({ category })}
        >
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
            value={value.paidByFamilyMemberId || "__none__"}
            onValueChange={(v) =>
              onChange({ paidByFamilyMemberId: v === "__none__" ? "" : v })
            }
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
        </div>
      )}
    </div>
  );
}
