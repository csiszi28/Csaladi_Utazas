"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Download, Copy, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { deleteTrip } from "@/actions/trips";
import { deleteProgram } from "@/actions/programs";
import { deleteCost } from "@/actions/costs";
import type { FamilyMemberRow } from "@/lib/queries/family";
import type { TripDetailRow } from "@/lib/queries/trips";
import { TripFormDrawer } from "./trip-form-drawer";
import { CostFormDrawer } from "./cost-form-drawer";
import { DocumentUpload, type DocumentItem } from "@/components/documents/document-upload";
import { TripInvitePanel } from "@/components/trips/trip-invite-panel";
import { TripProgramsSection } from "@/components/trips/trip-programs-section";
import { TripAccommodationsSection } from "@/components/trips/trip-accommodations-section";
import { TripFinancesSection } from "@/components/trips/trip-finances-section";
import { TripDetailTabs, TripSectionHeading, type TripDetailTab } from "@/components/trips/trip-detail-tabs";
import { TripBudgetPanel } from "@/components/trips/trip-budget-panel";
import { DuplicateTripDialog } from "@/components/trips/duplicate-trip-dialog";
import { TripClaimProfilePanel } from "@/components/trips/trip-claim-profile-panel";
import { DocumentChecklistPanel } from "@/components/documents/document-checklist-panel";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";

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
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [ideaOpenSignal, setIdeaOpenSignal] = useState(0);
  const [programOpenSignal, setProgramOpenSignal] = useState(0);
  const [accommodationIdeaOpenSignal, setAccommodationIdeaOpenSignal] = useState(0);
  const [accommodationOpenSignal, setAccommodationOpenSignal] = useState(0);
  const [convertAccommodationIdeaId, setConvertAccommodationIdeaId] = useState<string | undefined>();
  const [convertProgramIdeaId, setConvertProgramIdeaId] = useState<string | undefined>();
  const [defaultCostAccommodationId, setDefaultCostAccommodationId] = useState<
    string | undefined
  >();
  const [editingCost, setEditingCost] = useState<TripDetailRow["costs"][0] | null>(null);
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
      setActiveTab("planning");
      setProgramOpenSignal((n) => n + 1);
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

  const accommodationTitleById = useMemo(
    () =>
      new Map(trip.accommodations.map((accommodation) => [accommodation.id, accommodation.title])),
    [trip.accommodations]
  );

  const generalIdeas = useMemo(
    () => trip.ideas.filter((idea) => idea.category !== "ACCOMMODATION"),
    [trip.ideas]
  );

  const accommodationIdeas = useMemo(
    () => trip.ideas.filter((idea) => idea.category === "ACCOMMODATION"),
    [trip.ideas]
  );

  const participantNameById = useMemo(
    () => new Map(trip.participants.map((p) => [p.familyMember.id, p.familyMember.name])),
    [trip.participants]
  );

  const convertedIdeaIds = useMemo(
    () =>
      new Set([
        ...trip.programs
          .map((program) => program.ideaId)
          .filter((id): id is string => Boolean(id)),
        ...trip.accommodations
          .map((accommodation) => accommodation.ideaId)
          .filter((id): id is string => Boolean(id)),
      ]),
    [trip.programs, trip.accommodations]
  );

  function handleConvertIdeaToAccommodation(ideaId: string) {
    setConvertAccommodationIdeaId(ideaId);
    setActiveTab("accommodations");
  }

  function handleAddCostForAccommodation(accommodationId: string) {
    setEditingCost(null);
    setDefaultCostAccommodationId(accommodationId);
    setDefaultCostProgramId(undefined);
    setActiveTab("finances");
    setCostDrawerOpen(true);
  }

  function handleConvertIdeaToProgram(ideaId: string) {
    setConvertProgramIdeaId(ideaId);
    setActiveTab("planning");
  }

  function handleAddCostForProgram(programId: string) {
    setEditingCost(null);
    setDefaultCostProgramId(programId);
    setDefaultCostAccommodationId(undefined);
    setActiveTab("finances");
    setCostDrawerOpen(true);
  }

  function handleCostDrawerChange(open: boolean) {
    setCostDrawerOpen(open);
    if (!open) {
      setDefaultCostProgramId(undefined);
      setDefaultCostAccommodationId(undefined);
    }
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
    planning: generalIdeas.length + trip.programs.length,
    accommodations: accommodationIdeas.length + trip.accommodations.length,
    finances: localCosts.length,
    documents: localDocuments.length,
  };

  const tripParticipants = trip.participants.map((p) => p.familyMember);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2 h-9 w-fit shrink-0 text-muted-foreground">
              <Link href="/trips" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Vissza az utazásokhoz</span>
                <span className="sm:hidden">Vissza</span>
              </Link>
            </Button>
            {isOwner && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setTripDrawerOpen(true)}
                  disabled={isPending}
                  title="Szerkesztés"
                  aria-label="Szerkesztés"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleDeleteTrip}
                  disabled={isPending}
                  title="Törlés"
                  aria-label="Törlés"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

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
              <Button variant="outline" size="sm" className="h-9 min-h-[var(--touch-target)] sm:min-h-9" asChild>
                <a href={`/api/trips/${trip.id}/calendar`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Naptár
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-h-[var(--touch-target)] sm:min-h-9"
                onClick={() => setDuplicateOpen(true)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Másolás
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

      {isOwner && (
        <CollapsiblePanel
          title="Meghívó"
          subtitle="Hívd meg a családtagokat az utazásba"
          defaultOpen={false}
        >
          <TripInvitePanel tripId={trip.id} isOwner={isOwner} />
        </CollapsiblePanel>
      )}

      <TripDetailTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {activeTab === "planning" && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <TripProgramsSection
              tripId={trip.id}
              tripStartDate={formatDate(trip.startDate)}
              tripEndDate={formatDate(trip.endDate)}
              ideas={generalIdeas}
              programs={trip.programs}
              costs={localCosts}
              documents={localDocuments}
              participants={trip.participants.map((p) => p.familyMember)}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              onRefresh={refresh}
              onDeleteProgram={handleDeleteProgram}
              onAddCostForProgram={handleAddCostForProgram}
              onConvertToProgram={handleConvertIdeaToProgram}
              convertedIdeaIds={convertedIdeaIds}
              isPending={isPending}
              ideaOpenSignal={ideaOpenSignal}
              programOpenSignal={programOpenSignal}
              convertIdeaId={convertProgramIdeaId}
              onConvertIdeaHandled={() => setConvertProgramIdeaId(undefined)}
            onDocumentUploaded={handleDocumentUploaded}
            onDocumentDeleted={handleDocumentDeleted}
          />
        </section>
      )}

      {activeTab === "accommodations" && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <TripAccommodationsSection
            tripId={trip.id}
            tripStartDate={formatDate(trip.startDate)}
            tripEndDate={formatDate(trip.endDate)}
            ideas={trip.ideas}
            accommodations={trip.accommodations}
            participants={trip.participants.map((p) => p.familyMember)}
            costs={localCosts}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={refresh}
            onConvertToAccommodation={handleConvertIdeaToAccommodation}
            onAddCostForAccommodation={handleAddCostForAccommodation}
            convertedIdeaIds={convertedIdeaIds}
            ideaOpenSignal={accommodationIdeaOpenSignal}
            accommodationOpenSignal={accommodationOpenSignal}
            convertIdeaId={convertAccommodationIdeaId}
            onConvertIdeaHandled={() => setConvertAccommodationIdeaId(undefined)}
          />
        </section>
      )}

      {activeTab === "finances" && (
        <TripFinancesSection
          trip={{
            participants: trip.participants,
            programs: trip.programs,
            accommodations: trip.accommodations,
          }}
          costs={localCosts}
          programTitleById={programTitleById}
          accommodationTitleById={accommodationTitleById}
          participantNameById={participantNameById}
          isPending={isPending}
          onAddCost={() => {
            setEditingCost(null);
            setCostDrawerOpen(true);
          }}
          onEditCost={(cost) => {
            setEditingCost(cost);
            setCostDrawerOpen(true);
          }}
          onDeleteCost={handleDeleteCost}
        />
      )}

      {activeTab === "documents" && (
        <section className="min-w-0 space-y-6 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
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
      <CostFormDrawer
        open={costDrawerOpen}
        onOpenChange={handleCostDrawerChange}
        tripId={trip.id}
        programs={trip.programs}
        accommodations={trip.accommodations}
        defaultProgramId={defaultCostProgramId}
        defaultAccommodationId={defaultCostAccommodationId}
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
