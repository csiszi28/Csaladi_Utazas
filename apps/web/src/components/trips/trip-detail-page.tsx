"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Download, Copy, MapPin, Calendar, UserPlus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatDate, COST_CATEGORY_LABELS } from "@csaladi-utazas/shared";
import { MoneyDisplay } from "@/components/money-display";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { deleteTrip } from "@/actions/trips";
import { deleteProgram } from "@/actions/programs";
import { deleteCost } from "@/actions/costs";
import type { FamilyMemberRow } from "@/lib/queries/family";
import type { TripDetailRow } from "@/lib/queries/trips";
import { TripFormDrawer } from "./trip-form-drawer";
import { ProgramFormDrawer } from "./program-form-drawer";
import { CostFormDrawer } from "./cost-form-drawer";
import { DocumentUpload, type DocumentItem } from "@/components/documents/document-upload";
import { TripInvitePanel } from "@/components/trips/trip-invite-panel";
import { TripIdeasSection } from "@/components/trips/trip-ideas-section";
import { TripDetailTabs, TripSectionHeading, type TripDetailTab } from "@/components/trips/trip-detail-tabs";
import { TripBudgetPanel } from "@/components/trips/trip-budget-panel";
import { TripSettlementPanel } from "@/components/trips/trip-settlement-panel";
import { DuplicateTripDialog } from "@/components/trips/duplicate-trip-dialog";
import { TripClaimProfilePanel } from "@/components/trips/trip-claim-profile-panel";
import { DocumentChecklistPanel } from "@/components/documents/document-checklist-panel";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { TRIP_SECTION_BTN_CLASS } from "@/components/trips/trip-section-styles";

function programDateParts(date: Date | string) {
  const d = new Date(date);
  return {
    month: d.toLocaleDateString("hu-HU", { month: "short" }).replace(".", ""),
    day: d.getDate(),
    weekday: d.toLocaleDateString("hu-HU", { weekday: "short" }),
  };
}

