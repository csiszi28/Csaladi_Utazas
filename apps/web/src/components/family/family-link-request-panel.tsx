"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptFamilyMemberLinkProposal,
  rejectFamilyMemberLinkProposal,
} from "@/actions/family";
import type { PendingFamilyLinkRequest } from "@/lib/queries/family-links";

export function FamilyLinkRequestPanel({
  requests,
}: {
  requests: PendingFamilyLinkRequest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) return null;

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
        toast.success("Összekapcsolási kérelem elutasítva");
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Összekapcsolási kérelmek</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Valaki a családod profilját a fiókodhoz szeretné kötni. Erősítsd meg, ha te vagy az.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <article
            key={request.id}
            className="rounded-xl border bg-card p-4"
          >
            <p className="font-medium">
              {request.user.name} szeretné összekapcsolni veled a „{request.name}” profilt
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ha elfogadod, hozzáférsz az ehhez a profilhoz rendelt utazásokhoz és adatokhoz.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                className="min-h-[var(--touch-target)] sm:min-h-9"
                disabled={isPending}
                onClick={() => handleAccept(request.id)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Igen, összekapcsolom
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[var(--touch-target)] sm:min-h-9"
                disabled={isPending}
                onClick={() => handleReject(request.id)}
              >
                <X className="mr-2 h-4 w-4" />
                Elutasítom
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
