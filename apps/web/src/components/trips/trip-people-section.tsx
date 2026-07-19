"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Users } from "lucide-react";
import { Monogram } from "@/components/monogram";
import { TripInvitePanel } from "@/components/trips/trip-invite-panel";
import { TripSectionHeading } from "@/components/trips/trip-detail-tabs";
import type { TripDetailRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { setTripParticipants } from "@/actions/feature-pack";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TripPeopleSectionProps {
  tripId: string;
  isOwner: boolean;
  canEdit: boolean;
  participants: TripDetailRow["participants"];
  familyMembers: FamilyMemberRow[];
}

export function TripPeopleSection({
  tripId,
  isOwner,
  canEdit,
  participants,
  familyMembers,
}: TripPeopleSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() =>
    new Set(participants.map((p) => p.familyMember.id))
  );

  useEffect(() => {
    setSelected(new Set(participants.map((p) => p.familyMember.id)));
  }, [participants]);

  const linkedById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of participants) {
      map.set(p.familyMember.id, Boolean(p.familyMember.linkedUserId));
    }
    return map;
  }, [participants]);

  function toggle(id: string) {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          toast.error("Legalább egy résztvevő kötelező");
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setTripParticipants({
        tripId,
        participantIds: Array.from(selected),
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Résztvevők mentve");
        router.refresh();
      }
    });
  }

  const dirty =
    selected.size !== participants.length ||
    participants.some((p) => !selected.has(p.familyMember.id));

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <TripSectionHeading
          title="Résztvevők"
          description={
            canEdit
              ? "Kapcsold be vagy ki a családtagokat az utazásban"
              : "Az utazásban szereplő családtagok"
          }
          action={
            canEdit && dirty ? (
              <Button
                type="button"
                size="sm"
                className="min-h-9"
                disabled={pending}
                onClick={handleSave}
              >
                Mentés
              </Button>
            ) : null
          }
        />

        {familyMembers.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {familyMembers.map((member) => {
              const active = selected.has(member.id);
              const linked = linkedById.get(member.id) ?? Boolean(member.linkedUserId);
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    disabled={!canEdit || pending}
                    onClick={() => toggle(member.id)}
                    className={cn(
                      "flex w-full min-h-[var(--touch-target)] items-center gap-3 px-4 py-3 text-left transition-colors",
                      canEdit && "hover:bg-muted/40",
                      active ? "bg-primary/5" : "opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {active ? "✓" : ""}
                    </span>
                    <Monogram name={member.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {linked ? "Csatlakozott fiókkal" : "Nincs csatlakozott fiók"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Még nincsenek családtagok. Add hozzá őket a Család oldalon.
          </p>
        )}
      </section>

      {isOwner && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Meghívó"
            description="Hívd meg a családtagokat az utazásba"
          />
          <TripInvitePanel tripId={tripId} isOwner={isOwner} />
        </section>
      )}
    </div>
  );
}
