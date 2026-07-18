"use client";

import { useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  FileText,
  Plus,
  Receipt,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react";
import { formatDate } from "@csaladi-utazas/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripBudgetPanel } from "@/components/trips/trip-budget-panel";
import { TripSectionHeading, type TripDetailTab } from "@/components/trips/trip-detail-tabs";
import { TRIP_SECTION_BTN_CLASS } from "@/components/trips/trip-section-styles";
import type { TripDetailRow } from "@/lib/queries/trips";

type QuickActionId = "program" | "idea" | "cost" | "documents" | "people";

const QUICK_ACTIONS: {
  id: QuickActionId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "program", label: "Új program", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "idea", label: "Új ötlet", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "cost", label: "Új költség", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "documents", label: "Dokumentumok", icon: <FileText className="h-4 w-4 shrink-0" /> },
  { id: "people", label: "Résztvevők", icon: <Users className="h-4 w-4 shrink-0" /> },
];

interface TripOverviewSectionProps {
  trip: TripDetailRow;
  costsCount: number;
  documentsCount: number;
  programIdeasCount: number;
  accommodationIdeasCount: number;
  onNavigate: (tab: TripDetailTab) => void;
  onAddProgram: () => void;
  onAddCost: () => void;
  onAddIdea: () => void;
}

function StatCard({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[var(--touch-target)] flex-col items-start gap-1 rounded-xl border bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:min-h-0"
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
    </button>
  );
}

export function TripOverviewSection({
  trip,
  costsCount,
  documentsCount,
  programIdeasCount,
  accommodationIdeasCount,
  onNavigate,
  onAddProgram,
  onAddCost,
  onAddIdea,
}: TripOverviewSectionProps) {
  const upcomingPrograms = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...trip.programs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((p) => new Date(p.date) >= now)
      .slice(0, 3);
  }, [trip.programs]);

  const shownPrograms =
    upcomingPrograms.length > 0
      ? upcomingPrograms
      : [...trip.programs]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);

  const nextAccommodations = useMemo(
    () =>
      [...trip.accommodations]
        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
        .slice(0, 2),
    [trip.accommodations]
  );

  const [actionSelectKey, setActionSelectKey] = useState(0);

  function runQuickAction(id: QuickActionId) {
    switch (id) {
      case "program":
        onAddProgram();
        break;
      case "idea":
        onAddIdea();
        break;
      case "cost":
        onAddCost();
        break;
      case "documents":
        onNavigate("documents");
        break;
      case "people":
        onNavigate("people");
        break;
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <TripSectionHeading
          title="Áttekintés"
          description="Gyors összefoglaló és ugrás a részletekhez"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Program"
            value={trip.programs.length}
            onClick={() => onNavigate("planning")}
          />
          <StatCard
            icon={<BedDouble className="h-3.5 w-3.5" />}
            label="Szállás"
            value={trip.accommodations.length}
            onClick={() => onNavigate("accommodations")}
          />
          <StatCard
            icon={<Receipt className="h-3.5 w-3.5" />}
            label="Költség"
            value={costsCount}
            onClick={() => onNavigate("finances")}
          />
          <StatCard
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Dokumentum"
            value={documentsCount}
            onClick={() => onNavigate("documents")}
          />
        </div>
      </section>

      <section className="space-y-3">
        <TripSectionHeading
          title="Költségvetés"
          description="Terv vs. tény — részletek a Pénzügyeknél"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={() => onNavigate("finances")}
            >
              Részletek
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        <TripBudgetPanel trip={trip} />
      </section>

      <section className="space-y-3">
        <TripSectionHeading title="Gyors műveletek" />

        {/* Mobile: same pattern as section picker */}
        <div className="sm:hidden">
          <Select
            key={actionSelectKey}
            onValueChange={(value) => {
              runQuickAction(value as QuickActionId);
              setActionSelectKey((k) => k + 1);
            }}
          >
            <SelectTrigger className="h-12 w-full rounded-xl border bg-background px-3 text-base shadow-sm">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Művelet választása" />
              </span>
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {QUICK_ACTIONS.map((action) => (
                <SelectItem key={action.id} value={action.id} className="py-3">
                  <span className="flex items-center gap-2">
                    {action.icon}
                    <span>{action.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: compact button row */}
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Button className={TRIP_SECTION_BTN_CLASS} onClick={onAddProgram}>
            <Plus className="h-4 w-4" />
            Új program
          </Button>
          <Button variant="outline" className={TRIP_SECTION_BTN_CLASS} onClick={onAddIdea}>
            <Plus className="h-4 w-4" />
            Új ötlet
          </Button>
          <Button variant="outline" className={TRIP_SECTION_BTN_CLASS} onClick={onAddCost}>
            <Plus className="h-4 w-4" />
            Új költség
          </Button>
          <Button
            variant="outline"
            className={TRIP_SECTION_BTN_CLASS}
            onClick={() => onNavigate("documents")}
          >
            <FileText className="h-4 w-4" />
            Dokumentumok
          </Button>
          <Button
            variant="outline"
            className={TRIP_SECTION_BTN_CLASS}
            onClick={() => onNavigate("people")}
          >
            <Users className="h-4 w-4" />
            Résztvevők
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <TripSectionHeading
          title={upcomingPrograms.length > 0 ? "Következő programok" : "Programok"}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={() => onNavigate("planning")}
            >
              Összes
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        {shownPrograms.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {shownPrograms.map((program) => (
              <li key={program.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{program.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(program.date)}
                    {program.startTime ? ` · ${program.startTime}` : ""}
                  </p>
                </div>
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Még nincsenek programok.
            {programIdeasCount > 0 && ` (${programIdeasCount} ötlet vár programmá alakításra)`}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <TripSectionHeading
          title="Szállás"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={() => onNavigate("accommodations")}
            >
              Összes
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
        {nextAccommodations.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {nextAccommodations.map((stay) => (
              <li key={stay.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{stay.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
                  </p>
                </div>
                <BedDouble className="h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Még nincs foglalás.
            {accommodationIdeasCount > 0 &&
              ` (${accommodationIdeasCount} szállásötlet vár rögzítésre)`}
          </p>
        )}
      </section>
    </div>
  );
}
