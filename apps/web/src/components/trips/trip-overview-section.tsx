"use client";

import { useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Camera,
  FileText,
  ImageIcon,
  Lightbulb,
  MapPin,
  Plus,
  Receipt,
  Trash2,
  Users,
  ArrowRight,
  Zap,
  Plane,
  Pencil,
  Package,
  Wallet,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { formatDate, type TripActivityType } from "@csaladi-utazas/shared";
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
import { Monogram, MonogramGroup } from "@/components/monogram";
import { CostAmountDisplay } from "@/components/cost-amount-display";
import { MoneyDisplay } from "@/components/money-display";
import { cn } from "@/lib/utils";

type QuickActionId = "program" | "idea" | "cost" | "documents" | "people" | "transport";

const QUICK_ACTIONS: {
  id: QuickActionId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "program", label: "Új program", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "idea", label: "Új ötlet", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "cost", label: "Gyors költség", icon: <Plus className="h-4 w-4 shrink-0" /> },
  { id: "transport", label: "Közlekedés", icon: <Plane className="h-4 w-4 shrink-0" /> },
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

function nightCount(checkIn: Date | string, checkOut: Date | string) {
  const start = new Date(checkIn);
  start.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function CostSummary({
  costs,
  participantCount,
}: {
  costs: { amount: number; currency: string; title: string; amountScope?: string | null }[];
  participantCount: number;
}) {
  if (costs.length === 0) {
    return <span className="text-sm text-muted-foreground">Nincs költség</span>;
  }
  if (costs.length === 1) {
    const c = costs[0];
    return (
      <CostAmountDisplay
        amount={c.amount}
        currency={c.currency}
        amountScope={c.amountScope ?? "TOTAL"}
        participantCount={participantCount}
        chip
        className="text-sm"
      />
    );
  }
  const byCurrency = new Map<string, number>();
  for (const c of costs) {
    byCurrency.set(c.currency, (byCurrency.get(c.currency) ?? 0) + c.amount);
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {[...byCurrency.entries()].map(([currency, amount]) => (
        <MoneyDisplay key={currency} amount={amount} currency={currency} className="text-sm font-medium" />
      ))}
      <span className="text-xs text-muted-foreground">{costs.length} tétel</span>
    </div>
  );
}

const ACTIVITY_PAGE_SIZE = 10;

function activityVisual(type: string): { icon: LucideIcon; className: string } {
  switch (type as TripActivityType) {
    case "PROGRAM_CREATED":
    case "PROGRAM_UPDATED":
      return { icon: CalendarDays, className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" };
    case "PROGRAM_DELETED":
      return { icon: Trash2, className: "bg-destructive/10 text-destructive" };
    case "ACCOMMODATION_CREATED":
    case "ACCOMMODATION_UPDATED":
      return { icon: BedDouble, className: "bg-amber-500/10 text-amber-800 dark:text-amber-300" };
    case "ACCOMMODATION_DELETED":
      return { icon: Trash2, className: "bg-destructive/10 text-destructive" };
    case "TRANSPORT_CREATED":
    case "TRANSPORT_UPDATED":
      return { icon: Plane, className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" };
    case "TRANSPORT_DELETED":
      return { icon: Trash2, className: "bg-destructive/10 text-destructive" };
    case "COST_CREATED":
    case "COST_UPDATED":
      return { icon: Receipt, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    case "COST_DELETED":
      return { icon: Trash2, className: "bg-destructive/10 text-destructive" };
    case "DOCUMENT_UPLOADED":
      return { icon: FileText, className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" };
    case "DOCUMENT_DELETED":
      return { icon: Trash2, className: "bg-destructive/10 text-destructive" };
    case "PHOTO_UPLOADED":
      return { icon: ImageIcon, className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" };
    case "PARTICIPANTS_UPDATED":
      return { icon: Users, className: "bg-primary/10 text-primary" };
    case "SETTLEMENT_PAYMENT":
      return { icon: Wallet, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    case "PACKING_UPDATED":
      return { icon: Package, className: "bg-orange-500/10 text-orange-800 dark:text-orange-300" };
    case "COVER_UPDATED":
      return { icon: Camera, className: "bg-primary/10 text-primary" };
    case "IDEA_CREATED":
      return { icon: Lightbulb, className: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300" };
    default:
      return { icon: Pencil, className: "bg-muted text-muted-foreground" };
  }
}

function ActivityFeed({
  activities,
}: {
  activities: TripDetailRow["activities"];
}) {
  const totalPages = Math.max(1, Math.ceil(activities.length / ACTIVITY_PAGE_SIZE));
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * ACTIVITY_PAGE_SIZE;
  const visible = activities.slice(start, start + ACTIVITY_PAGE_SIZE);
  const showPager = activities.length > ACTIVITY_PAGE_SIZE;

  return (
    <section className="space-y-3">
      <TripSectionHeading
        title="Aktivitás"
        action={
          showPager ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {start + 1}–{Math.min(start + ACTIVITY_PAGE_SIZE, activities.length)} /{" "}
              {activities.length}
            </span>
          ) : undefined
        }
      />
      <ul className="overflow-hidden rounded-xl border">
        {visible.map((a) => {
          const visual = activityVisual(a.type);
          const Icon = visual.icon;
          const participantChange = parseParticipantActivityMeta(a.meta);
          return (
            <li
              key={a.id}
              className="flex gap-3 border-b px-3 py-3 last:border-b-0 sm:gap-3.5 sm:px-4"
            >
              <Monogram name={a.actor.name} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium leading-5">{a.actor.name}</p>
                  <time
                    dateTime={new Date(a.createdAt).toISOString()}
                    className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                  >
                    {relativeActivityTime(a.createdAt)}
                  </time>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      visual.className
                    )}
                    aria-hidden
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {participantChange ? (
                      <>
                        <p className="text-sm leading-5 text-muted-foreground">Résztvevők frissítve</p>
                        {participantChange.addedNames.length > 0 ? (
                          <p className="break-words text-sm leading-5">
                            <span className="font-medium text-emerald-700 dark:text-emerald-300">
                              Hozzáadva:
                            </span>{" "}
                            <span className="text-foreground">{participantChange.addedNames.join(", ")}</span>
                          </p>
                        ) : null}
                        {participantChange.removedNames.length > 0 ? (
                          <p className="break-words text-sm leading-5">
                            <span className="font-medium text-destructive">Eltávolítva:</span>{" "}
                            <span className="text-foreground">
                              {participantChange.removedNames.join(", ")}
                            </span>
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="break-words text-sm leading-5 text-muted-foreground">{a.summary}</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {showPager ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[var(--touch-target)] gap-1 sm:min-h-9"
            disabled={currentPage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Előző oldal"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Előző</span>
          </Button>
          <p className="text-sm tabular-nums text-muted-foreground">
            {currentPage + 1} / {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[var(--touch-target)] gap-1 sm:min-h-9"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Következő oldal"
          >
            <span className="hidden sm:inline">Következő</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function parseParticipantActivityMeta(meta: unknown): {
  addedNames: string[];
  removedNames: string[];
} | null {
  if (!meta || typeof meta !== "object") return null;
  const record = meta as Record<string, unknown>;
  const addedNames = Array.isArray(record.addedNames)
    ? record.addedNames.filter((n): n is string => typeof n === "string" && n.length > 0)
    : [];
  const removedNames = Array.isArray(record.removedNames)
    ? record.removedNames.filter((n): n is string => typeof n === "string" && n.length > 0)
    : [];
  if (addedNames.length === 0 && removedNames.length === 0) return null;
  return { addedNames, removedNames };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function relativeActivityTime(date: Date | string) {
  const then = new Date(date).getTime();
  const diffMin = Math.round((Date.now() - then) / 60_000);
  if (diffMin < 1) return "most";
  if (diffMin < 60) return `${diffMin} perce`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.round(hours / 24);
  return `${days} napja`;
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
  const [dayMode, setDayMode] = useState<"today" | "tomorrow">("today");

  const now = useMemo(() => new Date(), []);

  const focusDate = useMemo(() => {
    const d = startOfDay(now);
    if (dayMode === "tomorrow") d.setDate(d.getDate() + 1);
    return d;
  }, [now, dayMode]);

  const focusKey = dayKey(focusDate);

  const dayItems = useMemo(() => {
    const items: { time: string; label: string; kind: string }[] = [];

    for (const p of trip.programs) {
      if (dayKey(new Date(p.date)) !== focusKey) continue;
      items.push({
        time: p.startTime ?? "–",
        label: p.title,
        kind: "program",
      });
    }
    for (const t of trip.transports ?? []) {
      if (dayKey(new Date(t.departureDate)) !== focusKey) continue;
      items.push({
        time: t.departureTime ?? "–",
        label: t.title,
        kind: "transport",
      });
    }
    for (const a of trip.accommodations) {
      if (dayKey(new Date(a.checkIn)) === focusKey) {
        items.push({ time: "CI", label: `Bejelentkezés: ${a.title}`, kind: "stay" });
      }
      if (dayKey(new Date(a.checkOut)) === focusKey) {
        items.push({ time: "CO", label: `Kijelentkezés: ${a.title}`, kind: "stay" });
      }
    }

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [trip, focusKey]);

  const showTodayPanel = useMemo(() => {
    const s = startOfDay(new Date(trip.startDate));
    const e = startOfDay(new Date(trip.endDate));
    const n = startOfDay(now);
    const daysUntil = Math.round((s.getTime() - n.getTime()) / 86_400_000);
    return (n >= s && n <= e) || (daysUntil >= 0 && daysUntil <= 1);
  }, [trip, now]);

  const upcomingPrograms = useMemo(() => {
    const start = startOfDay(now);
    return [...trip.programs]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter((p) => new Date(p.date) >= start)
      .slice(0, 3);
  }, [trip.programs, now]);

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
      case "transport":
        onNavigate("transport");
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
      {showTodayPanel ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <TripSectionHeading title={dayMode === "today" ? "Mai nap" : "Holnap"} />
            <div className="flex rounded-lg border p-0.5">
              <button
                type="button"
                className={`min-h-9 rounded-md px-3 text-sm font-medium ${
                  dayMode === "today" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setDayMode("today")}
              >
                Ma
              </button>
              <button
                type="button"
                className={`min-h-9 rounded-md px-3 text-sm font-medium ${
                  dayMode === "tomorrow"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
                onClick={() => setDayMode("tomorrow")}
              >
                Holnap
              </button>
            </div>
          </div>
          {dayItems.length > 0 ? (
            <ul className="divide-y rounded-xl border">
              {dayItems.map((item, i) => (
                <li key={`${item.kind}-${item.label}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {item.time}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Nincs program erre a napra.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button className={TRIP_SECTION_BTN_CLASS} onClick={onAddCost}>
              <Plus className="h-4 w-4" />
              Gyors költség
            </Button>
            <Button
              variant="outline"
              className={TRIP_SECTION_BTN_CLASS}
              onClick={() => onNavigate("documents")}
            >
              Csomagolás
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <TripSectionHeading title="Áttekintés" description="Gyors összefoglaló" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard
            icon={<Plane className="h-3.5 w-3.5" />}
            label="Közlekedés"
            value={trip.transports?.length ?? 0}
            onClick={() => onNavigate("transport")}
          />
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

      {(trip.activities?.length ?? 0) > 0 ? (
        <ActivityFeed activities={trip.activities} />
      ) : null}

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
            Gyors költség
          </Button>
          <Button
            variant="outline"
            className={TRIP_SECTION_BTN_CLASS}
            onClick={() => onNavigate("transport")}
          >
            <Plane className="h-4 w-4" />
            Közlekedés
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
          <>
            {/* Mobile: compact list */}
            <ul className="divide-y rounded-xl border md:hidden">
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

            {/* Desktop: dense multi-column rows */}
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.8fr)] gap-3 border-b bg-muted/25 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Program</span>
                <span>Időpont</span>
                <span>Résztvevők</span>
                <span className="text-right">Költség</span>
              </div>
              <ul className="divide-y">
                {shownPrograms.map((program) => (
                  <li
                    key={program.id}
                    className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.8fr)] items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{program.title}</p>
                      {program.location ? (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {program.location}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium tabular-nums">{formatDate(program.date)}</p>
                      <p className="text-muted-foreground">
                        {program.startTime || program.endTime
                          ? `${program.startTime ?? "–"}${program.endTime ? ` – ${program.endTime}` : ""}`
                          : "Nincs időpont"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {program.participants.length > 0 ? (
                        <MonogramGroup
                          names={program.participants.map((p) => p.familyMember.name)}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">–</span>
                      )}
                    </div>
                    <div className="flex min-w-0 justify-end">
                      <CostSummary
                        costs={program.costs}
                        participantCount={program.participants.length || 1}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
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
          <>
            <ul className="divide-y rounded-xl border md:hidden">
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

            <div className="hidden overflow-hidden rounded-xl border md:block">
              <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.8fr)] gap-3 border-b bg-muted/25 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Szállás</span>
                <span>Tartózkodás</span>
                <span>Résztvevők</span>
                <span className="text-right">Költség</span>
              </div>
              <ul className="divide-y">
                {nextAccommodations.map((stay) => {
                  const nights = nightCount(stay.checkIn, stay.checkOut);
                  return (
                    <li
                      key={stay.id}
                      className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.8fr)] items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{stay.title}</p>
                        {stay.location ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {stay.location}
                          </p>
                        ) : null}
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="font-medium tabular-nums">
                          {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
                        </p>
                        <p className="text-muted-foreground">
                          {nights} éjszaka
                          {stay.participants.length > 0
                            ? ` · ${stay.participants.length} fő`
                            : ""}
                        </p>
                      </div>
                      <div className="min-w-0">
                        {stay.participants.length > 0 ? (
                          <MonogramGroup
                            names={stay.participants.map((p) => p.familyMember.name)}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">–</span>
                        )}
                      </div>
                      <div className="flex min-w-0 justify-end">
                        <CostSummary
                          costs={stay.costs}
                          participantCount={stay.participants.length || 1}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
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
