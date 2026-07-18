"use client";

import { useState, useTransition, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import {
  TripDetailTabs,
  TripSectionHeading,
  TRIP_DETAIL_TAB_IDS,
  type TripDetailTab,
} from "@/components/trips/trip-detail-tabs";
import type { DocumentItem } from "@/components/documents/document-upload";
import { cn } from "@/lib/utils";

function TabSectionSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />;
}

const TripFormDrawer = dynamic(
  () => import("./trip-form-drawer").then((m) => m.TripFormDrawer),
  { ssr: false }
);
const CostFormDrawer = dynamic(
  () => import("./cost-form-drawer").then((m) => m.CostFormDrawer),
  { ssr: false }
);
const TripOverviewSection = dynamic(
  () => import("@/components/trips/trip-overview-section").then((m) => m.TripOverviewSection),
  { loading: () => <TabSectionSkeleton /> }
);
const TripPeopleSection = dynamic(
  () => import("@/components/trips/trip-people-section").then((m) => m.TripPeopleSection),
  { loading: () => <TabSectionSkeleton /> }
);
const TripProgramsSection = dynamic(
  () => import("@/components/trips/trip-programs-section").then((m) => m.TripProgramsSection),
  { loading: () => <TabSectionSkeleton /> }
);
const TripAccommodationsSection = dynamic(
  () =>
    import("@/components/trips/trip-accommodations-section").then((m) => m.TripAccommodationsSection),
  { loading: () => <TabSectionSkeleton /> }
);
const TripFinancesSection = dynamic(
  () => import("@/components/trips/trip-finances-section").then((m) => m.TripFinancesSection),
  { loading: () => <TabSectionSkeleton /> }
);
const DuplicateTripDialog = dynamic(
  () => import("@/components/trips/duplicate-trip-dialog").then((m) => m.DuplicateTripDialog),
  { ssr: false }
);
const TripClaimProfilePanel = dynamic(
  () => import("@/components/trips/trip-claim-profile-panel").then((m) => m.TripClaimProfilePanel),
  { loading: () => null }
);
const DocumentChecklistPanel = dynamic(
  () => import("@/components/documents/document-checklist-panel").then((m) => m.DocumentChecklistPanel),
  { loading: () => <TabSectionSkeleton /> }
);
const DocumentUpload = dynamic(
  () => import("@/components/documents/document-upload").then((m) => m.DocumentUpload),
  { loading: () => <TabSectionSkeleton /> }
);

