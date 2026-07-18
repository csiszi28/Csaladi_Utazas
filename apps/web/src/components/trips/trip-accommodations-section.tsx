"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  BedDouble,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { Button } from "@/components/ui/button";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { MonogramGroup } from "@/components/monogram";
import { useDeleteTripIdea } from "@/hooks/use-ideas";
import { useDeleteAccommodation } from "@/hooks/use-accommodations";
import type { TripDetailRow } from "@/lib/queries/trips";
import {
  AccommodationIdeaFormDrawer,
  type AccommodationIdeaFormData,
} from "./accommodation-idea-form-drawer";
import { AccommodationFormDrawer } from "./accommodation-form-drawer";
import { IdeaChatPanel } from "./idea-chat-panel";
import { UrlPreviewCard } from "@/components/ideas/url-preview-card";
import { CostChips } from "./cost-chips";
import { TRIP_SECTION_BTN_CLASS } from "./trip-section-styles";
import { TripFilterChips, TripSectionHeading } from "./trip-detail-tabs";
type TripIdeaRow = TripDetailRow["ideas"][number];
type AccommodationRow = TripDetailRow["accommodations"][number];

type AccommodationFilter = "ideas" | "bookings";

interface TripAccommodationsSectionProps {
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  ideas: TripIdeaRow[];
  accommodations: AccommodationRow[];
  participants: { id: string; name: string }[];
  costs: TripDetailRow["costs"];
  currentUserId: string;
  currentUserName: string;
  onRefresh: () => void;
  onConvertToAccommodation: (ideaId: string) => void;
  convertedIdeaIds: Set<string>;
  ideaOpenSignal?: number;
  accommodationOpenSignal?: number;
  convertIdeaId?: string;
  onConvertIdeaHandled?: () => void;
}

