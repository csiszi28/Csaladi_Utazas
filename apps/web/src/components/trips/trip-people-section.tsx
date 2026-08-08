"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Trash2, Users } from "lucide-react";
import { Monogram } from "@/components/monogram";
import { TripInvitePanel } from "@/components/trips/trip-invite-panel";
import { TripSectionHeading } from "@/components/trips/trip-detail-tabs";
import type { TripDetailRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import {
  TRIP_COLLABORATOR_ROLES,
  TRIP_COLLABORATOR_ROLE_LABELS,
  TRIP_ROLE_LABELS,
  buildUniqueTripPeople,
  normalizeCollaboratorRole,
  type TripRole,
} from "@csaladi-utazas/shared";
import { setTripParticipants } from "@/actions/feature-pack";
import { removeCollaborator, updateCollaboratorRole } from "@/actions/trips";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TripPeopleSectionProps {
  tripId: string;
  isOwner: boolean;
  canEdit: boolean;
  role: TripRole;
  participants: TripDetailRow["participants"];
  familyMembers: FamilyMemberRow[];
  collaborators: TripDetailRow["collaborators"];
  owner: TripDetailRow["user"];
  currentUserId: string;
  tripTitle?: string;
}

function PersonRoleBadges({
  isOwner,
  isCollaborator,
  isParticipant,
  collaboratorRole,
}: {
  isOwner: boolean;
  isCollaborator: boolean;
  isParticipant: boolean;
  collaboratorRole?: string;
}) {
  const badges: string[] = [];
  if (isOwner) badges.push("Tulajdonos");
  else if (isCollaborator) {
    badges.push(TRIP_COLLABORATOR_ROLE_LABELS[normalizeCollaboratorRole(collaboratorRole)]);
  }
  if (isParticipant) badges.push("Résztvevő");
  if (badges.length === 0) badges.push("Az utazásban");

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {badges.map((label) => (
        <span
          key={label}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function TripPeopleSection({
  tripId,
  isOwner,
  canEdit,
  role,
  participants,
  familyMembers,
  collaborators,
  owner,
  currentUserId,
  tripTitle,
}: TripPeopleSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rolePending, startRoleTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(
    null
  );
  const [selected, setSelected] = useState(() =>
    new Set(participants.map((p) => p.familyMember.id))
  );

  useEffect(() => {
    setSelected(new Set(participants.map((p) => p.familyMember.id)));
  }, [participants]);

  const uniquePeople = useMemo(
    () =>
      buildUniqueTripPeople({
        participants,
        collaborators,
        owner,
      }),
    [participants, collaborators, owner]
  );

  const manageableCollaborators = useMemo(
    () =>
      collaborators.filter(
        (c) => c.user.id !== currentUserId && c.user.id !== owner.id
      ),
    [collaborators, currentUserId, owner.id]
  );

  const linkedById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of participants) {
      map.set(p.familyMember.id, Boolean(p.familyMember.linkedUserId));
    }
    return map;
  }, [participants]);

  const ownSelectedCount = useMemo(
    () => familyMembers.filter((m) => selected.has(m.id)).length,
    [familyMembers, selected]
  );

  function toggle(id: string) {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        const remainingOwn = familyMembers.filter((m) => m.id !== id && next.has(m.id)).length;
        const othersOnTrip = participants.filter(
          (p) => !familyMembers.some((m) => m.id === p.familyMember.id)
        ).length;
        if (remainingOwn + othersOnTrip < 1) {
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
        participantIds: Array.from(selected).filter((id) =>
          familyMembers.some((m) => m.id === id)
        ),
      });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Résztvevők mentve");
        router.refresh();
      }
    });
  }

  function handleRoleChange(userId: string, newRole: "EDITOR" | "VIEWER") {
    startRoleTransition(async () => {
      const result = await updateCollaboratorRole({ tripId, userId, role: newRole });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Szerepkör frissítve");
        router.refresh();
      }
    });
  }

  function handleRemoveRequest(userId: string, name: string) {
    setRemoveTarget({ userId, name });
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    const { userId, name } = removeTarget;

    startRemoveTransition(async () => {
      const result = await removeCollaborator({ tripId, userId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRemoveTarget(null);
      toast.success(`${name} eltávolítva az utazásból`);
      router.refresh();
    });
  }

  const dirty = familyMembers.some((m) => {
    const wasOn = participants.some((p) => p.familyMember.id === m.id);
    const isOn = selected.has(m.id);
    return wasOn !== isOn;
  });

  const actionPending = rolePending || removePending;

  return (
    <div className="space-y-6">
      {!canEdit ? (
        <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
          Csak olvasási jogod van ehhez az utazáshoz ({TRIP_ROLE_LABELS[role]}).
        </p>
      ) : null}

      <section className="space-y-4">
        <TripSectionHeading
          title="Emberek az utazásban"
          description={`${uniquePeople.length} fő — résztvevők és közreműködők, mindenki egyszer`}
        />

        {uniquePeople.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {uniquePeople.map((person) => (
              <li
                key={person.key}
                className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-3"
              >
                <Monogram name={person.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {person.name}
                    {person.userId === currentUserId ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (te)
                      </span>
                    ) : null}
                  </p>
                  {person.email ? (
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  ) : null}
                  <PersonRoleBadges
                    isOwner={person.isOwner}
                    isCollaborator={person.isCollaborator}
                    isParticipant={person.isParticipant}
                    collaboratorRole={person.collaboratorRole}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-5 w-5 opacity-50" />
            Még nincsenek emberek az utazásban.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <TripSectionHeading
          title="Saját családtagok"
          description={
            canEdit
              ? "Kapcsold be vagy ki a saját családtagjaidat az utazásban"
              : "A te családtagjaid az utazásban"
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
                        {active ? null : " · nincs az utazásban"}
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
        {canEdit && ownSelectedCount === 0 && familyMembers.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Ha egyik saját családtagod sincs bekapcsolva, a többiek résztvevői továbbra is
            megmaradnak.
          </p>
        ) : null}
      </section>

      {isOwner && manageableCollaborators.length > 0 && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Közreműködők kezelése"
            description="Szerepkör módosítása vagy eltávolítás"
          />
          <ul className="divide-y rounded-xl border">
            {manageableCollaborators.map((collaborator) => {
              const collabRole = normalizeCollaboratorRole(collaborator.role);
              return (
                <li
                  key={collaborator.id}
                  className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-3"
                >
                  <Monogram name={collaborator.user.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{collaborator.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collaborator.user.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Select
                      value={collabRole}
                      onValueChange={(value) =>
                        handleRoleChange(collaborator.user.id, value as "EDITOR" | "VIEWER")
                      }
                      disabled={actionPending}
                    >
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_COLLABORATOR_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {TRIP_COLLABORATOR_ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      disabled={actionPending}
                      aria-label={`${collaborator.user.name} eltávolítása`}
                      title="Eltávolítás az utazásból"
                      onClick={() =>
                        handleRemoveRequest(collaborator.user.id, collaborator.user.name)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {isOwner && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Meghívó"
            description="Hívd meg a családtagokat az utazásba"
          />
          <TripInvitePanel tripId={tripId} isOwner={isOwner} tripTitle={tripTitle} />
        </section>
      )}

      <Dialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open && !removePending) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md" hideCloseButton={removePending}>
          <DialogHeader>
            <DialogTitle>Közreműködő eltávolítása</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Biztosan eltávolítod{" "}
              <span className="font-medium text-foreground">{removeTarget?.name}</span>{" "}
              közreműködőt
              {tripTitle ? (
                <>
                  {" "}
                  a(z) <span className="font-medium text-foreground">„{tripTitle}”</span>{" "}
                  utazásból
                </>
              ) : (
                " az utazásból"
              )}
              ?
            </p>
            <p className="text-xs text-muted-foreground">
              Elveszíti a hozzáférést, és erről értesítést kap. A résztvevő listát ez nem
              módosítja automatikusan.
            </p>
          </DialogBody>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[var(--touch-target)] sm:min-h-9"
              disabled={removePending}
              onClick={() => setRemoveTarget(null)}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[var(--touch-target)] sm:min-h-9"
              disabled={removePending}
              onClick={handleRemoveConfirm}
            >
              {removePending ? "Eltávolítás…" : "Eltávolítás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