function isTripDetailTab(value: string | null): value is TripDetailTab {
  return value != null && (TRIP_DETAIL_TAB_IDS as string[]).includes(value);
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
  const pathname = usePathname();
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
  const [editingCost, setEditingCost] = useState<TripDetailRow["costs"][0] | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<TripDetailTab>(() => {
    const fromUrl = searchParams.get("tab");
    return isTripDetailTab(fromUrl) ? fromUrl : "overview";
  });
  const [localCosts, setLocalCosts] = useState(trip.costs);
  const [localDocuments, setLocalDocuments] = useState(trip.documents);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<TripDetailTab>([activeTab]));

  const setActiveTab = useCallback(
    (tab: TripDetailTab) => {
      setActiveTabState(tab);
      setVisitedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    const prefetch = () => {
      void import("@/components/trips/trip-programs-section");
      void import("@/components/trips/trip-accommodations-section");
      void import("@/components/trips/trip-finances-section");
      void import("@/components/trips/trip-people-section");
      void import("@/components/documents/document-upload");
      void import("@/components/documents/document-checklist-panel");
    };

    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idle.requestIdleCallback === "function") {
      const id = idle.requestIdleCallback(prefetch);
      return () => idle.cancelIdleCallback?.(id);
    }

    const timeout = setTimeout(prefetch, 1200);
    return () => clearTimeout(timeout);
  }, []);

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
    const tab = searchParams.get("tab");

    if (action === "program" || action === "cost") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");

      if (action === "program") {
        setActiveTabState("planning");
        setProgramOpenSignal((n) => n + 1);
        params.set("tab", "planning");
      } else {
        setEditingCost(null);
        setActiveTabState("finances");
        setCostDrawerOpen(true);
        params.set("tab", "finances");
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      return;
    }

    if (isTripDetailTab(tab)) {
      setActiveTabState(tab);
    } else if (!searchParams.has("tab")) {
      setActiveTabState("overview");
    }
  }, [searchParams, pathname, router]);

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

  function handleConvertIdeaToProgram(ideaId: string) {
    setConvertProgramIdeaId(ideaId);
    setActiveTab("planning");
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

  const tabCounts: Partial<Record<TripDetailTab, number>> = {
    planning: generalIdeas.length + trip.programs.length,
    accommodations: accommodationIdeas.length + trip.accommodations.length,
    finances: localCosts.length,
    documents: localDocuments.length,
    people: trip.participants.length,
  };

  const tripParticipants = trip.participants.map((p) => p.familyMember);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
        <div className="p-4 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-2 h-9 w-fit shrink-0 text-muted-foreground"
            >
              <Link href="/trips" className="gap-1">
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <MapPin className="h-3.5 w-3.5" />
                  {trip.destination}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{trip.title}</h1>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("people")}
                className="inline-flex rounded-lg transition-opacity hover:opacity-80"
                title="Résztvevők"
                aria-label="Résztvevők megtekintése"
              >
                <MonogramGroup names={trip.participants.map((p) => p.familyMember.name)} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-h-[var(--touch-target)] sm:min-h-9"
                asChild
              >
                <a href={`/api/trips/${trip.id}/calendar`} download>
                  <Download className="h-4 w-4" />
                  Naptár
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-h-[var(--touch-target)] sm:min-h-9"
                onClick={() => setDuplicateOpen(true)}
              >
                <Copy className="h-4 w-4" />
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

      <TripDetailTabs active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {visitedTabs.has("overview") && (
        <section
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "overview" && "hidden"
          )}
          hidden={activeTab !== "overview"}
        >
          <TripOverviewSection
            trip={trip}
            costsCount={localCosts.length}
            documentsCount={localDocuments.length}
            programIdeasCount={generalIdeas.length}
            accommodationIdeasCount={accommodationIdeas.length}
            onNavigate={setActiveTab}
            onAddProgram={() => {
              setActiveTab("planning");
              setProgramOpenSignal((n) => n + 1);
            }}
            onAddIdea={() => {
              setActiveTab("planning");
              setIdeaOpenSignal((n) => n + 1);
            }}
            onAddCost={() => {
              setEditingCost(null);
              setActiveTab("finances");
              setCostDrawerOpen(true);
            }}
          />
        </section>
      )}

      {visitedTabs.has("planning") && (
        <section
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "planning" && "hidden"
          )}
          hidden={activeTab !== "planning"}
        >
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

      {visitedTabs.has("accommodations") && (
        <section
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "accommodations" && "hidden"
          )}
          hidden={activeTab !== "accommodations"}
        >
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
            convertedIdeaIds={convertedIdeaIds}
            ideaOpenSignal={accommodationIdeaOpenSignal}
            accommodationOpenSignal={accommodationOpenSignal}
            convertIdeaId={convertAccommodationIdeaId}
            onConvertIdeaHandled={() => setConvertAccommodationIdeaId(undefined)}
          />
        </section>
      )}

      {visitedTabs.has("finances") && (
        <div className={cn(activeTab !== "finances" && "hidden")} hidden={activeTab !== "finances"}>
          <TripFinancesSection
            trip={trip}
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
        </div>
      )}

      {visitedTabs.has("documents") && (
        <section
          className={cn(
            "min-w-0 space-y-6 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "documents" && "hidden"
          )}
          hidden={activeTab !== "documents"}
        >
          <TripSectionHeading
            title="Dokumentumok"
            description="Utazás és program szintű iratok kategóriával és családtag szerint"
          />
          <DocumentChecklistPanel documents={localDocuments} participants={tripParticipants} />
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

      {visitedTabs.has("people") && (
        <section
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "people" && "hidden"
          )}
          hidden={activeTab !== "people"}
        >
          <TripPeopleSection
            tripId={trip.id}
            isOwner={isOwner}
            participants={trip.participants}
          />
        </section>
      )}

      <DuplicateTripDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} sourceTrip={trip} />

      <TripFormDrawer
        open={tripDrawerOpen}
        onOpenChange={setTripDrawerOpen}
        trip={trip}
        members={members}
        onSaved={refresh}
      />
      <CostFormDrawer
        open={costDrawerOpen}
        onOpenChange={setCostDrawerOpen}
        tripId={trip.id}
        participantOptions={trip.participants.map((p) => p.familyMember)}
        cost={
          editingCost
            ? {
                ...editingCost,
                program: editingCost.programId
                  ? { title: programTitleById.get(editingCost.programId) ?? "" }
                  : null,
                accommodation: editingCost.accommodationId
                  ? { title: accommodationTitleById.get(editingCost.accommodationId) ?? "" }
                  : null,
              }
            : undefined
        }
        onSaved={handleCostSaved}
      />
    </div>
  );
}