export function TripDetailPage({
  trip,
  members,
  currentUserId,
  currentUserName,
}: {
  trip: TripDetailRow;
  members: FamilyMemberRow[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [programDrawerOpen, setProgramDrawerOpen] = useState(false);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [ideaOpenSignal, setIdeaOpenSignal] = useState(0);
  const [editingProgram, setEditingProgram] = useState<TripDetailRow["programs"][0] | null>(null);
  const [editingCost, setEditingCost] = useState<TripDetailRow["costs"][0] | null>(null);
  const [defaultIdeaId, setDefaultIdeaId] = useState<string | undefined>();
  const [defaultCostProgramId, setDefaultCostProgramId] = useState<string | undefined>();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TripDetailTab>("planning");
  const [localCosts, setLocalCosts] = useState(trip.costs);
  const [localDocuments, setLocalDocuments] = useState(trip.documents);

  useEffect(() => {
    setLocalDocuments(trip.documents);
  }, [trip.id, trip.documents]);

  const documentsFingerprint = useMemo(
    () =>
      trip.documents
        .map((d) => `${d.id}:${d.fileName}:${d.category}:${d.familyMemberId ?? ""}`)
        .join("|"),
    [trip.documents]
  );

  useEffect(() => {
    setLocalDocuments((prev) => {
      const serverIds = new Set(trip.documents.map((d) => d.id));
      const pending = prev.filter((d) => d.id.startsWith("temp-") || !serverIds.has(d.id));
      const merged = [...pending, ...trip.documents];
      const seen = new Set<string>();
      return merged.filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
    });
  }, [documentsFingerprint, trip.documents]);

  const costsFingerprint = useMemo(
    () => trip.costs.map((c) => `${c.id}:${c.title}:${c.amount}`).join("|"),
    [trip.costs]
  );

  useEffect(() => {
    setLocalCosts((prev) => {
      const serverIds = new Set(trip.costs.map((c) => c.id));
      const pending = prev.filter((c) => c.id.startsWith("temp-") || !serverIds.has(c.id));
      const merged = [...pending, ...trip.costs];
      const seen = new Set<string>();
      return merged.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    });
  }, [costsFingerprint, trip.costs]);

  useEffect(() => {
    const action = searchParams.get("new");
    if (action === "program") {
      setEditingProgram(null);
      setActiveTab("planning");
      setProgramDrawerOpen(true);
    } else if (action === "cost") {
      setEditingCost(null);
      setActiveTab("finances");
      setCostDrawerOpen(true);
    }
  }, [searchParams]);

  const programTitleById = useMemo(
    () => new Map(trip.programs.map((program) => [program.id, program.title])),
    [trip.programs]
  );

  const participantNameById = useMemo(
    () => new Map(trip.participants.map((p) => [p.familyMember.id, p.familyMember.name])),
    [trip.participants]
  );

  const convertedIdeaIds = useMemo(
    () =>
      new Set(
        trip.programs
          .map((program) => program.ideaId)
          .filter((id): id is string => Boolean(id))
      ),
    [trip.programs]
  );

  function handleConvertIdeaToProgram(ideaId: string) {
    setEditingProgram(null);
    setDefaultIdeaId(ideaId);
    setActiveTab("planning");
    setProgramDrawerOpen(true);
  }

  function handleProgramDrawerChange(open: boolean) {
    setProgramDrawerOpen(open);
    if (!open) setDefaultIdeaId(undefined);
  }

  function handleCostDrawerChange(open: boolean) {
    setCostDrawerOpen(open);
    if (!open) setDefaultCostProgramId(undefined);
  }

  function handleAddCostForProgram(programId: string) {
    setEditingCost(null);
    setDefaultCostProgramId(programId);
    setActiveTab("finances");
    setCostDrawerOpen(true);
  }

  function handleCostSaved(cost: {
    id: string;
    tripId: string;
    title: string;
    amount: number;
    currency: string;
    amountScope: string;
    category: string;
    programId: string | null;
    paidByFamilyMemberId?: string | null;
  }) {
    setLocalCosts((prev) => {
      const index = prev.findIndex((item) => item.id === cost.id);
      const normalized = {
        ...cost,
        paidByFamilyMemberId: cost.paidByFamilyMemberId ?? null,
      } as TripDetailRow["costs"][number];
      if (index >= 0) {
        const next = [...prev];
        next[index] = normalized;
        return next;
      }
      return [...prev, normalized];
    });
    refresh();
  }

  function handleDocumentUploaded(document: DocumentItem) {
    setLocalDocuments((prev) => {
      if (prev.some((item) => item.id === document.id)) return prev;
      return [
        {
          ...document,
          tripId: trip.id,
          storagePath: "",
        } as TripDetailRow["documents"][number],
        ...prev,
      ];
    });
  }

  function handleDocumentDeleted(documentId: string) {
    setLocalDocuments((prev) => prev.filter((item) => item.id !== documentId));
  }

  const isOwner = trip.userId === currentUserId;

  function refresh() {
    router.refresh();
  }

  function handleDeleteTrip() {
    startTransition(async () => {
      const result = await deleteTrip(trip.id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Utazás törölve");
        router.push("/trips");
      }
    });
  }

  function handleDeleteProgram(id: string) {
    startTransition(async () => {
      const result = await deleteProgram(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Program törölve");
        refresh();
      }
    });
  }

  function handleDeleteCost(id: string) {
    const previous = localCosts;
    setLocalCosts((prev) => prev.filter((c) => c.id !== id));

    startTransition(async () => {
      const result = await deleteCost(id);
      if (!result.success) {
        setLocalCosts(previous);
        toast.error(result.error);
      } else {
        toast.success("Költség törölve");
        refresh();
      }
    });
  }

  const tabCounts: Record<TripDetailTab, number> = {
    planning: trip.ideas.length + trip.programs.length,
    finances: localCosts.length,
    documents: localDocuments.length,
  };

  const tripParticipants = trip.participants.map((p) => p.familyMember);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <div className="p-4 sm:p-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 h-9 w-fit text-muted-foreground">
            <Link href="/trips" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Vissza az utazásokhoz
            </Link>
          </Button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.destination}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{trip.title}</h1>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground sm:text-base">
                <Calendar className="h-4 w-4 shrink-0" />
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
              <MonogramGroup names={trip.participants.map((p) => p.familyMember.name)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-9" asChild>
                <a href={`/api/trips/${trip.id}/calendar`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Naptár
                </a>
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setDuplicateOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                Másolás
              </Button>
              {isOwner && (
                <Button variant="outline" size="sm" className="h-9" onClick={() => setActiveTab("planning")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Meghívó
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setTripDrawerOpen(true)}
                disabled={isPending || !isOwner}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Szerkesztés
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9"
                onClick={handleDeleteTrip}
                disabled={isPending || !isOwner}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Törlés
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TripClaimProfilePanel
        tripId={trip.id}
        currentUserId={currentUserId}
        participants={trip.participants.map((p) => ({
          id: p.familyMember.id,
          name: p.familyMember.name,
          linkedUserId: p.familyMember.linkedUserId,
        }))}
      />

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <TripSectionHeading
          title="Költségvetés"
          description="Terv vs. tény összehasonlítás az aktuális árfolyamon"
        />
        <div className="mt-4">
          <TripBudgetPanel trip={trip} />
        </div>
      </section>

      <TripDetailTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {activeTab === "planning" && (
        <div className="space-y-8">
          {isOwner && (
            <CollapsiblePanel
              title="Meghívó"
              subtitle="Hívd meg a családtagokat az utazásba"
              defaultOpen={false}
            >
              <TripInvitePanel tripId={trip.id} isOwner={isOwner} />
            </CollapsiblePanel>
          )}

          <section className="space-y-4">
            <TripSectionHeading
              title="Ötletek"
              description="Gyűjts ötleteket, majd alakítsd őket programmá"
              action={
                <Button size="sm" className={TRIP_SECTION_BTN_CLASS} onClick={() => setIdeaOpenSignal((n) => n + 1)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Új ötlet
                </Button>
              }
            />
            <TripIdeasSection
              embedded
              openSignal={ideaOpenSignal}
              tripId={trip.id}
              ideas={trip.ideas}
              participants={trip.participants.map((p) => p.familyMember)}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              onRefresh={refresh}
              onConvertToProgram={handleConvertIdeaToProgram}
              convertedIdeaIds={convertedIdeaIds}
            />
          </section>

          <section className="space-y-4">
            <TripSectionHeading
              title="Programok"
              description="Napi programok időponttal és résztvevőkkel"
              action={
                <Button
                  size="sm"
                  className={TRIP_SECTION_BTN_CLASS}
                  onClick={() => {
                    setEditingProgram(null);
                    setProgramDrawerOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Új program
                </Button>
              }
            />
            <div className="space-y-3">
              {trip.programs.map((program) => {
                const dateParts = programDateParts(program.date);
                const programCosts = localCosts.filter((c) => c.programId === program.id);

                return (
                  <CollapsiblePanel
                    key={program.id}
                    defaultOpen={false}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 px-2 text-xs font-bold text-primary">
                          {dateParts.day}. {dateParts.month}
                        </span>
                        {program.title}
                      </span>
                    }
                    subtitle={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          {program.startTime && program.endTime
                            ? `${program.startTime} – ${program.endTime}`
                            : program.startTime
                              ? program.startTime
                              : "Egész napos"}
                        </span>
                        {program.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {program.location}
                          </span>
                        )}
                      </span>
                    }
                    alwaysVisible={
                      program.url ? (
                        <UrlPreviewCard url={program.url} compact className="w-full" />
                      ) : undefined
                    }
                    actions={
                      <div className="flex shrink-0 gap-0.5">
                        {program.url && (
                          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                            <a href={program.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditingProgram(program);
                            setProgramDrawerOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          title="Költség hozzáadása"
                          onClick={() => handleAddCostForProgram(program.id)}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDeleteProgram(program.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <MonogramGroup names={program.participants.map((p) => p.familyMember.name)} />

                      {programCosts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {programCosts.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                            >
                              {c.title}:{" "}
                              <CostAmountDisplay
                                amount={c.amount}
                                currency={c.currency}
                                amountScope={c.amountScope}
                                className="ml-1 font-medium"
                              />
                            </span>
                          ))}
                        </div>
                      )}

                      <CollapsiblePanel
                        title="Program dokumentumok"
                        subtitle={`${localDocuments.filter((d) => d.programId === program.id).length} fájl`}
                        defaultOpen={false}
                        className="border-dashed shadow-none"
                      >
                        <DocumentUpload
                          tripId={trip.id}
                          programId={program.id}
                          documents={localDocuments.filter((d) => d.programId === program.id)}
                          participantOptions={tripParticipants}
                          programTitleById={programTitleById}
                          onDocumentUploaded={handleDocumentUploaded}
                          onDocumentDeleted={handleDocumentDeleted}
                          compact
                        />
                      </CollapsiblePanel>
                    </div>
                  </CollapsiblePanel>
                );
              })}
              {trip.programs.length === 0 && (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Még nincsenek programok. Adj hozzá egyet, vagy alakíts ötletet programmá.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "finances" && (
        <div className="space-y-8">
          <section className="space-y-4">
            <TripSectionHeading
              title="Költségek"
              description="Utazás és program szintű kiadások"
              action={
                <Button
                  size="sm"
                  className={TRIP_SECTION_BTN_CLASS}
                  onClick={() => {
                    setEditingCost(null);
                    setCostDrawerOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Új költség
                </Button>
              }
            />
            <div className="space-y-2">
              {localCosts.map((cost) => (
                <CollapsiblePanel
                  key={cost.id}
                  defaultOpen={false}
                  title={cost.title}
                  subtitle={
                    <MoneyDisplay amount={cost.amount} currency={cost.currency} />
                  }
                  badge={
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {COST_CATEGORY_LABELS[cost.category as keyof typeof COST_CATEGORY_LABELS] ??
                        cost.category}
                      {cost.amountScope === "PER_PERSON" ? " · 1 főre" : cost.amountScope === "TOTAL" ? " · összesen" : ""}
                    </span>
                  }
                  actions={
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditingCost(cost);
                          setCostDrawerOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDeleteCost(cost.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                  className="shadow-none"
                >
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Szint</dt>
                      <dd className="font-medium">
                        {cost.programId
                          ? programTitleById.get(cost.programId) ?? "Program"
                          : "Utazás szint"}
                      </dd>
                    </div>
                    {cost.paidByFamilyMemberId && (
                      <div>
                        <dt className="text-muted-foreground">Fizette</dt>
                        <dd className="font-medium">
                          {participantNameById.get(cost.paidByFamilyMemberId) ?? "Ismeretlen"}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CollapsiblePanel>
              ))}
              {localCosts.length === 0 && (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Még nincsenek költségek.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <CollapsiblePanel
              title="Elszámolás"
              subtitle="Ki mennyit fizetett és kinek kell visszafizetnie"
              defaultOpen={false}
              className="border-0 shadow-none"
              headerClassName="px-0 pt-0"
            >
              <TripSettlementPanel
                trip={{
                  participants: trip.participants,
                  programs: trip.programs.map((p) => ({
                    id: p.id,
                    participants: p.participants.map((x) => ({ familyMemberId: x.familyMember.id })),
                  })),
                  costs: localCosts,
                }}
              />
            </CollapsiblePanel>
          </section>
        </div>
      )}

      {activeTab === "documents" && (
        <section className="space-y-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <TripSectionHeading
            title="Dokumentumok"
            description="Utazás és program szintű iratok kategóriával és családtag szerint"
          />
          <DocumentChecklistPanel
            documents={localDocuments}
            participants={tripParticipants}
          />
          <DocumentUpload
            tripId={trip.id}
            documents={localDocuments}
            participantOptions={tripParticipants}
            programTitleById={programTitleById}
            onDocumentUploaded={handleDocumentUploaded}
            onDocumentDeleted={handleDocumentDeleted}
          />
        </section>
      )}

      <DuplicateTripDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        sourceTrip={trip}
      />

      <TripFormDrawer
        open={tripDrawerOpen}
        onOpenChange={setTripDrawerOpen}
        trip={trip}
        members={members}
        onSaved={refresh}
      />
      <ProgramFormDrawer
        open={programDrawerOpen}
        onOpenChange={handleProgramDrawerChange}
        tripId={trip.id}
        tripStartDate={formatDate(trip.startDate)}
        tripEndDate={formatDate(trip.endDate)}
        participantOptions={trip.participants.map((p) => p.familyMember)}
        ideaOptions={trip.ideas}
        defaultIdeaId={defaultIdeaId}
        program={editingProgram ?? undefined}
        onSaved={refresh}
      />
      <CostFormDrawer
        open={costDrawerOpen}
        onOpenChange={handleCostDrawerChange}
        tripId={trip.id}
        programs={trip.programs}
        defaultProgramId={defaultCostProgramId}
        participantOptions={trip.participants.map((p) => p.familyMember)}
        ideaOptions={trip.ideas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          amount: idea.amount,
          currency: idea.currency,
          amountScope: idea.amountScope,
          category: idea.category ?? "OTHER",
        }))}
        cost={editingCost ?? undefined}
        onSaved={handleCostSaved}
      />
    </div>
  );
}
