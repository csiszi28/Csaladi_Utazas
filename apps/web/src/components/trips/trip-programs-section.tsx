"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MapPin,
  CalendarPlus,
  CalendarDays,
  FileText,
  Clock,
} from "lucide-react";
import {
  formatDate,
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { MonogramGroup } from "@/components/monogram";
import { DocumentUpload, type DocumentItem } from "@/components/documents/document-upload";
import { useDeleteTripIdea } from "@/hooks/use-ideas";
import type { TripDetailRow } from "@/lib/queries/trips";
import { IdeaFormDrawer, type TripIdeaFormData } from "./idea-form-drawer";
import { ProgramFormDrawer } from "./program-form-drawer";
import { IdeaChatPanel } from "./idea-chat-panel";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { CostChips } from "./cost-chips";
import { TRIP_SECTION_BTN_CLASS } from "./trip-section-styles";
import { TripFilterChips, TripSectionHeading } from "./trip-detail-tabs";
import { TripSubviewNav } from "./trip-subview-nav";
import { IdeaVoteBar } from "./idea-vote-bar";
import { InlineProgramTitle, ProgramDayShift } from "./inline-program-edit";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { parseDate } from "@csaladi-utazas/shared";
import { TripMapView, buildTripMapMarkers } from "./trip-map-view";
import { GeocodeStatusBadge, resolveGeocodeStatus } from "./geocode-status";
import { Sparkles } from "lucide-react";

type TripIdeaRow = TripDetailRow["ideas"][number];
type ProgramRow = TripDetailRow["programs"][number];
type ProgramFilter = "ideas" | "programs" | "documents";

function programDateLabel(date: Date | string) {
  return formatDate(date);
}

function programTimeLabel(program: {
  startTime?: string | null;
  endTime?: string | null;
}): string {
  if (program.startTime && program.endTime) {
    return `${program.startTime} – ${program.endTime}`;
  }
  if (program.startTime) return program.startTime;
  if (program.endTime) return `– ${program.endTime}`;
  return "Egész napos";
}

function ProgramTimeline({
  tripStartDate,
  tripEndDate,
  programs,
  showEmptyDays,
  onToggleEmptyDays,
  onEdit,
}: {
  tripStartDate: string;
  tripEndDate: string;
  programs: ProgramRow[];
  showEmptyDays: boolean;
  onToggleEmptyDays: () => void;
  onEdit: (program: ProgramRow) => void;
}) {
  const days = useMemo(() => {
    const start = parseDate(formatDate(tripStartDate));
    const end = parseDate(formatDate(tripEndDate));
    const result: Date[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [tripStartDate, tripEndDate]);

  const byDay = useMemo(() => {
    const map = new Map<string, ProgramRow[]>();
    for (const p of programs) {
      const key = formatDate(p.date);
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [programs]);

  const visibleDays = showEmptyDays
    ? days
    : days.filter((d) => (byDay.get(formatDate(d)) ?? []).length > 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-end sm:hidden">
        <button
          type="button"
          className="text-sm font-medium text-primary"
          onClick={onToggleEmptyDays}
        >
          {showEmptyDays ? "Csak eseményes napok" : "Minden nap"}
        </button>
      </div>
      {visibleDays.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Még nincsenek programok az idővonalon.
        </p>
      ) : (
        visibleDays.map((day) => {
          const key = formatDate(day);
          const items = byDay.get(key) ?? [];
          return (
            <div key={key} className="overflow-hidden rounded-xl border">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
                {key}
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Nincs program</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="whitespace-nowrap px-4 py-2 font-medium">Időpont</th>
                        <th className="px-4 py-2 font-medium">Program</th>
                        <th className="px-4 py-2 font-medium">URL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((p) => (
                        <tr
                          key={p.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => onEdit(p)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums text-muted-foreground">
                            {programTimeLabel(p)}
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 align-middle font-medium sm:max-w-none">
                            <span className="line-clamp-2">{p.title}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {p.url ? (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-[12rem] items-center gap-1.5 text-primary hover:underline sm:max-w-[18rem]"
                                onClick={(e) => e.stopPropagation()}
                                title={p.url}
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {p.url.replace(/^https?:\/\//, "")}
                                </span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

interface TripProgramsSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  ideas: TripIdeaRow[];
  programs: ProgramRow[];
  costs: TripDetailRow["costs"];
  documents: TripDetailRow["documents"];
  participants: { id: string; name: string; linkedUserId?: string | null }[];
  currentUserId: string;
  currentUserName: string;
  currentFamilyMemberId?: string | null;
  canEdit?: boolean;
  onRefresh: () => void;
  onProgramSaved?: (payload: import("./program-form-drawer").ProgramSavedPayload) => void;
  onDeleteProgram: (id: string) => void;
  onConvertToProgram: (ideaId: string) => void;
  convertedIdeaIds: Set<string>;
  isPending?: boolean;
  ideaOpenSignal?: number;
  programOpenSignal?: number;
  convertIdeaId?: string;
  onConvertIdeaHandled?: () => void;
  onDocumentUploaded: (document: DocumentItem) => void;
  onDocumentDeleted: (documentId: string) => void;
}

export function TripProgramsSection({
  tripId,
  tripStartDate,
  tripEndDate,
  ideas,
  programs,
  costs,
  documents,
  participants,
  currentUserId,
  currentUserName,
  currentFamilyMemberId = null,
  canEdit = true,
  onRefresh,
  onProgramSaved,
  onDeleteProgram,
  onConvertToProgram,
  convertedIdeaIds,
  isPending = false,
  ideaOpenSignal = 0,
  programOpenSignal = 0,
  convertIdeaId,
  onConvertIdeaHandled,
  onDocumentUploaded,
  onDocumentDeleted,
}: TripProgramsSectionProps) {
  const [filter, setFilter] = useState<ProgramFilter>("programs");
  const [listMode, setListMode] = useState<"list" | "timeline" | "map">("list");
  const [showEmptyDays, setShowEmptyDays] = useState(false);
  const [ideaDrawerOpen, setIdeaDrawerOpen] = useState(false);
  const [programDrawerOpen, setProgramDrawerOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<TripIdeaFormData | null>(null);
  const [editingProgram, setEditingProgram] = useState<ProgramRow | null>(null);

  const deleteIdeaMutation = useDeleteTripIdea();

  const programTitleById = new Map(programs.map((p) => [p.id, p.title]));
  const programDocuments = documents.filter((d) => d.programId);

  useEffect(() => {
    if (ideaOpenSignal > 0) {
      setEditingIdea(null);
      setFilter("ideas");
      setIdeaDrawerOpen(true);
    }
  }, [ideaOpenSignal]);

  useEffect(() => {
    if (programOpenSignal > 0) {
      setEditingProgram(null);
      setFilter("programs");
      setProgramDrawerOpen(true);
    }
  }, [programOpenSignal]);

  useEffect(() => {
    if (convertIdeaId) {
      setEditingProgram(null);
      setFilter("programs");
      setProgramDrawerOpen(true);
    }
  }, [convertIdeaId]);

  async function handleDeleteIdea(id: string) {
    const result = await deleteIdeaMutation.mutateAsync(id);
    if (result.success) onRefresh();
  }

  const myMemberId =
    currentFamilyMemberId ??
    participants.find((p) => p.linkedUserId === currentUserId)?.id ??
    null;
  const myMemberName =
    participants.find((p) => p.id === myMemberId)?.name ?? currentUserName;

  const ideaOptions = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    url: idea.url,
    amount: idea.amount,
    currency: idea.currency,
    amountScope: idea.amountScope,
    category: idea.category,
    date: idea.date,
    startTime: idea.startTime,
    endTime: idea.endTime,
    interests: idea.interests,
  }));

  return (
    <div className="space-y-6">
      <TripFilterChips
        ariaLabel="Program szűrő"
        active={filter}
        onChange={setFilter}
        items={[
          { id: "programs", label: "Programok", count: programs.length },
          { id: "ideas", label: "Ötletek", count: ideas.length },
          { id: "documents", label: "Dokuk.", count: programDocuments.length },
        ]}
      />

      {filter === "ideas" && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Program ötletek"
            description="Gyűjts javaslatokat, jelöld meg kinek érdekes"
            action={
              canEdit ? (
                <Button
                  className={TRIP_SECTION_BTN_CLASS}
                  onClick={() => {
                    setEditingIdea(null);
                    setIdeaDrawerOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Új ötlet
                </Button>
              ) : null
            }
          />

          <div className="space-y-3">
            {ideas.map((idea) => {
              const isConverted = convertedIdeaIds.has(idea.id);

              return (
                <CollapsiblePanel
                  key={idea.id}
                  defaultOpen={false}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {idea.title}
                      {isConverted && (
                        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 sm:text-sm">
                          Programmá alakítva
                        </span>
                      )}
                    </span>
                  }
                  subtitle={
                    <span className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                      {idea.date && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {programDateLabel(idea.date)}
                          {(idea.startTime || idea.endTime) && (
                            <span>
                              ·{" "}
                              {idea.startTime && idea.endTime
                                ? `${idea.startTime} – ${idea.endTime}`
                                : idea.startTime ?? idea.endTime}
                            </span>
                          )}
                        </span>
                      )}
                      {idea.amount != null && (
                        <CostAmountDisplay
                          amount={idea.amount}
                          currency={idea.currency}
                          amountScope={idea.amountScope}
                          participantCount={idea.interests.length}
                          chip
                        />
                      )}
                      <span>
                        {COST_CATEGORY_LABELS[(idea.category ?? "OTHER") as CostCategory] ?? "Egyéb"}
                      </span>
                      {idea.voteDeadline && (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Szavazás: {formatDate(idea.voteDeadline)}-ig
                        </span>
                      )}
                    </span>
                  }
                  alwaysVisible={
                    idea.url ? <UrlPreviewCard url={idea.url} compact className="w-full" /> : undefined
                  }
                  actions={
                    <div className="flex shrink-0 gap-1">
                      {idea.url && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                          <a href={idea.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {canEdit ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              setEditingIdea({
                                id: idea.id,
                                title: idea.title,
                                url: idea.url,
                                amount: idea.amount,
                                currency: idea.currency,
                                amountScope: idea.amountScope,
                                category: idea.category ?? "OTHER",
                                date: idea.date,
                                startTime: idea.startTime,
                                endTime: idea.endTime,
                                voteDeadline: idea.voteDeadline,
                                interestedParticipantIds: idea.interests.map(
                                  (i) => i.familyMember.id
                                ),
                              });
                              setIdeaDrawerOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleDeleteIdea(idea.id)}
                            disabled={deleteIdeaMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <IdeaVoteBar
                      ideaId={idea.id}
                      interests={idea.interests}
                      participantCount={participants.length}
                      voteDeadline={idea.voteDeadline}
                      currentFamilyMemberId={myMemberId}
                      currentFamilyMemberName={myMemberName}
                      onChanged={onRefresh}
                    />

                    <IdeaChatPanel
                      ideaId={idea.id}
                      note={idea.note}
                      messages={idea.messages}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                    />

                    {canEdit && !isConverted && (
                      <Button
                        size="sm"
                        className="w-full min-h-[var(--touch-target)] sm:min-h-9 sm:w-auto"
                        onClick={() => onConvertToProgram(idea.id)}
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Programmá alakítás
                      </Button>
                    )}
                  </div>
                </CollapsiblePanel>
              );
            })}

            {ideas.length === 0 && (
              <EmptyState
                icon={Sparkles}
                compact
                title="Még nincsenek ötletek"
                description="Adj hozzá programjavaslatokat URL-lel és becsült költséggel."
              />
            )}
          </div>
        </section>
      )}

      {filter === "programs" && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Programok"
            description="Napi programok időponttal és résztvevőkkel"
            action={
              canEdit ? (
                <Button
                  className={`${TRIP_SECTION_BTN_CLASS} w-full sm:w-auto`}
                  onClick={() => {
                    setEditingProgram(null);
                    setProgramDrawerOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sm:hidden">Új</span>
                  <span className="hidden sm:inline">Új program</span>
                </Button>
              ) : null
            }
          />

          <TripSubviewNav
            ariaLabel="Program nézet"
            active={listMode}
            onChange={(id) => setListMode(id as "list" | "timeline" | "map")}
            items={[
              { id: "list", label: "Lista", shortLabel: "Lista", count: programs.length },
              { id: "timeline", label: "Idővonal", shortLabel: "Idővonal" },
              { id: "map", label: "Térkép", shortLabel: "Térkép" },
            ]}
          />

          {listMode === "map" ? (
            <TripMapView
              markers={buildTripMapMarkers({ programs, accommodations: [] })}
              canEdit={canEdit}
              dayOptions={[
                ...new Set(
                  programs
                    .map((p) => formatDate(p.date))
                    .filter(Boolean)
                ),
              ].sort()}
              onOpenEntity={() => {
                /* list mode already on programs tab */
              }}
            />
          ) : listMode === "timeline" ? (
            <ProgramTimeline
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              programs={programs}
              showEmptyDays={showEmptyDays}
              onToggleEmptyDays={() => setShowEmptyDays((v) => !v)}
              onEdit={(program) => {
                setEditingProgram(program);
                setProgramDrawerOpen(true);
              }}
            />
          ) : (
          <div className="space-y-3">
            {programs.map((program) => {
              const programCosts = costs.filter((c) => c.programId === program.id);
              const docsForProgram = documents.filter((d) => d.programId === program.id);

              return (
                <CollapsiblePanel
                  key={program.id}
                  defaultOpen={false}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {program.title}
                      <GeocodeStatusBadge
                        status={resolveGeocodeStatus({
                          location: program.location,
                          lat: program.lat,
                          lng: program.lng,
                        })}
                      />
                      {docsForProgram.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:text-sm">
                          <FileText className="h-3.5 w-3.5" />
                          {docsForProgram.length}
                        </span>
                      )}
                    </span>
                  }
                  subtitle={
                    <span className="flex flex-col gap-1.5 sm:gap-2">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {programDateLabel(program.date)}
                          <span>· {programTimeLabel(program)}</span>
                        </span>
                        {program.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {program.location}
                          </span>
                        )}
                      </span>
                      <CostChips
                        costs={programCosts}
                        participantCount={program.participants.length}
                      />
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
                      {canEdit ? (
                        <>
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
                            onClick={() => onDeleteProgram(program.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {canEdit ? (
                      <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground">Gyors szerkesztés</p>
                        <InlineProgramTitle
                          tripId={tripId}
                          program={program}
                          canEdit={canEdit}
                          onSaved={onRefresh}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">Nap mozgatása</span>
                          <ProgramDayShift
                            tripId={tripId}
                            program={program}
                            tripStartDate={tripStartDate}
                            tripEndDate={tripEndDate}
                            canEdit={canEdit}
                            onSaved={onRefresh}
                          />
                        </div>
                      </div>
                    ) : null}
                    <MonogramGroup names={program.participants.map((p) => p.familyMember.name)} />
                  </div>
                </CollapsiblePanel>
              );
            })}

            {programs.length === 0 && (
              <EmptyState
                icon={Sparkles}
                compact
                title="Még nincsenek programok"
                description="Adj hozzá egyet, vagy alakíts ötletet programmá."
              />
            )}
          </div>
          )}
        </section>
      )}

      {filter === "documents" && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Program dokumentumok"
            description="Programhoz rendelt fájlok feltöltése és kezelése"
          />

          <div className="space-y-3">
            {programs.map((program, index) => {
              const docsForProgram = documents.filter((d) => d.programId === program.id);
              const fileCount = docsForProgram.length;
              const previewDocs = docsForProgram.slice(0, 3);

              return (
                <CollapsiblePanel
                  key={program.id}
                  defaultOpen={index === 0 || fileCount === 0}
                  title={program.title}
                  subtitle={
                    <span className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        {programDateLabel(program.date)}
                        {program.startTime && (
                          <span className="text-muted-foreground">· {program.startTime}</span>
                        )}
                      </span>
                      {program.location && (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {program.location}
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium",
                          fileCount > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        {fileCount === 0
                          ? "Nincs dokumentum"
                          : `${fileCount} dokumentum`}
                      </span>
                    </span>
                  }
                  alwaysVisible={
                    previewDocs.length > 0 ? (
                      <ul className="space-y-1.5">
                        {previewDocs.map((doc) => (
                          <li
                            key={doc.id}
                            className="flex items-center gap-2 truncate text-sm text-muted-foreground"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{doc.fileName}</span>
                          </li>
                        ))}
                        {fileCount > previewDocs.length && (
                          <li className="pl-5 text-xs text-muted-foreground">
                            +{fileCount - previewDocs.length} további
                          </li>
                        )}
                      </ul>
                    ) : undefined
                  }
                >
                  <DocumentUpload
                    tripId={tripId}
                    programId={program.id}
                    documents={docsForProgram}
                    participantOptions={participants}
                    programTitleById={programTitleById}
                    onDocumentUploaded={onDocumentUploaded}
                    onDocumentDeleted={onDocumentDeleted}
                    canEdit={canEdit}
                    compact
                  />
                </CollapsiblePanel>
              );
            })}

            {programs.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Először adj hozzá programot, majd itt tölthetsz fel dokumentumokat.
              </p>
            )}
          </div>
        </section>
      )}

      <IdeaFormDrawer
        open={ideaDrawerOpen}
        onOpenChange={setIdeaDrawerOpen}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        participants={participants}
        idea={editingIdea ?? undefined}
        onSaved={onRefresh}
      />

      <ProgramFormDrawer
        open={programDrawerOpen}
        onOpenChange={(open) => {
          setProgramDrawerOpen(open);
          if (!open) onConvertIdeaHandled?.();
        }}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        participantOptions={participants}
        ideaOptions={ideaOptions}
        defaultIdeaId={convertIdeaId}
        program={editingProgram ?? undefined}
        onSaved={(payload) => {
          onProgramSaved?.(payload);
          onRefresh();
        }}
      />
    </div>
  );
}
