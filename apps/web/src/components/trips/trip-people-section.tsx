"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { Trash2, UserMinus, UserPlus, Users } from "lucide-react";
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
import { removeTripParticipant, setTripParticipants } from "@/actions/feature-pack";
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
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface TripPeopleSectionProps {
  tripId: string;
  isOwner: boolean;
  canEdit: boolean;
  role: TripRole;
  participants: TripDetailRow["participants"];
  familyMembers: FamilyMemberRow[];
  /** Közreműködők családtagjai (csak a tulajdonosnak). */
  otherMembers?: { id: string; name: string; userId: string | null; linkedUserId: string | null }[];
  collaborators: TripDetailRow["collaborators"];
  owner: TripDetailRow["user"];
  currentUserId: string;
  tripTitle?: string;
}

function PersonRoleBadges({
  isOwner,
  isCollaborator,
  isParticipant,
  hasAccount,
  collaboratorRole,
  isChild,
}: {
  isOwner: boolean;
  isCollaborator: boolean;
  isParticipant: boolean;
  hasAccount: boolean;
  collaboratorRole?: string;
  isChild?: boolean;
}) {
  // Két külön dolog: ki fér hozzá az úthoz (szerep), és ki utazik (résztvevő)
  const badges: { label: string; tone?: "access" | "muted" }[] = [];
  if (isOwner) badges.push({ label: "Tulajdonos", tone: "access" });
  else if (isCollaborator) {
    badges.push({
      label: `Hozzáférés: ${TRIP_COLLABORATOR_ROLE_LABELS[normalizeCollaboratorRole(collaboratorRole)]}`,
      tone: "access",
    });
  }
  badges.push(isParticipant ? { label: "Utazik" } : { label: "Nem utazik", tone: "muted" });
  if (isChild) badges.push({ label: "Gyerek" });
  if (!hasAccount) badges.push({ label: "Fiók nélkül", tone: "muted" });

  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {badges.map(({ label, tone }) => (
        <span
          key={label}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium",
            tone === "access"
              ? "bg-primary/10 text-primary"
              : tone === "muted"
                ? "bg-muted/60 text-muted-foreground"
                : "bg-muted text-muted-foreground"
          )}
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
  familyMembers: ownFamilyMembers,
  otherMembers = [],
  collaborators,
  owner,
  currentUserId,
  tripTitle,
}: TripPeopleSectionProps) {
  const router = useRouter();
  const confirm = useConfirm();
  // A tulajdonos a közreműködők családtagjait is kezelheti; a többiek a saját háztartásukat adhatják hozzá, de csak magukat vehetik ki.
  const familyMembers = useMemo<
    { id: string; name: string; userId?: string | null; linkedUserId?: string | null }[]
  >(
    () => (isOwner ? [...ownFamilyMembers, ...otherMembers] : ownFamilyMembers),
    [isOwner, ownFamilyMembers, otherMembers]
  );
  const householdLabel = (userId?: string | null) => {
    if (!userId || userId === currentUserId) return "A te családtagjaid";
    const name =
      collaborators.find((c) => c.user.id === userId)?.user.name ??
      (owner.id === userId ? owner.name : null);
    return name ? `${name} családtagjai` : "Másik háztartás";
  };
  const householdGroups = useMemo(() => {
    const groups: { key: string; label: string; members: typeof familyMembers }[] = [];
    for (const m of familyMembers) {
      const key = m.userId && m.userId !== currentUserId ? m.userId : "own";
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label: householdLabel(m.userId), members: [] };
        groups.push(g);
      }
      g.members.push(m);
    }
    groups.sort((a, b) => (a.key === "own" ? -1 : b.key === "own" ? 1 : 0));
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyMembers, currentUserId, collaborators, owner]);
  const [pending, startTransition] = useTransition();
  const [rolePending, startRoleTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(
    null
  );
  const [alsoRemoveParticipants, setAlsoRemoveParticipants] = useState(true);
  const [participantRemovePending, startParticipantRemoveTransition] = useTransition();
  const [selected, setSelected] = useState(() =>
    new Set(participants.map((p) => p.familyMember.id))
  );

  useEffect(() => {
    setSelected(new Set(participants.map((p) => p.familyMember.id)));
  }, [participants]);

  const childFamilyMemberIds = useMemo(
    () =>
      new Set(
        participants
          .filter((p) => (p.familyMember as { isChild?: boolean }).isChild)
          .map((p) => p.familyMember.id)
      ),
    [participants]
  );

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
        const target = familyMembers.find((m) => m.id === id);
        if (!isOwner && target?.linkedUserId !== currentUserId) {
          toast.error("Csak saját magadat veheted ki — a többieket az utazás tulajdonosa kezelheti");
          return prev;
        }
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
    setAlsoRemoveParticipants(true);
    setRemoveTarget({ userId, name });
  }

  /** Egy résztvevő kivétele az útról (a tulajdonos bárkit, a szerkesztő a sajátjait). */
  async function handleRemoveParticipant(familyMemberId: string, name: string) {
    const ok = await confirm({
      title: "Kivétel a résztvevők közül",
      description: (
        <>
          Biztosan kiveszed <span className="font-medium text-foreground">{name}</span> az utazás
          résztvevői közül?
        </>
      ),
      confirmLabel: "Kivétel",
      destructive: true,
    });
    if (!ok) return;
    startParticipantRemoveTransition(async () => {
      const result = await removeTripParticipant({ tripId, familyMemberId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} kikerült a résztvevők közül`);
      router.refresh();
    });
  }

  function canRemoveParticipant(person: (typeof uniquePeople)[number]) {
    if (!canEdit || !person.isParticipant || !person.familyMemberId) return false;
    if (participants.length <= 1) return false;
    return isOwner || person.userId === currentUserId;
  }

  /** A személyhez tartozó, általam kezelhető családtag-azonosító (ha van). */
  function manageableMemberId(person: (typeof uniquePeople)[number]): string | null {
    if (person.familyMemberId && familyMembers.some((m) => m.id === person.familyMemberId)) {
      return person.familyMemberId;
    }
    if (person.userId) {
      return familyMembers.find((m) => m.linkedUserId === person.userId)?.id ?? null;
    }
    return null;
  }

  function canAddParticipant(person: (typeof uniquePeople)[number]) {
    if (!canEdit || person.isParticipant) return false;
    if (!isOwner && person.userId !== currentUserId) return false;
    return manageableMemberId(person) != null;
  }

  function handleAddParticipant(memberId: string, name: string) {
    startParticipantRemoveTransition(async () => {
      const ids = new Set(familyMembers.filter((m) => selected.has(m.id)).map((m) => m.id));
      ids.add(memberId);
      const result = await setTripParticipants({ tripId, participantIds: Array.from(ids) });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} hozzáadva a résztvevőkhöz`);
      router.refresh();
    });
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    const { userId, name } = removeTarget;

    startRemoveTransition(async () => {
      const result = await removeCollaborator({
        tripId,
        userId,
        removeParticipants: alsoRemoveParticipants,
      });
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
          description={`${uniquePeople.length} fő — mindenki egyszer. A „Hozzáférés” azt jelenti, ki nyithatja meg az utat, az „Utazik” pedig azt, hogy ki van a résztvevők között.`}
        />

        {uniquePeople.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {uniquePeople.map((person) => (
              <li
                key={person.key}
                className="flex min-h-[var(--touch-target)] items-center gap-3 px-4 py-3"
              >
                <Monogram
                  name={person.name}
                  memberId={person.familyMemberId}
                  userId={person.userId}
                  size="md"
                />
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
                    hasAccount={Boolean(person.userId)}
                    collaboratorRole={person.collaboratorRole}
                    isChild={childFamilyMemberIds.has(person.familyMemberId ?? "")}
                  />
                </div>
                {canAddParticipant(person) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                    disabled={participantRemovePending || pending}
                    aria-label={`${person.name} hozzáadása a résztvevőkhöz`}
                    title="Hozzáadás a résztvevőkhöz"
                    onClick={() => handleAddParticipant(manageableMemberId(person)!, person.name)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                ) : null}
                {canRemoveParticipant(person) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={participantRemovePending || pending}
                    aria-label={`${person.name} kivétele a résztvevők közül`}
                    title="Kivétel a résztvevők közül"
                    onClick={() => handleRemoveParticipant(person.familyMemberId!, person.name)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                ) : null}
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
          title={isOwner && otherMembers.length > 0 ? "Résztvevők kezelése" : "A te családtagjaid ezen az úton"}
          description={
            canEdit
              ? isOwner
                ? "Tulajdonosként bárkit hozzáadhatsz vagy kivehetsz az útról — a saját és a közreműködők családtagjait is. Mentés után lép életbe."
                : "Jelöld be, kik utaznak a családodból. Más családok résztvevőit a saját gazdájuk (vagy az út tulajdonosa) kezeli."
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
          <div className="space-y-4">
            {householdGroups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                {householdGroups.length > 1 ? (
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                ) : null}
                <ul className="divide-y rounded-xl border">
                  {group.members.map((member) => {
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
                          <Monogram name={member.name} memberId={member.id} size="md" />
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
              </div>
            ))}
          </div>
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
                  <Monogram
                    name={collaborator.user.name}
                    userId={collaborator.user.id}
                    size="md"
                  />
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
              Elveszíti a hozzáférést, és erről értesítést kap.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                checked={alsoRemoveParticipants}
                onChange={(e) => setAlsoRemoveParticipants(e.target.checked)}
                disabled={removePending}
              />
              <span>
                A hozzá tartozó résztvevői sorokat is vedd ki az utazásról
                <span className="block text-xs text-muted-foreground">
                  Ha nincs bejelölve, résztvevőként (pl. az elszámolásban) tovább szerepel.
                </span>
              </span>
            </label>
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
