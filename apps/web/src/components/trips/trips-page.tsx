"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Calendar,
  Copy,
  ArrowRight,
  Plane,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { JoinTripDialog } from "@/components/trips/join-trip-dialog";
import { TripFormDrawer } from "@/components/trips/trip-form-drawer";
import { DuplicateTripDialog } from "@/components/trips/duplicate-trip-dialog";
import type { TripListRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { cn } from "@/lib/utils";

function tripDateParts(date: Date | string) {
  const d = new Date(date);
  return {
    month: d.toLocaleDateString("hu-HU", { month: "short" }).replace(".", ""),
    day: d.getDate(),
    year: d.getFullYear(),
  };
}

function tripStatus(trip: TripListRow): "upcoming" | "active" | "past" {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(trip.endDate);
  end.setHours(23, 59, 59, 999);

  if (end < now) return "past";
  if (start > now) return "upcoming";
  return "active";
}

const STATUS_LABELS = {
  upcoming: "Közelgő",
  active: "Folyamatban",
  past: "Lezárult",
} as const;

const STATUS_STYLES = {
  upcoming: "bg-primary/10 text-primary",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  past: "bg-muted text-muted-foreground",
} as const;

function TripCard({
  trip,
  onDuplicate,
}: {
  trip: TripListRow;
  onDuplicate: (trip: TripListRow) => void;
}) {
  const status = tripStatus(trip);
  const start = tripDateParts(trip.startDate);
  const end = tripDateParts(trip.endDate);

  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <Link href={`/trips/${trip.id}`} className="absolute inset-0 z-0" aria-label={`${trip.title} részletei`} />

      <div className="relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:p-5">
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:justify-center sm:border-r sm:pr-5">
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-auto sm:w-20 sm:py-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
              {start.month}
            </span>
            <span className="text-2xl font-bold leading-none">{start.day}</span>
            <span className="text-[0.65rem] text-primary/80">{start.year}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {trip.destination}
              </p>
              <h3 className="mt-0.5 text-lg font-bold tracking-tight group-hover:text-primary sm:text-xl">
                {trip.title}
              </h3>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_STYLES[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            {start.year !== end.year && ` (${end.year})`}
          </p>

          <MonogramGroup names={trip.participants.map((p) => p.familyMember.name)} />

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">
              {trip._count.programs} program
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1">
              {trip._count.costs} költség
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1">
              {trip.participants.length} résztvevő
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
        <Button asChild size="sm" className="min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none">
          <Link href={`/trips/${trip.id}`}>
            Részletek
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
        >
          <Link href={`/trips/${trip.id}?new=program`}>+ Program</Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-h-[var(--touch-target)] flex-1 sm:min-h-9 sm:flex-none"
        >
          <Link href={`/trips/${trip.id}?new=cost`}>+ Költség</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="min-h-[var(--touch-target)] sm:min-h-9"
          onClick={(e) => {
            e.preventDefault();
            onDuplicate(trip);
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Másolás
        </Button>
      </div>
    </article>
  );
}

export function TripsPage({
  trips,
  members,
}: {
  trips: TripListRow[];
  members: FamilyMemberRow[];
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [duplicateTrip, setDuplicateTrip] = useState<TripListRow | null>(null);

  const grouped = useMemo(() => {
    const active: TripListRow[] = [];
    const upcoming: TripListRow[] = [];
    const past: TripListRow[] = [];

    for (const trip of trips) {
      const status = tripStatus(trip);
      if (status === "active") active.push(trip);
      else if (status === "upcoming") upcoming.push(trip);
      else past.push(trip);
    }

    return { active, upcoming, past };
  }, [trips]);

  function handleSaved() {
    setDrawerOpen(false);
    router.refresh();
  }

  function renderSection(title: string, items: TripListRow[], description?: string) {
    if (items.length === 0) return null;

    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDuplicate={setDuplicateTrip} />
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
              <Plane className="h-4 w-4" />
              Családi utazások
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Utazások</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Tervezz programokat, kövesd a költségeket és tartsd egy helyen a dokumentumokat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <JoinTripDialog />
            <Button
              onClick={() => setDrawerOpen(true)}
              className="min-h-[var(--touch-target)] sm:min-h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Új utazás
            </Button>
          </div>
        </div>

        {trips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <span className="rounded-full bg-background px-3 py-1 text-sm shadow-sm">
              {trips.length} utazás
            </span>
            {grouped.active.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {grouped.active.length} folyamatban
              </span>
            )}
            {grouped.upcoming.length > 0 && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                {grouped.upcoming.length} közelgő
              </span>
            )}
          </div>
        )}
      </section>

      {trips.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Még nincs utazásod</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hozz létre egy új utazást, vagy csatlakozz meghívó kóddal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setDrawerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Első utazás létrehozása
            </Button>
            <JoinTripDialog />
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          {renderSection(
            "Folyamatban",
            grouped.active,
            "Jelenleg zajló utazások — itt érdemes naponta frissíteni a programot és költségeket."
          )}
          {renderSection("Közelgő utazások", grouped.upcoming)}
          {renderSection("Korábbi utazások", grouped.past)}
        </div>
      )}

      <TripFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        members={members}
        onSaved={handleSaved}
      />

      {duplicateTrip && (
        <DuplicateTripDialog
          open={Boolean(duplicateTrip)}
          onOpenChange={(open) => !open && setDuplicateTrip(null)}
          sourceTrip={duplicateTrip}
        />
      )}
    </div>
  );
}
