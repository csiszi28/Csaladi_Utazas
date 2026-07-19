import type { SettlementTransfer } from "./settlement";

export interface RecordedSettlementPayment {
  fromFamilyMemberId: string;
  toFamilyMemberId: string;
  amountHuf: number;
}

/**
 * Subtract recorded payments from recommended transfers.
 * Matches by from/to pair and reduces remaining amounts.
 */
export function applySettlementPayments(
  transfers: SettlementTransfer[],
  payments: RecordedSettlementPayment[]
): SettlementTransfer[] {
  const remaining = transfers.map((t) => ({ ...t }));

  for (const payment of payments) {
    let left = payment.amountHuf;
    for (const transfer of remaining) {
      if (left <= 0) break;
      if (
        transfer.fromId !== payment.fromFamilyMemberId ||
        transfer.toId !== payment.toFamilyMemberId
      ) {
        continue;
      }
      const applied = Math.min(transfer.amountHuf, left);
      transfer.amountHuf -= applied;
      left -= applied;
    }
  }

  return remaining.filter((t) => t.amountHuf > 0);
}

export function packingProgress(items: { isPacked: boolean }[]): {
  packed: number;
  total: number;
  percent: number;
} {
  const total = items.length;
  const packed = items.filter((i) => i.isPacked).length;
  return {
    packed,
    total,
    percent: total === 0 ? 0 : Math.round((packed / total) * 100),
  };
}
