"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { formatDate, isDateInRange, isSameDay, buildDayCostBreakdown, type TripCostContext } from "@csaladi-utazas/shared";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { useHufRates } from "@/components/exchange-rates-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { MonogramGroup } from "@/components/monogram";
import { ExternalLink, Plus, Pencil, Trash2, BedDouble } from "lucide-react";
import { toast } from "sonner";
import type { CalendarTripRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { deleteProgram } from "@/actions/programs";
import { deleteCost } from "@/actions/costs";
import { deleteTrip } from "@/actions/trips";
import { ProgramFormDrawer } from "@/components/trips/program-form-drawer";
import { CostFormDrawer } from "@/components/trips/cost-form-drawer";
import { TripFormDrawer } from "@/components/trips/trip-form-drawer";

type CalendarProgram = CalendarTripRow["programs"][number] & {
  tripId: string;
  tripTitle: string;
};

type CalendarAccommodation = NonNullable<CalendarTripRow["accommodations"]>[number] & {
  tripId: string;
  tripTitle: string;
};

type CalendarDayCost = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  amountScope?: string;
  programId: string | null;
  accommodationId?: string | null;
  tripId: string;
};

interface CalendarDayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  trips: CalendarTripRow[];
  members: FamilyMemberRow[];
  currentUserId: string;
  onSaved?: () => void;
}

const actionBtnClass = "w-full min-h-[var(--touch-target)] sm:min-h-9";

function tripToCostContext(trip: CalendarTripRow): TripCostContext {
  return {
    id: trip.id,
    title: trip.title,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    participants: trip.participants.map((p) => ({
      id: p.familyMember.id,
      name: p.familyMember.name,
    })),
    programs: trip.programs.map((p) => ({
      id: p.id,
      title: p.title,
      date: new Date(p.date),
      participantIds: p.participants.map((x) => x.familyMember.id),
      costs: p.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
    })),
    accommodations: (trip.accommodations ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      checkIn: new Date(a.checkIn),
      checkOut: new Date(a.checkOut),
      participantIds: a.participants.map((x) => x.familyMember.id),
      costs: a.costs.map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
    })),
    tripLevelCosts: trip.costs
      .filter((c) => !c.programId && !c.accommodationId)
      .map((c) => ({ ...c, amountScope: c.amountScope ?? "TOTAL" })),
  };
}

function isAccommodationNight(day: Date, checkIn: Date | string, checkOut: Date | string): boolean {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  return d >= start && d < end;
}

