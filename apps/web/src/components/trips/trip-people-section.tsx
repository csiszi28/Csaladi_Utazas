"use client";

import { Users } from "lucide-react";
import { Monogram } from "@/components/monogram";
import { TripInvitePanel } from "@/components/trips/trip-invite-panel";
import { TripSectionHeading } from "@/components/trips/trip-detail-tabs";
import type { TripDetailRow } from "@/lib/queries/trips";

interface TripPeopleSectionProps {
  tripId: string;
  isOwner: boolean;
  participants: TripDetailRow["participants"];
}

export function TripPeopleSection({ tripId, isOwner, participants }: TripPeopleSectionProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <TripSectionHeading
          title="Résztvevők"
          description="Az utazásban szereplő családtagok"
        />

        {participants.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {participants.map((p) => {
              const member = p.familyMember;
              const linked = Boolean(member.linkedUserId);

              return (
                <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <Monogram name={member.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {linked ? "Csatlakozott fiókkal" : "Még nincs csatlakozott fiók"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Még nincsenek résztvevők. Szerkeszd az utazást, vagy küldj meghívót.
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
