export const IDEA_DECISIONS = ["OPEN", "ACCEPTED", "REJECTED"] as const;
export type IdeaDecision = (typeof IDEA_DECISIONS)[number];

export const IDEA_DECISION_LABELS: Record<IdeaDecision, string> = {
  OPEN: "Szavazás alatt",
  ACCEPTED: "Elfogadva",
  REJECTED: "Elutasítva",
};

export function isIdeaDecision(value: string | null | undefined): value is IdeaDecision {
  return IDEA_DECISIONS.includes(value as IdeaDecision);
}