export function CalendarDayDrawer({
  open,
  onOpenChange,
  date,
  trips,
  members,
  currentUserId,
  onSaved,
}: CalendarDayDrawerProps) {
  const rates = useHufRates();
  const [isPending, startTransition] = useTransition();
  const [programDrawerOpen, setProgramDrawerOpen] = useState(false);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<CalendarTripRow | null>(null);
  const [editingProgram, setEditingProgram] = useState<CalendarProgram | null>(null);
  const [editingCost, setEditingCost] = useState<CalendarDayCost | null>(null);

  const dayTrips = trips.filter((t) =>
    isDateInRange(date, new Date(t.startDate), new Date(t.endDate))
  );

  const dayPrograms: CalendarProgram[] = dayTrips.flatMap((t) =>
    t.programs
      .filter((p) => isSameDay(new Date(p.date), date))
      .map((p) => ({ ...p, tripId: t.id, tripTitle: t.title }))
  );

  const dayAccommodations: CalendarAccommodation[] = dayTrips.flatMap((t) =>
    (t.accommodations ?? [])
      .filter((a) => isAccommodationNight(date, a.checkIn, a.checkOut))
      .map((a) => ({ ...a, tripId: t.id, tripTitle: t.title }))
  );

  const dayCosts: CalendarDayCost[] = dayTrips.flatMap((t) => {
    const programCosts = t.programs
      .filter((p) => isSameDay(new Date(p.date), date))
      .flatMap((p) =>
        p.costs.map((c) => ({
          ...c,
          amountScope: c.amountScope ?? "TOTAL",
          programId: p.id,
          accommodationId: null,
          tripId: t.id,
        }))
      );
    const accommodationCosts = (t.accommodations ?? [])
      .filter((a) => isAccommodationNight(date, a.checkIn, a.checkOut))
      .flatMap((a) =>
        a.costs.map((c) => ({
          ...c,
          amountScope: c.amountScope ?? "TOTAL",
          programId: null,
          accommodationId: a.id,
          tripId: t.id,
        }))
      );
    const tripCosts = t.costs
      .filter((c) => !c.programId && !c.accommodationId)
      .map((c) => ({
        ...c,
        amountScope: c.amountScope ?? "TOTAL",
        tripId: t.id,
      }));
    return [...tripCosts, ...programCosts, ...accommodationCosts];
  });

  const totalCostHuf = dayTrips.reduce((sum, t) => {
    const breakdown = buildDayCostBreakdown(tripToCostContext(t), date, rates);
    return sum + (breakdown?.totalHuf ?? 0);
  }, 0);

  const dayPersonTotals = new Map<string, { name: string; amountHuf: number }>();
  for (const trip of dayTrips) {
    const breakdown = buildDayCostBreakdown(tripToCostContext(trip), date, rates);
    if (!breakdown) continue;
    for (const p of breakdown.perPerson) {
      const existing = dayPersonTotals.get(p.id);
      if (existing) {
        existing.amountHuf += p.amountHuf;
      } else {
        dayPersonTotals.set(p.id, { name: p.name, amountHuf: p.amountHuf });
      }
    }
  }

  const selectedDateStr = formatDate(date);
  const activeTrip = activeTripId ? dayTrips.find((t) => t.id === activeTripId) : null;
  const nestedFormOpen = programDrawerOpen || costDrawerOpen || tripDrawerOpen;
  const ignoreDismissRef = useRef(false);

  function handleNestedFormOpenChange(setter: (open: boolean) => void, next: boolean) {
    if (!next) {
      ignoreDismissRef.current = true;
      setter(false);
      window.setTimeout(() => {
        ignoreDismissRef.current = false;
      }, 100);
      return;
    }
    setter(true);
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next && (nestedFormOpen || ignoreDismissRef.current)) return;
    onOpenChange(next);
  }

  function refresh() {
    onSaved?.();
  }

  function openNewProgram(tripId: string) {
    setActiveTripId(tripId);
    setEditingProgram(null);
    setProgramDrawerOpen(true);
  }

  function openEditProgram(program: CalendarProgram) {
    setActiveTripId(program.tripId);
    setEditingProgram(program);
    setProgramDrawerOpen(true);
  }

  function openNewCost(tripId: string) {
    setActiveTripId(tripId);
    setEditingCost(null);
    setCostDrawerOpen(true);
  }

  function openEditCost(cost: CalendarDayCost) {
    setActiveTripId(cost.tripId);
    setEditingCost(cost);
    setCostDrawerOpen(true);
  }

  function openEditTrip(trip: CalendarTripRow) {
    setEditingTrip(trip);
    setTripDrawerOpen(true);
  }

  function handleDeleteTrip(id: string) {
    startTransition(async () => {
      const result = await deleteTrip(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Utazás törölve");
        refresh();
        onOpenChange(false);
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
    startTransition(async () => {
      const result = await deleteCost(id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Költség törölve");
        refresh();
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedDateStr}</DialogTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Utazások, programok, szállások és költségek
            </p>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {dayTrips.length === 0 &&
            dayPrograms.length === 0 &&
            dayAccommodations.length === 0 &&
            dayCosts.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Ezen a napon nincs utazás, program, szállás vagy költség.
              </p>
            ) : (
              <>
                {dayTrips.map((trip) => {
                  const isOwner = trip.userId === currentUserId;
                  return (
                    <CollapsiblePanel
                      key={trip.id}
                      defaultOpen={dayTrips.length === 1}
                      title={trip.title}
                      subtitle={
                        <span className="flex flex-col gap-0.5">
                          <span>{trip.destination}</span>
                          <MonogramGroup
                            names={trip.participants.map((p) => p.familyMember.name)}
                            className="mt-1"
                          />
                        </span>
                      }
                      actions={
                        isOwner ? (
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => openEditTrip(trip)}
                              disabled={isPending}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleDeleteTrip(trip.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : undefined
                      }
                    >
                      <div className="space-y-3">
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link href={`/trips/${trip.id}`}>Utazás részletei →</Link>
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={actionBtnClass}
                            onClick={() => openNewProgram(trip.id)}
                            disabled={isPending}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                            Program
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={actionBtnClass}
                            onClick={() => openNewCost(trip.id)}
                            disabled={isPending}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5 shrink-0" />
                            Költség
                          </Button>
                        </div>
                      </div>
                    </CollapsiblePanel>
                  );
                })}

                {dayPrograms.map((program) => (
                  <CollapsiblePanel
                    key={program.id}
                    defaultOpen={false}
                    title={program.title}
                    subtitle={
                      <span className="space-y-0.5">
                        <span>
                          {program.tripTitle}
                          {program.startTime && ` · ${program.startTime}`}
                          {program.endTime && ` – ${program.endTime}`}
                        </span>
                        {program.location && <span className="block">{program.location}</span>}
                        {program.url && (
                          <a
                            href={program.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {program.url}
                          </a>
                        )}
                      </span>
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
                          onClick={() => openEditProgram(program)}
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
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
                    <div className="space-y-3">
                      <MonogramGroup names={program.participants.map((p) => p.familyMember.name)} />
                    </div>
                  </CollapsiblePanel>
                ))}

                {dayAccommodations.map((accommodation) => (
                  <CollapsiblePanel
                    key={accommodation.id}
                    defaultOpen={false}
                    title={accommodation.title}
                    subtitle={
                      <span className="space-y-0.5">
                        <span>
                          {accommodation.tripTitle}
                          {` · ${formatDate(accommodation.checkIn)} – ${formatDate(accommodation.checkOut)}`}
                        </span>
                        {accommodation.location && (
                          <span className="block">{accommodation.location}</span>
                        )}
                        {accommodation.url && (
                          <a
                            href={accommodation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {accommodation.url}
                          </a>
                        )}
                      </span>
                    }
                    actions={
                      accommodation.url ? (
                        <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                          <a href={accommodation.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : undefined
                    }
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BedDouble className="h-3.5 w-3.5 shrink-0" />
                        <span>Éjszakai szállás ezen a napon</span>
                      </div>
                      <MonogramGroup
                        names={accommodation.participants.map((p) => p.familyMember.name)}
                      />
                      {accommodation.costs.length > 0 && (
                        <div className="space-y-1.5">
                          {accommodation.costs.map((cost) => (
                            <div
                              key={cost.id}
                              className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                            >
                              <span className="text-sm">{cost.title}</span>
                              <CostAmountDisplay
                                amount={cost.amount}
                                currency={cost.currency}
                                amountScope={cost.amountScope ?? "TOTAL"}
                                participantCount={accommodation.participants.length}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsiblePanel>
                ))}

                {dayCosts.length > 0 && (
                  <CollapsiblePanel
                    defaultOpen
                    title="Költségek összesítése"
                    subtitle={`${dayCosts.length} tétel · ${totalCostHuf.toLocaleString("hu-HU")} Ft összesen`}
                  >
                    <div className="space-y-2">
                      {dayCosts.map((cost) => {
                        const trip = dayTrips.find((t) => t.id === cost.tripId);
                        const participantCount = cost.programId
                          ? (trip?.programs.find((p) => p.id === cost.programId)?.participants
                              .length ?? 0)
                          : cost.accommodationId
                            ? (trip?.accommodations?.find((a) => a.id === cost.accommodationId)
                                ?.participants.length ?? 0)
                            : (trip?.participants.length ?? 0);

                        return (
                        <div
                          key={cost.id}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{cost.title}</p>
                            <CostAmountDisplay
                              amount={cost.amount}
                              currency={cost.currency}
                              amountScope={cost.amountScope}
                              participantCount={participantCount}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditCost(cost)}
                              disabled={isPending}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteCost(cost.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        );
                      })}

                      <div className="flex justify-between border-t pt-3 font-semibold">
                        <span>Összesen (≈ HUF)</span>
                        <span>{totalCostHuf.toLocaleString("hu-HU")} Ft</span>
                      </div>

                      {dayPersonTotals.size > 0 && (
                        <div className="space-y-1 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Fejenként ezen a napon
                          </p>
                          {[...dayPersonTotals.entries()]
                            .filter(([, p]) => p.amountHuf > 0)
                            .map(([id, p]) => (
                              <div key={id} className="flex justify-between text-sm">
                                <span>{p.name}</span>
                                <span>{p.amountHuf.toLocaleString("hu-HU")} Ft</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </CollapsiblePanel>
                )}
              </>
            )}
          </DialogBody>

          <DialogFooter className="grid grid-cols-1">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Bezárás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeTrip && (
        <>
          <ProgramFormDrawer
            open={programDrawerOpen}
            onOpenChange={(next) => handleNestedFormOpenChange(setProgramDrawerOpen, next)}
            tripId={activeTrip.id}
            tripStartDate={formatDate(activeTrip.startDate)}
            tripEndDate={formatDate(activeTrip.endDate)}
            participantOptions={activeTrip.participants.map((p) => p.familyMember)}
            ideaOptions={activeTrip.ideas}
            program={editingProgram ?? undefined}
            defaultDate={editingProgram ? undefined : selectedDateStr}
            onSaved={refresh}
          />
          <CostFormDrawer
            open={costDrawerOpen}
            onOpenChange={(next) => handleNestedFormOpenChange(setCostDrawerOpen, next)}
            tripId={activeTrip.id}
            participantOptions={activeTrip.participants.map((p) => p.familyMember)}
            cost={
              editingCost
                ? {
                    ...editingCost,
                    amountScope: editingCost.amountScope ?? "TOTAL",
                    program: editingCost.programId
                      ? {
                          title:
                            activeTrip.programs.find((p) => p.id === editingCost.programId)
                              ?.title ?? "",
                        }
                      : null,
                    accommodation: editingCost.accommodationId
                      ? {
                          title:
                            activeTrip.accommodations?.find(
                              (a) => a.id === editingCost.accommodationId
                            )?.title ?? "",
                        }
                      : null,
                  }
                : undefined
            }
            onSaved={refresh}
          />
        </>
      )}

      <TripFormDrawer
        open={tripDrawerOpen}
        onOpenChange={(next) => handleNestedFormOpenChange(setTripDrawerOpen, next)}
        members={members}
        trip={
          editingTrip
            ? {
                id: editingTrip.id,
                title: editingTrip.title,
                destination: editingTrip.destination,
                startDate: editingTrip.startDate,
                endDate: editingTrip.endDate,
                participants: editingTrip.participants,
              }
            : undefined
        }
        onSaved={refresh}
      />
    </>
  );
}
