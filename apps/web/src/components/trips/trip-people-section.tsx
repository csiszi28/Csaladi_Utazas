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
  currentUserId: string;
  tripTitle?: string;
}

function CollaboratorRow({
  collaborator,
  isOwner,
  onRoleChange,
  onRemove,
  pending,
}: {
  collaborator: TripDetailRow["collaborators"][number];
  isOwner: boolean;
  onRoleChange: (userId: string, role: "EDITOR" | "VIEWER") => void;
  onRemove: (userId: string, name: string) => void;
  pending: boolean;
}) {
  const role = normalizeCollaboratorRole(collaborator.role);

  return (
    <li className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-3">
      <Monogram name={collaborator.user.name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{collaborator.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{collaborator.user.email}</p>
      </div>
      {isOwner ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Select
            value={role}
            onValueChange={(value) =>
              onRoleChange(collaborator.user.id, value as "EDITOR" | "VIEWER")
            }
            disabled={pending}
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
            disabled={pending}
            aria-label={`${collaborator.user.name} eltávolítása`}
            title="Eltávolítás az utazásból"
            onClick={() => onRemove(collaborator.user.id, collaborator.user.name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {TRIP_COLLABORATOR_ROLE_LABELS[role]}
        </span>
      )}
    </li>
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

  const dirty =
    selected.size !== participants.length ||
    participants.some((p) => !selected.has(p.familyMember.id));

  const otherCollaborators = collaborators.filter((c) => c.user.id !== currentUserId);
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

      {otherCollaborators.length > 0 && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Közreműködők"
            description={
              isOwner
                ? "Kezeld a meghívott felhasználók szerepkörét, vagy távolítsd el őket"
                : "Az utazáshoz csatlakozott felhasználók"
            }
          />
          <ul className="divide-y rounded-xl border">
            {otherCollaborators.map((collaborator) => (
              <CollaboratorRow
                key={collaborator.id}
                collaborator={collaborator}
                isOwner={isOwner}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveRequest}
                pending={actionPending}
              />
            ))}
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
