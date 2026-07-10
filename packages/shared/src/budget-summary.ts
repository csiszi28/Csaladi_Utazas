import { toHuf } from "./currency";
import { costTotalHuf, type HufRateMap } from "./cost-allocation";

export interface BudgetIdea {
  id: string;
  amount: number | null;
  currency: string;
  amountScope?: string;
  interestedParticipantIds: string[];
}

export interface TripBudgetInput {
  budgetAmount: number | null;
  budgetCurrency: string;
  participantCount: number;
  ideas: BudgetIdea[];
  actualTotalHuf: number;
}

export type BudgetStatus = "none" | "ok" | "warning" | "over";

export interface TripBudgetSummary {
  budgetHuf: number | null;
  estimatedHuf: number;
  actualHuf: number;
  remainingHuf: number | null;
  usagePercent: number | null;
  estimatedUsagePercent: number | null;
  status: BudgetStatus;
}

function ideaEstimatedHuf(
  idea: BudgetIdea,
  participantCount: number,
  rates: HufRateMap
): number {
  if (idea.amount == null || idea.amount <= 0) return 0;

  const effectiveCount =
    idea.interestedParticipantIds.length > 0
      ? idea.interestedParticipantIds.length
      : Math.max(participantCount, 1);

  return costTotalHuf(
    {
      amount: idea.amount,
      currency: idea.currency,
      amountScope: idea.amountScope,
    },
    effectiveCount,
    rates
  );
}

export function buildTripBudgetSummary(
  input: TripBudgetInput,
  rates: HufRateMap
): TripBudgetSummary {
  const estimatedHuf = Math.round(
    input.ideas.reduce(
      (sum, idea) => sum + ideaEstimatedHuf(idea, input.participantCount, rates),
      0
    )
  );

  const actualHuf = Math.round(input.actualTotalHuf);

  const budgetHuf =
    input.budgetAmount != null && input.budgetAmount > 0
      ? Math.round(toHuf(input.budgetAmount, input.budgetCurrency, rates))
      : null;

  const remainingHuf = budgetHuf != null ? budgetHuf - actualHuf : null;

  const usagePercent =
    budgetHuf != null && budgetHuf > 0 ? Math.round((actualHuf / budgetHuf) * 100) : null;

  const estimatedUsagePercent =
    budgetHuf != null && budgetHuf > 0
      ? Math.round((estimatedHuf / budgetHuf) * 100)
      : null;

  let status: BudgetStatus = "none";
  if (budgetHuf != null && budgetHuf > 0) {
    if (actualHuf > budgetHuf) status = "over";
    else if (actualHuf >= budgetHuf * 0.8) status = "warning";
    else status = "ok";
  }

  return {
    budgetHuf,
    estimatedHuf,
    actualHuf,
    remainingHuf,
    usagePercent,
    estimatedUsagePercent,
    status,
  };
}
