"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Calendar,
  ArrowRight,
  Plane,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import { MonogramGroup } from "@/components/monogram";
import { JoinTripDialog } from "@/components/trips/join-trip-dialog";
import { TripFormDrawer } from "@/components/trips/trip-form-drawer";
import { CreateTripFromTemplateDialog } from "@/components/trips/create-trip-from-template-dialog";
import type { TripListRow } from "@/lib/queries/trips";
import type { FamilyMemberRow } from "@/lib/queries/family";
import { EmptyState } from "@/components/ui/empty-state";
import { FirstUseGuide } from "@/components/onboarding/first-use-guide";
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

const STATUS_ACCENT = {
  upcoming: {
    rail: "bg-[var(--brand-accent)]",
    date: "from-[var(--brand-accent)]/20 via-[var(--brand-accent)]/8 to-transparent text-[#1a2744] dark:text-[#ffe0b0]",
    badge: "text-[var(--brand-accent)]",
    glow: "group-hover:shadow-[0_18px_40px_-24px_rgba(255,184,102,0.55)]",
  },
  active: {
    rail: "bg-emerald-500",
    date: "from-emerald-500/18 via-emerald-500/6 to-transparent text-emerald-900 dark:text-emerald-100",
    badge: "text-emerald-700 dark:text-emerald-300",
    glow: "group-hover:shadow-[0_18px_40px_-24px_rgba(16,185,129,0.45)]",
  },
  past: {
    rail: "bg-muted-foreground/40",
    date: "from-muted via-muted/40 to-transparent text-muted-foreground",
    badge: "text-muted-foreground",
    glow: "group-hover:shadow-[0_16px_36px_-24px_rgba(26,54,93,0.35)]",
  },
} as const;

function TripCard({ trip }: { trip: TripListRow }) {
  const status = tripStatus(trip);
  const start = tripDateParts(trip.startDate);
  const accent = STATUS_ACCENT[status];
  const participantNames = trip.participants.map((p) => p.familyMember.name);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/90",
        "shadow-sm transition-[border-color,box-shadow,transform] duration-300",
        "hover:-translate-y-0.5 hover:border-primary/25",
        accent.glow
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1 rounded-l-[1.35rem]", accent.rail)}
      />

      <div className="relative flex gap-4 p-4 pl-5 sm:gap-5 sm:p-5 sm:pl-6">
        <div
          className={cn(
            "flex h-[4.5rem] w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b sm:h-[5.25rem] sm:w-[4.25rem]",
            accent.date
          )}
        >
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] opacity-80">
            {start.month}
          </span>
          <span className="font-display text-[1.7rem] font-bold leading-none tracking-tight sm:text-[1.85rem]">
            {start.day}
          </span>
          <span className="mt-0.5 text-[0.65rem] tabular-nums opacity-70">{start.year}</span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                <span className="truncate">{trip.destination}</span>
              </p>
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                {trip.title}
              </h3>
            </div>
            <span
              className={cn(
                "mt-0.5 shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.16em]",
                accent.badge
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="tabular-nums">
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex min-w-0 items-center gap-3">
              <MonogramGroup names={participantNames} />
              <p className="hidden text-xs text-muted-foreground sm:block">
                <span className="tabular-nums">{trip._count.programs}</span> program
                <span className="mx-1.5 text-border">·</span>
                <span className="tabular-nums">{trip._count.costs}</span> költség
                <span className="mx-1.5 text-border">·</span>
                <span className="tabular-nums">{participantNames.length}</span> fő
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-transform duration-300 group-hover:translate-x-0.5">
              Részletek
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          <p className="text-xs text-muted-foreground sm:hidden">
            <span className="tabular-nums">{trip._count.programs}</span> program
            <span className="mx-1.5 text-border">·</span>
            <span className="tabular-nums">{trip._count.costs}</span> költség
            <span className="mx-1.5 text-border">·</span>
            <span className="tabular-nums">{participantNames.length}</span> fő
          </p>
        </div>
      </div>

      <Link
        href={`/trips/${trip.id}`}
        className="absolute inset-0 z-10"
        aria-label={`${trip.title} részletei`}
      />
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
  const [templateDialogTrip, setTemplateDialogTrip] = useState<TripListRow | null>(null);

  const grouped = useMemo(() => {
    const active: TripListRow[] = [];
    const upcoming: TripListRow[] = [];
    const past: TripListRow[] = [];
    const templates: TripListRow[] = [];

    for (const trip of trips) {
      if (trip.isTemplate) {
        templates.push(trip);
        continue;
      }
      const status = tripStatus(trip);
      if (status === "active") active.push(trip);
      else if (status === "upcoming") upcoming.push(trip);
      else past.push(trip);
    }

    return { active, upcoming, past, templates };
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
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
      <FirstUseGuide hasTrips={trips.length > 0} hasFamilyMembers={members.length > 0} />

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
          <div className="flex w-full items-stretch gap-2 sm:w-auto">
            <JoinTripDialog className="min-w-0 flex-1 sm:flex-none" />
            <Button
              className="h-10 min-h-10 min-w-0 flex-1 px-3 sm:flex-none"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="h-4 w-4 shrink-0" />
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
        <EmptyState
          icon={Sparkles}
          title="Még nincs utazásod"
          description="Hozz létre egy új utazást, vagy csatlakozz meghívó kóddal."
        >
          <Button
            className="min-h-[var(--touch-target)]"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Első utazás létrehozása
          </Button>
          <JoinTripDialog />
        </EmptyState>
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

      {grouped.templates.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-base font-semibold">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Sablonok
            </h3>
            <p className="text-sm text-muted-foreground">
              Mentett utazás sablonok — hozz létre belőlük gyorsan új utazást.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {grouped.templates.map((trip) => (
              <article
                key={trip.id}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {trip.destination}
                  </p>
                  <h4 className="truncate text-base font-semibold">{trip.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {trip._count.programs} program · {trip.participants.length} résztvevő
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-9 min-h-9 shrink-0"
                  onClick={() => setTemplateDialogTrip(trip)}
                >
                  <Plus className="h-4 w-4" />
                  Új utazás
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}

      <TripFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        members={members}
        onSaved={handleSaved}
      />
      <CreateTripFromTemplateDialog
        open={templateDialogTrip != null}
        onOpenChange={(open) => {
          if (!open) setTemplateDialogTrip(null);
        }}
        template={templateDialogTrip}
        members={members}
      />
    </div>
  );
}
