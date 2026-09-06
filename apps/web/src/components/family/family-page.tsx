"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Link2,
  Unlink,
  Users,
  UserCircle2,
  Sparkles,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Monogram } from "@/components/monogram";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  linkFamilyMemberToAccount,
  unlinkFamilyMemberFromAccount,
  proposeFamilyMemberLink,
  cancelFamilyMemberLinkProposal,
} from "@/actions/family";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { cn } from "@/lib/utils";

type MemberStatus = "linked-self" | "linked-other" | "virtual";

function memberStatus(member: FamilyMemberRow, currentUserId: string): MemberStatus {
  if (member.linkedUserId === currentUserId) return "linked-self";
  if (member.linkedUserId) return "linked-other";
  return "virtual";
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  "linked-self": "A fiókodhoz kapcsolt",
  "linked-other": "Regisztrált fiók",
  virtual: "Virtuális profil",
};

const STATUS_STYLES: Record<MemberStatus, string> = {
  "linked-self": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "linked-other": "bg-primary/10 text-primary",
  virtual: "bg-muted text-foreground",
};

function FamilyMemberCard({
  member,
  currentUserId,
  isPending,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  onProposeLink,
  onCancelProposal,
}: {
  member: FamilyMemberRow;
  currentUserId: string;
  isPending: boolean;
  onEdit: (member: FamilyMemberRow) => void;
  onDelete: (id: string) => void;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
  onProposeLink: (id: string) => void;
  onCancelProposal: (id: string) => void;
}) {
  const status = memberStatus(member, currentUserId);
  const isLinkedToMe = status === "linked-self";

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:justify-center sm:border-r sm:pr-5">
          <Monogram name={member.name} memberId={member.id} size="lg" className="h-16 w-16 sm:h-20 sm:w-20" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-bold tracking-tight">
                {member.name}
                {member.isChild ? (
                  <span className="ml-2 inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Gyerek
                  </span>
                ) : null}
              </h3>
              {member.linkedUser && status === "linked-other" && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{member.linkedUser.email}</span>
                </p>
              )}
              {status === "virtual" && member.email && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </p>
              )}
              {status === "virtual" && (
                <p className="mt-1 text-sm text-foreground">
                  {member.pendingLinkUser
                    ? `${member.pendingLinkUser.name} kapott összekapcsolási kérelmet — bejelentkezéskor erősítheti meg.`
                    : member.email
                      ? "Ha regisztrált fiókja van ehhez az e-mail címhez, javasolhatod az összekapcsolást."
                      : "Még nincs regisztrált fiókhoz rendelve — utazásokhoz így is hozzáadható."}
                </p>
              )}
              {isLinkedToMe && (
                <p className="mt-1 text-sm text-foreground">
                  Ez a profil a te bejelentkezett fiókodhoz tartozik.
                </p>
              )}
              {member.isChild ? (
                <p className="mt-1 text-xs text-foreground">
                  Nem szerepel a fennmaradó kiegyenlítésekben.
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md px-2.5 py-0.5 text-xs font-medium",
                STATUS_STYLES[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 self-start sm:self-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onEdit(member)}
            disabled={isPending}
            title="Szerkesztés"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onDelete(member.id)}
            disabled={isPending}
            title="Törlés"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(status === "virtual" || isLinkedToMe) && (
        <div className="flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
          {status === "virtual" && member.email && !member.pendingLinkUserId && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
              onClick={() => onProposeLink(member.id)}
              disabled={isPending}
            >
              <Link2 className="h-4 w-4" />
              Összekapcsolás javaslata
            </Button>
          )}
          {status === "virtual" && member.pendingLinkUser && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[var(--touch-target)] flex-1 text-foreground sm:min-h-9 sm:flex-none"
              onClick={() => onCancelProposal(member.id)}
              disabled={isPending}
            >
              Kérelem visszavonása
            </Button>
          )}
          {status === "virtual" && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
              onClick={() => onLink(member.id)}
              disabled={isPending}
            >
              <Link2 className="h-4 w-4" />
              Összekapcsolás a fiókommal
            </Button>
          )}
          {isLinkedToMe && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[var(--touch-target)] flex-1 text-foreground sm:min-h-9 sm:flex-none"
              onClick={() => onUnlink(member.id)}
              disabled={isPending}
            >
              <Unlink className="h-4 w-4" />
              Összekapcsolás megszüntetése
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export function FamilyPage({
  members: initialMembers,
  currentUserId,
}: {
  members: FamilyMemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isChild, setIsChild] = useState(false);
  const [proposeTarget, setProposeTarget] = useState<{
    memberId: string;
    user: { id: string; name: string; email: string };
  } | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const grouped = useMemo(() => {
    const linkedSelf: FamilyMemberRow[] = [];
    const linkedOther: FamilyMemberRow[] = [];
    const virtual: FamilyMemberRow[] = [];

    for (const member of members) {
      const status = memberStatus(member, currentUserId);
      if (status === "linked-self") linkedSelf.push(member);
      else if (status === "linked-other") linkedOther.push(member);
      else virtual.push(member);
    }

    return { linkedSelf, linkedOther, virtual };
  }, [members, currentUserId]);

  const linkedCount = grouped.linkedSelf.length + grouped.linkedOther.length;

  function openCreate() {
    setEditingId(null);
    setName("");
    setEmail("");
    setIsChild(false);
    setDialogOpen(true);
  }

  function openEdit(member: FamilyMemberRow) {
    setEditingId(member.id);
    setName(member.name);
    setEmail(member.email ?? "");
    setIsChild(Boolean(member.isChild));
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        email: email.trim() || undefined,
        isChild,
      };
      const result = editingId
        ? await updateFamilyMember({ id: editingId, ...payload })
        : await createFamilyMember(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const memberId =
        editingId ??
        ("id" in result.data ? (result.data as { id: string }).id : undefined);
      const matched = result.data.matchedRegisteredUser;

      if (matched && memberId) {
        setDialogOpen(false);
        setProposeTarget({ memberId, user: matched });
        router.refresh();
        return;
      }

      toast.success(editingId ? "Családtag frissítve" : "Családtag létrehozva");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleProposeLink(memberId: string) {
    startTransition(async () => {
      const result = await proposeFamilyMemberLink({ familyMemberId: memberId });
      if (!result.success) toast.error(result.error);
      else {
        toast.success(result.message ?? "Összekapcsolási kérelem elküldve");
        setProposeTarget(null);
        router.refresh();
      }
    });
  }

  function handleCancelProposal(memberId: string) {
    startTransition(async () => {
      const result = await cancelFamilyMemberLinkProposal(memberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Kérelem visszavonva");
        router.refresh();
      }
    });
  }

  function confirmProposeTarget() {
    if (!proposeTarget) return;
    handleProposeLink(proposeTarget.memberId);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFamilyMember(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Családtag törölve");
        router.refresh();
      }
    });
  }

  function handleLink(memberId: string) {
    startTransition(async () => {
      const result = await linkFamilyMemberToAccount({ familyMemberId: memberId });
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Profil összekapcsolva a fiókoddal");
        router.refresh();
      }
    });
  }

  function handleUnlink(memberId: string) {
    startTransition(async () => {
      const result = await unlinkFamilyMemberFromAccount(memberId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Összekapcsolás megszüntetve");
        router.refresh();
      }
    });
  }

  function renderSection(title: string, items: FamilyMemberRow[], description?: string) {
    if (items.length === 0) return null;

    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              currentUserId={currentUserId}
              isPending={isPending}
              onEdit={openEdit}
              onDelete={handleDelete}
              onLink={handleLink}
              onUnlink={handleUnlink}
              onProposeLink={handleProposeLink}
              onCancelProposal={handleCancelProposal}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Család kezelése
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Családtagok</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Hozz létre virtuális profilokat gyerekeknek vagy más családtagoknak, majd kapcsold
              össze őket regisztrált fiókokkal az utazások tervezéséhez.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="min-h-[var(--touch-target)] w-full sm:min-h-10 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Új családtag
          </Button>
        </div>

        {members.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <span className="rounded-md bg-background px-3 py-1 text-sm shadow-sm">
              {members.length} családtag
            </span>
            {linkedCount > 0 && (
              <span className="rounded-md bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {linkedCount} összekapcsolt
              </span>
            )}
            {grouped.virtual.length > 0 && (
              <span className="rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
                {grouped.virtual.length} virtuális
              </span>
            )}
          </div>
        )}
      </section>

      {members.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Még nincs családtag</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Adj hozzá legalább egy profilt, hogy résztvevőket választhass az utazásokhoz.
          </p>
          <Button onClick={openCreate} className="mt-6">
            <Plus className="h-4 w-4" />
            Első családtag hozzáadása
          </Button>
        </section>
      ) : (
        <div className="space-y-8">
          {renderSection(
            "A fiókodhoz kapcsolt",
            grouped.linkedSelf,
            "Ezek a profilok a bejelentkezett fiókodhoz tartoznak."
          )}
          {renderSection(
            "Virtuális profilok",
            grouped.virtual,
            "Gyerekek vagy még nem regisztrált családtagok — később összekapcsolhatod fiókkal."
          )}
          {renderSection(
            "Más fiókhoz kapcsolt",
            grouped.linkedOther,
            "Már regisztrált felhasználókhoz rendelt profilok."
          )}

          <section className="rounded-2xl border border-dashed bg-muted/10 p-4 sm:p-5">
            <div className="flex gap-3">
              <UserCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Hogyan működik az összekapcsolás?</p>
                <p className="text-muted-foreground">
                  Adj meg e-mail címet a virtuális profilokhoz. Ha már van regisztrált fiókja,
                  javasolhatod az összekapcsolást — a másik félnek bejelentkezéskor kell
                  megerősítenie. Új regisztráció esetén automatikusan összekapcsolódik.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Családtag szerkesztése" : "Új családtag"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-1.5">
              <Label htmlFor="member-name">
                Név
              </Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. Anna, Péter"
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">
                E-mail (opcionális)
              </Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@pelda.hu"
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <p className="text-xs text-foreground">
                Ha regisztrált fiók tartozik hozzá, összekapcsolási kérelmet küldhetsz.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="member-is-child" className="text-sm font-medium">
                  Gyerek
                </Label>
                <p className="text-xs text-foreground">
                  Nem jelenik meg a fennmaradó kiegyenlítések között.
                </p>
              </div>
              <Switch
                id="member-is-child"
                checked={isChild}
                onCheckedChange={setIsChild}
                disabled={isPending}
                aria-label="Gyerek jelölés"
              />
            </div>
          </DialogBody>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Mégse
            </Button>
            <Button size="sm" className="w-full" onClick={handleSubmit} disabled={isPending}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={proposeTarget !== null} onOpenChange={(open) => !open && setProposeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Összekapcsolás javaslata</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {proposeTarget && (
              <p className="text-sm text-muted-foreground">
                A(z) <strong className="text-foreground">{proposeTarget.user.email}</strong> címhez
                már tartozik regisztrált fiók ({proposeTarget.user.name}). Szeretnéd összekapcsolni
                ezzel a profillal? A másik félnek bejelentkezéskor kell megerősítenie.
              </p>
            )}
          </DialogBody>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setProposeTarget(null)}
              disabled={isPending}
            >
              Később
            </Button>
            <Button size="sm" className="w-full" onClick={confirmProposeTarget} disabled={isPending}>
              Kérelem küldése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
