"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { toast } from "sonner";
import { toggleIdeaInterest } from "@/actions/ideas";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

type InterestRow = { familyMember: { id: string; name: string } };

interface IdeaVoteBarProps {
  ideaId: string;
  interests: InterestRow[];
  participantCount: number;
  voteDeadline?: Date | string | null;
  currentFamilyMemberId?: string | null;
  currentFamilyMemberName?: string | null;
  onChanged: () => void;
  className?: string;
}

function deadlineMeta(deadline: Date | string) {
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0) return { label: "Lejárt", urgent: true };
  if (days === 0) return { label: "Ma zárul", urgent: true };
  if (days === 1) return { label: "1 nap van hátra", urgent: true };
  return { label: `${days} nap van hátra`, urgent: days <= 3 };
}

function withOptimisticInterest(
  interests: InterestRow[],
  familyMemberId: string,
  familyMemberName: string,
  interested: boolean
): InterestRow[] {
  const withoutMe = interests.filter((i) => i.familyMember.id !== familyMemberId);
  if (!interested) return withoutMe;
  return [
    ...withoutMe,
    { familyMember: { id: familyMemberId, name: familyMemberName } },
  ];
}

export function IdeaVoteBar({
  ideaId,
  interests,
  participantCount,
  voteDeadline,
  currentFamilyMemberId,
  currentFamilyMemberName,
  onChanged,
  className,
}: IdeaVoteBarProps) {
  const [, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const [optimisticInterested, setOptimisticInterested] = useState<boolean | null>(null);

  const serverInterested = currentFamilyMemberId
    ? interests.some((i) => i.familyMember.id === currentFamilyMemberId)
    : false;
  const interested = optimisticInterested ?? serverInterested;

  useEffect(() => {
    setOptimisticInterested(null);
  }, [interests]);

  const myName =
    currentFamilyMemberName ??
    interests.find((i) => i.familyMember.id === currentFamilyMemberId)?.familyMember.name ??
    "Én";

  const displayInterests =
    currentFamilyMemberId && optimisticInterested !== null
      ? withOptimisticInterest(interests, currentFamilyMemberId, myName, optimisticInterested)
      : interests;

  const interestedNames = displayInterests.map((i) => i.familyMember.name);
  const percent =
    participantCount > 0
      ? Math.round((displayInterests.length / participantCount) * 100)
      : 0;
  const deadline = voteDeadline ? deadlineMeta(voteDeadline) : null;

  function toggle() {
    if (!currentFamilyMemberId) {
      toast.message("Nincs hozzád kötött családi profil az utazáson");
      return;
    }

    const next = !interested;
    setOptimisticInterested(next);
    const requestId = ++requestIdRef.current;

    startTransition(async () => {
      const result = await toggleIdeaInterest({
        ideaId,
        familyMemberId: currentFamilyMemberId,
        interested: next,
      });

      if (requestId !== requestIdRef.current) return;

      if (!result.success) {
        setOptimisticInterested(!next);
        toast.error(result.error);
        return;
      }

      onChanged();
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-muted-foreground">Érdeklődés</span>
          <span className="tabular-nums text-muted-foreground">
            {displayInterests.length}/{Math.max(participantCount, displayInterests.length)}
          </span>
        </div>
        <ProgressBar value={percent} size="md" tone="brand" showValue />
      </div>

      {interestedNames.length > 0 ? (
        <MonogramGroup names={interestedNames} />
      ) : (
        <p className="text-sm text-muted-foreground">Még senkit nem érdekel.</p>
      )}

      {voteDeadline ? (
        <p
          className={cn(
            "text-xs",
            deadline?.urgent
              ? "font-medium text-amber-700 dark:text-amber-400"
              : "text-muted-foreground"
          )}
        >
          Szavazás: {formatDate(voteDeadline)}-ig
          {deadline ? ` · ${deadline.label}` : ""}
        </p>
      ) : null}

      {currentFamilyMemberId ? (
        <Button
          type="button"
          variant={interested ? "default" : "outline"}
          size="sm"
          className="min-h-[var(--touch-target)] w-full gap-2 sm:min-h-9 sm:w-auto"
          onClick={toggle}
        >
          <Heart className={cn("h-4 w-4", interested && "fill-current")} />
          {interested ? "Érdekel (kivétel)" : "Érdekel engem"}
        </Button>
      ) : null}
    </div>
  );
}
