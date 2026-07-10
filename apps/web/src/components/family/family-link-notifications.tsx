"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, UserCheck, X, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptFamilyMemberLinkProposal,
  rejectFamilyMemberLinkProposal,
  dismissFamilyLinkProposalOutcome,
} from "@/actions/family";
import type {
  PendingFamilyLinkRequest,
  FamilyLinkProposalOutcome,
} from "@/lib/queries/family-links";
import { cn } from "@/lib/utils";

function CompactDismissButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground"
      disabled={disabled}
      onClick={onClick}
      aria-label="Bezárás"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}

function IncomingLinkRequestCard({
  request,
  disabled,
  onAccept,
  onReject,
}: {
  request: PendingFamilyLinkRequest;
  disabled: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const senderName = request.user?.name ?? "Valaki";

  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">
            <span className="text-foreground">{senderName}</span>
            <span className="text-muted-foreground"> · „{request.name}” profil</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Összekapcsolási kérelem — erősítsd meg, ha te vagy.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        <Button
          size="sm"
          className="h-9 min-h-0 w-full px-3 text-xs sm:w-auto"
          disabled={disabled}
          onClick={() => onAccept(request.id)}
        >
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          Elfogadom
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-h-0 w-full px-3 text-xs sm:w-auto"
          disabled={disabled}
          onClick={() => onReject(request.id)}
        >
          Elutasítom
        </Button>
      </div>
    </article>
  );
}

function OutcomeLinkRequestCard({
  outcome,
  disabled,
  onDismiss,
}: {
  outcome: FamilyLinkProposalOutcome;
  disabled: boolean;
  onDismiss: (id: string) => void;
}) {
  const accepted = outcome.linkProposalOutcome === "ACCEPTED";
  const responderName =
    outcome.linkedUser?.name ??
    outcome.linkProposalRespondedUser?.name ??
    "A címzett";

  return (
    <article
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 sm:items-center",
        accepted
          ? "border-emerald-500/25 bg-emerald-50/80 dark:bg-emerald-950/20"
          : "border-amber-500/25 bg-amber-50/80 dark:bg-amber-950/20"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:mt-0",
          accepted
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        )}
      >
        {accepted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">
          {accepted ? (
            <>
              „{outcome.name}” · <span className="text-emerald-700 dark:text-emerald-300">elfogadva</span>
            </>
          ) : (
            <>
              „{outcome.name}” · <span className="text-amber-700 dark:text-amber-300">elutasítva</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {accepted
            ? `${responderName} összekapcsolta a profilt a fiókjával.`
            : `${responderName} elutasította az összekapcsolási kérelmet.`}
        </p>
      </div>
      <CompactDismissButton onClick={() => onDismiss(outcome.id)} disabled={disabled} />
    </article>
  );
}

export function FamilyLinkNotifications({
  incomingRequests,
  proposalOutcomes,
}: {
  incomingRequests: PendingFamilyLinkRequest[];
  proposalOutcomes: FamilyLinkProposalOutcome[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (incomingRequests.length === 0 && proposalOutcomes.length === 0) {
    return null;
  }

  function handleAccept(familyMemberId: string) {
    startTransition(async () => {
      const result = await acceptFamilyMemberLinkProposal(familyMemberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message ?? "Profil összekapcsolva");
        router.refresh();
      }
    });
  }

  function handleReject(familyMemberId: string) {
    startTransition(async () => {
      const result = await rejectFamilyMemberLinkProposal(familyMemberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Kérelem elutasítva");
        router.refresh();
      }
    });
  }

  function handleDismiss(familyMemberId: string) {
    startTransition(async () => {
      const result = await dismissFamilyLinkProposalOutcome(familyMemberId);
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      {incomingRequests.map((request) => (
        <IncomingLinkRequestCard
          key={`in-${request.id}`}
          request={request}
          disabled={isPending}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      ))}
      {proposalOutcomes.map((outcome) => (
        <OutcomeLinkRequestCard
          key={`out-${outcome.id}`}
          outcome={outcome}
          disabled={isPending}
          onDismiss={handleDismiss}
        />
      ))}
    </section>
  );
}

/** @deprecated Használd a FamilyLinkNotifications-t */
export function FamilyLinkRequestPanel({
  requests,
}: {
  requests: PendingFamilyLinkRequest[];
}) {
  return <FamilyLinkNotifications incomingRequests={requests} proposalOutcomes={[]} />;
}