function stayNightLabel(checkIn: Date | string, checkOut: Date | string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(
    1,
    Math.floor((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / 86_400_000)
  );
  return `${formatDate(checkIn)} – ${formatDate(checkOut)} · ${nights} éj`;
}

export function TripAccommodationsSection({
  tripId,
  tripStartDate,
  tripEndDate,
  ideas,
  accommodations,
  participants,
  costs,
  currentUserId,
  currentUserName,
  onRefresh,
  onConvertToAccommodation,
  convertedIdeaIds,
  ideaOpenSignal = 0,
  accommodationOpenSignal = 0,
  convertIdeaId,
  onConvertIdeaHandled,
}: TripAccommodationsSectionProps) {
  const [filter, setFilter] = useState<AccommodationFilter>("bookings");
  const [ideaDrawerOpen, setIdeaDrawerOpen] = useState(false);
  const [accommodationDrawerOpen, setAccommodationDrawerOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<AccommodationIdeaFormData | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<AccommodationRow | null>(null);

  const deleteIdeaMutation = useDeleteTripIdea();
  const deleteAccommodationMutation = useDeleteAccommodation();

  const accommodationIdeas = useMemo(
    () => ideas.filter((idea) => idea.category === "ACCOMMODATION"),
    [ideas]
  );

  useEffect(() => {
    if (ideaOpenSignal > 0) {
      setEditingIdea(null);
      setFilter("ideas");
      setIdeaDrawerOpen(true);
    }
  }, [ideaOpenSignal]);

  useEffect(() => {
    if (accommodationOpenSignal > 0) {
      setEditingAccommodation(null);
      setFilter("bookings");
      setAccommodationDrawerOpen(true);
    }
  }, [accommodationOpenSignal]);

  useEffect(() => {
    if (convertIdeaId) {
      setEditingAccommodation(null);
      setFilter("bookings");
      setAccommodationDrawerOpen(true);
    }
  }, [convertIdeaId]);

  async function handleDeleteIdea(id: string) {
    const result = await deleteIdeaMutation.mutateAsync(id);
    if (result.success) onRefresh();
  }

  async function handleDeleteAccommodation(id: string) {
    const result = await deleteAccommodationMutation.mutateAsync(id);
    if (result.success) onRefresh();
  }

  const ideaOptions = accommodationIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    url: idea.url,
    amount: idea.amount,
    currency: idea.currency,
    amountScope: idea.amountScope,
    checkInDate: idea.checkInDate,
    checkOutDate: idea.checkOutDate,
    interests: idea.interests,
  }));

  return (
    <div className="space-y-6">
      <TripFilterChips
        ariaLabel="Szállás szűrő"
        active={filter}
        onChange={setFilter}
        items={[
          {
            id: "bookings",
            label: "Foglalások",
            count: accommodations.length,
          },
          { id: "ideas", label: "Ötletek", count: accommodationIdeas.length },
        ]}
      />

      {filter === "ideas" && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Szállás ötletek"
            description="Gyűjts szálláslehetőségeket, jelöld meg kinek tetszik"
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
            {accommodationIdeas.map((idea) => {
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
                          Szállásként rögzítve
                        </span>
                      )}
                    </span>
                  }
                  subtitle={
                    <span className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                      {idea.checkInDate && idea.checkOutDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {stayNightLabel(idea.checkInDate, idea.checkOutDate)}
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
                    </span>
                  }
                  alwaysVisible={
                    idea.url ? (
                      <UrlPreviewCard url={idea.url} compact className="w-full" />
                    ) : undefined
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
                            checkInDate: idea.checkInDate
                              ? formatDate(idea.checkInDate)
                              : null,
                            checkOutDate: idea.checkOutDate
                              ? formatDate(idea.checkOutDate)
                              : null,
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
                        <p className="text-sm font-medium text-muted-foreground">Tetszik:</p>
                        <MonogramGroup names={interestedNames} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Még senkinek nem tetszik.</p>
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
                        onClick={() => onConvertToAccommodation(idea.id)}
                      >
                        <BedDouble className="mr-2 h-4 w-4" />
                        Szállásként rögzítés
                      </Button>
                    )}
                  </div>
                </CollapsiblePanel>
              );
            })}

            {accommodationIdeas.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Még nincsenek szállás ötletek. Adj hozzá egyet URL-lel, dátummal és becsült árral.
              </p>
            )}
          </div>
        </section>
      )}

      {filter === "bookings" && (
        <section className="space-y-4">
          <TripSectionHeading
            title="Foglalások"
            description="Tényleges szállások be- és kijelentkezési dátummal"
            action={
              <Button
                className={TRIP_SECTION_BTN_CLASS}
                onClick={() => {
                  setEditingAccommodation(null);
                  setAccommodationDrawerOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Új szállás
              </Button>
            }
          />

          <div className="space-y-3">
            {accommodations.map((accommodation) => {
              const accommodationCosts = costs.filter(
                (c) => c.accommodationId === accommodation.id
              );

              return (
                <CollapsiblePanel
                  key={accommodation.id}
                  defaultOpen={false}
                  title={accommodation.title}
                  subtitle={
                    <span className="flex flex-col gap-1.5 sm:gap-2">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {stayNightLabel(accommodation.checkIn, accommodation.checkOut)}
                        </span>
                        {accommodation.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {accommodation.location}
                          </span>
                        )}
                      </span>
                      <CostChips
                        costs={accommodationCosts}
                        participantCount={accommodation.participants.length}
                      />
                    </span>
                  }
                  alwaysVisible={
                    accommodation.url ? (
                      <UrlPreviewCard url={accommodation.url} compact className="w-full" />
                    ) : undefined
                  }
                  actions={
                    <div className="flex shrink-0 gap-0.5">
                      {accommodation.url && (
                        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                          <a
                            href={accommodation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditingAccommodation(accommodation);
                          setAccommodationDrawerOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDeleteAccommodation(accommodation.id)}
                        disabled={deleteAccommodationMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <MonogramGroup
                      names={accommodation.participants.map((p) => p.familyMember.name)}
                    />

                    {accommodation.note && (
                      <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        {accommodation.note}
                      </p>
                    )}
                  </div>
                </CollapsiblePanel>
              );
            })}

            {accommodations.length === 0 && (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Még nincsenek foglalások. Rögzíts egy szállást, vagy alakíts ötletet foglalássá.
              </p>
            )}
          </div>
        </section>
      )}

      <AccommodationIdeaFormDrawer
        open={ideaDrawerOpen}
        onOpenChange={setIdeaDrawerOpen}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        participants={participants}
        idea={editingIdea ?? undefined}
        onSaved={onRefresh}
      />

      <AccommodationFormDrawer
        open={accommodationDrawerOpen}
        onOpenChange={(open) => {
          setAccommodationDrawerOpen(open);
          if (!open) onConvertIdeaHandled?.();
        }}
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        participantOptions={participants}
        ideaOptions={ideaOptions}
        defaultIdeaId={convertIdeaId}
        accommodation={editingAccommodation ?? undefined}
        onSaved={onRefresh}
      />
    </div>
  );
}
