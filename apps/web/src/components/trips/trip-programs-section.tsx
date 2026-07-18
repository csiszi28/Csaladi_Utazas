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
} from "lucide-react";
import { formatDate, COST_CATEGORY_LABELS, type CostCategory } from "@csaladi-utazas/shared";
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
import { cn } from "@/lib/utils";

type TripIdeaRow = TripDetailRow["ideas"][number];
type ProgramRow = TripDetailRow["programs"][number];
type ProgramFilter = "ideas" | "programs" | "documents";

function programDateLabel(date: Date | string) {
  return formatDate(date);
}

interface TripProgramsSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  ideas: TripIdeaRow[];
  programs: ProgramRow[];
  costs: TripDetailRow["costs"];
  documents: TripDetailRow["documents"];
  participants: { id: string; name: string }[];
  currentUserId: string;
  currentUserName: string;
  onRefresh: () => void;
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
  onRefresh,
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
              <Button
                className={TRIP_SECTION_BTN_CLASS}
                onClick={() => {
                  setEditingIdea(null);
                  setIdeaDrawerOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Új ötlet
              </Button>
            }
          />

          <div className="space-y-3">
            {ideas.map((idea) => {
              const interestedNames = idea.interests.map((i) => i.familyMember.name);
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
                        />
                      )}
                      <span>
                        {COST_CATEGORY_LABELS[(idea.category ?? "OTHER") as CostCategory] ?? "Egyéb"}
                      </span>
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
                            interestedParticipantIds: idea.interests.map((i) => i.familyMember.id),
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
                    </div>
                  }
                >
                  <div className="space-y-3">
                    {interestedNames.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium text-muted-foreground">Érdekli:</p>
                        <MonogramGroup names={interestedNames} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Még senkit nem érdekel.</p>
                    )}

                    <IdeaChatPanel
                      ideaId={idea.id}
                      note={idea.note}
                      messages={idea.messages}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                    />

                    {!isConverted && (
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => onConvertToProgram(idea.id)}
                      >
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Programmá alakítás
                      </Button>
                    )}
                  </div>
                </CollapsiblePanel>
              );
            })}

            {ideas.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Még nincsenek ötletek. Adj hozzá programjavaslatokat URL-lel és becsült költséggel.
              </p>
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
              <Button
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
                          <span>
                            ·{" "}
                            {program.startTime && program.endTime
                              ? `${program.startTime} – ${program.endTime}`
                              : program.startTime
                                ? program.startTime
                                : "Egész napos"}
                          </span>
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
                    </div>
                  }
                >
                  <MonogramGroup names={program.participants.map((p) => p.familyMember.name)} />
                </CollapsiblePanel>
              );
            })}

            {programs.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Még nincsenek programok. Adj hozzá egyet, vagy alakíts ötletet programmá.
              </p>
            )}
          </div>
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
        onSaved={onRefresh}
      />
    </div>
  );
}
