"use client";

import { useTransition } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimFamilyMemberProfile } from "@/actions/family";

interface TripClaimProfilePanelProps {
  tripId: string;
  currentUserId: string;
  participants: {
    id: string;
    name: string;
    linkedUserId: string | null;
  }[];
}

export function TripClaimProfilePanel({
  tripId,
  currentUserId,
  participants,
}: TripClaimProfilePanelProps) {
  const [isPending, startTransition] = useTransition();

  const alreadyLinked = participants.some((p) => p.linkedUserId === currentUserId);
  const claimable = participants.filter((p) => !p.linkedUserId);

  if (alreadyLinked || claimable.length === 0) return null;

  function handleClaim(familyMemberId: string) {
    startTransition(async () => {
      const result = await claimFamilyMemberProfile({ familyMemberId, tripId });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Profil összekapcsolva a fiókoddal");
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-3 sm:p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <UserCheck className="h-4 w-4 text-primary" />
        Profil összekapcsolás
      </p>
      <p className="text-sm text-muted-foreground">
        Ha a listában szerepel a neved, összekapcsolhatod a fiókoddal — így az érdeklődés-jelölések
        és elszámolások a te profilodhoz kötődnek.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {claimable.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            className="w-full min-h-[var(--touch-target)] sm:w-auto sm:min-h-0"
            disabled={isPending}
            onClick={() => handleClaim(p.id)}
          >
            Ez én vagyok: {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
