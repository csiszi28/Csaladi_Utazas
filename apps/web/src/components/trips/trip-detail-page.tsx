"use client";

import { useState, useTransition, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Download,
  Copy,
  MapPin,
  Calendar,
  Plus,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { deleteTrip } from "@/actions/trips";
import { deleteProgram } from "@/actions/programs";
import { deleteCost } from "@/actions/costs";
import { uploadTripCover } from "@/actions/feature-pack";
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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function tripCountdownLabel(start: Date, end: Date, now = new Date()): string {
  const s = startOfDay(start);
  const e = startOfDay(end);
  const n = startOfDay(now);
  if (n < s) {
    const days = Math.round((s.getTime() - n.getTime()) / 86_400_000);
    if (days === 0) return "Ma indul";
    if (days === 1) return "1 nap van hátra";
    return `${days} nap van hátra`;
  }
  if (n > e) return "Véget ért";
  const remaining = Math.round((e.getTime() - n.getTime()) / 86_400_000);
  if (remaining === 0) return "Ma ér véget";
  if (remaining === 1) return "Még 1 nap van hátra";
  return `Még ${remaining} nap van hátra`;
}

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
const TripTransportsSection = dynamic(
  () => import("@/components/trips/trip-transports-section").then((m) => m.TripTransportsSection),
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
const QuickCostDrawer = dynamic(
  () => import("./quick-cost-drawer").then((m) => m.QuickCostDrawer),
  { ssr: false }
);
const PackingListPanel = dynamic(
  () => import("./packing-list-panel").then((m) => m.PackingListPanel),
  { loading: () => <TabSectionSkeleton /> }
);
const PhotoGalleryPanel = dynamic(
  () => import("./photo-gallery-panel").then((m) => m.PhotoGalleryPanel),
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
  coverUrl,
}: {
  trip: TripDetailRow;
  members: FamilyMemberRow[];
  currentUserId: string;
  currentUserName: string;
  coverUrl?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [ideaOpenSignal, setIdeaOpenSignal] = useState(0);
  const [programOpenSignal, setProgramOpenSignal] = useState(0);
  const [transportOpenSignal, setTransportOpenSignal] = useState(0);
  const [quickCostOpen, setQuickCostOpen] = useState(false);
  const [docsSubTab, setDocsSubTab] = useState<"docs" | "photos" | "packing">("docs");
  const [accommodationIdeaOpenSignal, setAccommodationIdeaOpenSignal] = useState(0);
  const [accommodationOpenSignal, setAccommodationOpenSignal] = useState(0);
  const [convertAccommodationIdeaId, setConvertAccommodationIdeaId] = useState<string | undefined>();
  const [convertProgramIdeaId, setConvertProgramIdeaId] = useState<string | undefined>();
  const [editingCost, setEditingCost] = useState<TripDetailRow["costs"][0] | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverPending, startCoverTransition] = useTransition();
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

    if (action === "program" || action === "cost" || action === "transport" || action === "quick-cost") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");

      if (action === "program") {
        setActiveTabState("planning");
        setProgramOpenSignal((n) => n + 1);
        params.set("tab", "planning");
      } else if (action === "transport") {
        setActiveTabState("transport");
        setTransportOpenSignal((n) => n + 1);
        params.set("tab", "transport");
      } else if (action === "quick-cost") {
        setQuickCostOpen(true);
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
  const countdownLabel = tripCountdownLabel(new Date(trip.startDate), new Date(trip.endDate));

  function refresh() {
    router.refresh();
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("tripId", trip.id);
    fd.set("file", file);
    startCoverTransition(async () => {
      const result = await uploadTripCover(fd);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Borítókép frissítve");
        refresh();
      }
    });
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
    const previousCosts = localCosts;
    setLocalCosts((prev) => prev.filter((c) => c.programId !== id));

    startTransition(async () => {
      const result = await deleteProgram(id);
      if (!result.success) {
        setLocalCosts(previousCosts);
        toast.error(result.error);
      } else {
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
    transport: trip.transports?.length ?? 0,
    planning: generalIdeas.length + trip.programs.length,
    accommodations: accommodationIdeas.length + trip.accommodations.length,
    finances: localCosts.length,
    documents: localDocuments.length,
    people: trip.participants.length,
  };

  const tripParticipants = trip.participants.map((p) => p.familyMember);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-2xl border shadow-sm">
        <div
          className="relative bg-gradient-to-br from-[#002045] via-[#1a365d] to-[#2a4a7a]"
          style={
            coverUrl
              ? {
                  backgroundImage: `linear-gradient(to top, rgba(0,32,69,.88), rgba(26,54,93,.55)), url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="p-4 text-white sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="-ml-2 h-9 w-fit shrink-0 text-white/85 hover:bg-white/10 hover:text-white"
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
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 border-0 bg-white/15 text-white hover:bg-white/25"
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
                  <p className="flex items-center gap-1.5 text-sm font-medium text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {trip.destination}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {trip.title}
                  </h1>
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tracking-wide">
                    {countdownLabel}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("people")}
                  className="inline-flex rounded-lg transition-opacity hover:opacity-80"
                  title="Résztvevők"
                  aria-label="Résztvevők megtekintése"
                >
                  <MonogramGroup
                    names={trip.participants.map((p) => p.familyMember.name)}
                    className="[&_*]:ring-white/40"
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 min-h-[var(--touch-target)] border-0 bg-white/15 text-white hover:bg-white/25 sm:min-h-9"
                  disabled={coverPending}
                  onClick={() => coverFileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Borítókép
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 min-h-[var(--touch-target)] border-0 bg-white/15 text-white hover:bg-white/25 sm:min-h-9"
                  asChild
                >
                  <a href={`/api/trips/${trip.id}/calendar`} download>
                    <Download className="h-4 w-4" />
                    Naptár
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 min-h-[var(--touch-target)] border-0 bg-white/15 text-white hover:bg-white/25 sm:min-h-9"
                  onClick={() => setDuplicateOpen(true)}
                >
                  <Copy className="h-4 w-4" />
                  Másolás
                </Button>
              </div>
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
            documentsCount={localDocuments.filter((d) => d.category !== "PHOTO").length}
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
              setQuickCostOpen(true);
            }}
          />
        </section>
      )}

      {visitedTabs.has("transport") && (
        <section
          className={cn(
            "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
            activeTab !== "transport" && "hidden"
          )}
          hidden={activeTab !== "transport"}
        >
          <TripTransportsSection
            tripId={trip.id}
            tripStartDate={formatDate(trip.startDate)}
            tripEndDate={formatDate(trip.endDate)}
            transports={trip.transports ?? []}
            participants={trip.participants.map((p) => p.familyMember)}
            costs={localCosts}
            onRefresh={refresh}
            openSignal={transportOpenSignal}
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
            description="Iratok, fotók és csomagolási lista"
          />
          <div className="flex gap-1 overflow-x-auto rounded-xl border p-1">
            {(
              [
                { id: "docs" as const, label: "Dokumentumok" },
                { id: "photos" as const, label: "Fotók" },
                { id: "packing" as const, label: "Csomagolás" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDocsSubTab(tab.id)}
                className={cn(
                  "min-h-[var(--touch-target)] flex-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  docsSubTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {docsSubTab === "docs" ? (
            <>
              <DocumentChecklistPanel documents={localDocuments} participants={tripParticipants} />
              <DocumentUpload
                tripId={trip.id}
                documents={localDocuments.filter((d) => d.category !== "PHOTO")}
                participantOptions={tripParticipants}
                programTitleById={programTitleById}
                onDocumentUploaded={handleDocumentUploaded}
                onDocumentDeleted={handleDocumentDeleted}
              />
            </>
          ) : null}
          {docsSubTab === "photos" ? (
            <PhotoGalleryPanel
              tripId={trip.id}
              documents={localDocuments.filter((d) => d.category === "PHOTO")}
              onDocumentUploaded={handleDocumentUploaded}
              onDocumentDeleted={handleDocumentDeleted}
            />
          ) : null}
          {docsSubTab === "packing" ? (
            <PackingListPanel
              tripId={trip.id}
              items={trip.packingItems ?? []}
              participants={tripParticipants}
            />
          ) : null}
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
            canEdit
            participants={trip.participants}
            familyMembers={members}
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
      <QuickCostDrawer
        open={quickCostOpen}
        onOpenChange={setQuickCostOpen}
        tripId={trip.id}
        participantOptions={trip.participants.map((p) => p.familyMember)}
        onSaved={refresh}
      />

      <Button
        type="button"
        size="icon"
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 h-14 w-14 rounded-full shadow-lg sm:hidden"
        onClick={() => setQuickCostOpen(true)}
        aria-label="Gyors költség"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
