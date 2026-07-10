"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ExternalLink, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import {
  COST_CATEGORY_LABELS,
  type CostCategory,
} from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { MonogramGroup } from "@/components/monogram";
import { cn } from "@/lib/utils";
import { useDeleteTripIdea, useToggleIdeaInterest } from "@/hooks/use-ideas";
import type { TripDetailRow } from "@/lib/queries/trips";
import { IdeaFormDrawer, type TripIdeaFormData } from "./idea-form-drawer";
import { IdeaChatPanel } from "./idea-chat-panel";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { TRIP_SECTION_BTN_CLASS } from "./trip-section-styles";

type TripIdeaRow = TripDetailRow["ideas"][number];

interface TripIdeasSectionProps {
  tripId: string;
  ideas: TripIdeaRow[];
  participants: { id: string; name: string }[];
  currentUserId: string;
  currentUserName: string;
  onRefresh: () => void;
  onConvertToProgram?: (ideaId: string) => void;
  convertedIdeaIds?: Set<string>;
  embedded?: boolean;
  openSignal?: number;
}

export function TripIdeasSection({
  tripId,
  ideas,
  participants,
  currentUserId,
  currentUserName,
  onRefresh,
  onConvertToProgram,
  convertedIdeaIds,
  embedded = false,
  openSignal = 0,
}: TripIdeasSectionProps) {
  const [localIdeas, setLocalIdeas] = useState(ideas);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<TripIdeaFormData | null>(null);

  const deleteMutation = useDeleteTripIdea();
  const toggleMutation = useToggleIdeaInterest();

  useEffect(() => {
    setLocalIdeas(ideas);
  }, [ideas]);

  useEffect(() => {
    if (openSignal > 0) {
      setEditingIdea(null);
      setDrawerOpen(true);
    }
  }, [openSignal]);

  async function handleDelete(id: string) {
    const result = await deleteMutation.mutateAsync(id);
    if (result.success) onRefresh();
  }

  function handleToggleInterest(ideaId: string, familyMemberId: string, interested: boolean) {
    const previous = localIdeas;

    setLocalIdeas((current) =>
      current.map((idea) => {
        if (idea.id !== ideaId) return idea;
        if (interested) {
          const member = participants.find((p) => p.id === familyMemberId);
          if (!member || idea.interests.some((i) => i.familyMember.id === familyMemberId)) {
            return idea;
          }
          return {
            ...idea,
            interests: [
              ...idea.interests,
              {
                id: `opt-${familyMemberId}`,
                ideaId: idea.id,
                familyMemberId: member.id,
                familyMember: {
                  id: member.id,
                  name: member.name,
                  email: null,
                  userId: null,
                  linkedUserId: null,
                },
              },
            ],
          };
        }
        return {
          ...idea,
          interests: idea.interests.filter((i) => i.familyMember.id !== familyMemberId),
        };
      })
    );

    toggleMutation.mutate(
      { ideaId, familyMemberId, interested },
      {
        onError: () => {
          setLocalIdeas(previous);
          toast.error("Nem sikerült frissíteni az érdeklődést");
        },
      }
    );
  }

  function openNewIdea() {
    setEditingIdea(null);
    setDrawerOpen(true);
  }

  const content = (
    <div className="space-y-3">
      {localIdeas.map((idea) => {
          const interestedIds = new Set(idea.interests.map((i) => i.familyMember.id));
          const interestedNames = idea.interests.map((i) => i.familyMember.name);
          const isConverted = convertedIdeaIds?.has(idea.id) ?? false;

          return (
            <CollapsiblePanel
              key={idea.id}
              defaultOpen={false}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {idea.title}
                  {isConverted && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      Programmá alakítva
                    </span>
                  )}
                </span>
              }
              subtitle={
                <span className="flex flex-col gap-0.5">
                  {idea.amount != null && (
                    <CostAmountDisplay
                      amount={idea.amount}
                      currency={idea.currency}
                      amountScope={idea.amountScope}
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
                    <Button variant="ghost" size="icon" asChild>
                      <a href={idea.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingIdea({
                        id: idea.id,
                        title: idea.title,
                        url: idea.url,
                        amount: idea.amount,
                        currency: idea.currency,
                        amountScope: idea.amountScope,
                        category: idea.category ?? "OTHER",
                      });
                      setDrawerOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(idea.id)}
                    disabled={deleteMutation.isPending}
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

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ki érdeklődik?</p>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((member) => {
                      const isInterested = interestedIds.has(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            handleToggleInterest(idea.id, member.id, !isInterested)
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition-colors min-h-[var(--touch-target)] sm:min-h-0",
                            isInterested
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input hover:bg-accent"
                          )}
                        >
                          {member.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <IdeaChatPanel
                  ideaId={idea.id}
                  note={idea.note}
                  messages={idea.messages}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />

                {onConvertToProgram && !isConverted && (
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

        {localIdeas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Még nincsenek ötletek. Adj hozzá programjavaslatokat URL-lel és becsült költséggel.
          </p>
        )}
      </div>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-semibold">Ötletek</h3>
              <p className="text-sm text-muted-foreground">
                Programjavaslatok – a résztvevők jelölhetik, mi érdekli őket.
              </p>
            </div>
            <Button size="sm" className={TRIP_SECTION_BTN_CLASS} onClick={openNewIdea}>
              <Plus className="mr-2 h-4 w-4" />
              Új ötlet
            </Button>
          </div>
          {content}
        </section>
      )}

      <IdeaFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tripId={tripId}
        idea={editingIdea ?? undefined}
        onSaved={onRefresh}
      />
    </>
  );
}
