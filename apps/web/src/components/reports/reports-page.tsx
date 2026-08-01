"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Sparkles,
  Users,
  Wallet,
  TrendingUp,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import type { ReportsData } from "@/lib/queries/reports";
import { pickDefaultTripId } from "@/lib/reports-utils";
import { cn } from "@/lib/utils";

const ChartsGrid = dynamic(
  () => import("@/components/reports/reports-charts").then((m) => m.ChartsGrid),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="h-[22rem] animate-pulse rounded-2xl border bg-muted/30" />
        <div className="h-[22rem] animate-pulse rounded-2xl border bg-muted/30" />
      </div>
    ),
  }
);

const ReportsBarChart = dynamic(
  () => import("@/components/reports/reports-charts").then((m) => m.ReportsBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[220px] animate-pulse rounded-xl border bg-muted/30" />,
  }
);

type DetailTab = "person" | "day" | "program" | "settlement";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "person", label: "Fejenként" },
  { id: "day", label: "Naponként" },
  { id: "program", label: "Program / szállás" },
  { id: "settlement", label: "Elszámolás" },
];

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "default" | "primary" | "emerald";
}) {
  const accentClass =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        : "bg-muted text-muted-foreground";

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        </div>
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-3 py-2.5 text-sm sm:px-4">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-semibold">{value}</span>
    </div>
  );
}

export function ReportsPage({ data }: { data: ReportsData }) {
  const { tripBreakdowns } = data;
  const defaultTripId = useMemo(() => pickDefaultTripId(tripBreakdowns), [tripBreakdowns]);
  const [selectedTripId, setSelectedTripId] = useState(defaultTripId);
  const [detailTab, setDetailTab] = useState<DetailTab>("person");

  const selectedTrip =
    tripBreakdowns.find((t) => t.tripId === selectedTripId) ?? tripBreakdowns[0] ?? null;

  const categoryData = selectedTrip?.categoryData ?? [];
  const totalHuf = selectedTrip?.totalHuf ?? 0;
  const totalParticipants = selectedTrip?.perPerson.length ?? 0;
  const perPersonCost = totalParticipants > 0 ? Math.round(totalHuf / totalParticipants) : 0;

  const topCategory = useMemo(() => {
    if (!categoryData.length) return null;
    return [...categoryData].sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [categoryData]);

  const storyText = useMemo(() => {
    if (!selectedTrip) return null;
    const parts: string[] = [];
    parts.push(
      `${selectedTrip.title} eddig ${huf(totalHuf)} költést gyűjtött ${totalParticipants} résztvevővel (${huf(perPersonCost)} / fő).`
    );
    if (topCategory) {
      const pct = totalHuf > 0 ? Math.round((topCategory.amount / totalHuf) * 100) : 0;
      parts.push(`A legnagyobb tétel a ${topCategory.label} kategória (${pct}%).`);
    }
    const settlementCount = selectedTrip.settlement?.transfers.length ?? 0;
    if (settlementCount > 0) {
      parts.push(`Az elszámolásban még ${settlementCount} ajánlott átutalás van.`);
    } else if ((selectedTrip.costCount ?? 0) > 0) {
      parts.push("Az elszámolás jelenleg kiegyenlítettnek tűnik.");
    }
    return parts.join(" ");
  }, [selectedTrip, totalHuf, totalParticipants, perPersonCost, topCategory]);

  const dayChartData = (selectedTrip?.days ?? []).map((d) => ({
    name: d.date.slice(5),
    összeg: d.totalHuf,
  }));

  const personChartData = (selectedTrip?.perPerson ?? []).map((p) => ({
    name: p.name,
    összeg: p.amountHuf,
  }));

  if (tripBreakdowns.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-8">
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-sm sm:p-6">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <BarChart3 className="h-4 w-4" />
              Költségáttekintés
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kimutatások</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Költségstatisztikák fejenként, naponként és programonként — napi ECB árfolyam alapján,
              forintban.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Még nincs kimutatható adat</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Adj hozzá költségeket egy utazáshoz, és itt megjelennek a statisztikák.
          </p>
          <Button asChild className="mt-6 min-h-[var(--touch-target)] sm:min-h-10">
            <Link href="/trips">Utazások megnyitása</Link>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8 sm:space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/8 via-card to-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <BarChart3 className="h-4 w-4" />
              Költségáttekintés
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kimutatások</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Költségstatisztikák fejenként, naponként és programonként — napi ECB árfolyam alapján,
              forintban.
            </p>
          </div>

          <div className="w-full sm:max-w-md">
            <Select value={selectedTrip?.tripId ?? selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="min-h-[var(--touch-target)] bg-background sm:min-h-10">
                <SelectValue placeholder="Válassz utazást" />
              </SelectTrigger>
              <SelectContent>
                {tripBreakdowns.map((t) => (
                  <SelectItem key={t.tripId} value={t.tripId}>
                    {t.title} ({t.startDate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTrip && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <span className="rounded-full bg-background px-3 py-1 text-sm shadow-sm">
                {selectedTrip.title}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {selectedTrip.startDate}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {selectedTrip.costCount} költség
              </span>
            </div>
          )}
        </div>
      </section>

      {storyText ? (
        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-sm font-medium text-primary">Összefoglaló</p>
          <p className="mt-2 text-base leading-relaxed sm:text-lg">{storyText}</p>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Összes költség" value={huf(totalHuf)} icon={Wallet} accent="primary" />
        <StatCard label="Résztvevők" value={String(totalParticipants)} icon={Users} />
        <StatCard
          label="Átlag főre jutó"
          value={huf(perPersonCost)}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      {categoryData.length > 0 && (
        <CollapsiblePanel
          title="Grafikonok"
          subtitle="Kategóriák megoszlása és összehasonlítása"
          defaultOpen={false}
          className="sm:hidden"
        >
          <ChartsGrid categoryData={categoryData} totalHuf={totalHuf} />
        </CollapsiblePanel>
      )}

      {categoryData.length > 0 && (
        <div className="hidden sm:block">
          <ChartsGrid categoryData={categoryData} totalHuf={totalHuf} />
        </div>
      )}

      {selectedTrip && (
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3 sm:px-5 sm:py-4">
            <h3 className="font-semibold">Részletes bontás</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Váltás a nézetek között — mobilon vízszintesen görgethető.
            </p>
          </div>

          <div className="border-b px-3 py-3 sm:px-5">
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DETAIL_TABS.map(({ id, label }) => (
                <Button
                  key={id}
                  size="sm"
                  variant={detailTab === id ? "default" : "outline"}
                  className="shrink-0 min-h-[var(--touch-target)] sm:min-h-9"
                  onClick={() => setDetailTab(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {detailTab === "person" && (
              <div className="space-y-4">
                {personChartData.length > 0 && (
                  <ReportsBarChart data={personChartData} fill="#51cf66" />
                )}
                <div className="space-y-2">
                  {selectedTrip.perPerson.map((p) => (
                    <DetailRow key={p.id} label={p.name} value={huf(p.amountHuf)} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Utazás összesen: <strong className="text-foreground">{huf(selectedTrip.totalHuf)}</strong>
                </p>
              </div>
            )}

            {detailTab === "day" && (
              <div className="space-y-4">
                {dayChartData.length > 0 && <ReportsBarChart data={dayChartData} />}
                {selectedTrip.days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nincs költség adat.</p>
                ) : (
                  selectedTrip.days.map((day) => (
                    <article key={day.date} className="overflow-hidden rounded-2xl border">
                      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2.5 sm:px-4">
                        <span className="flex items-center gap-2 font-medium">
                          <CalendarRange className="h-4 w-4 text-muted-foreground" />
                          {day.date}
                        </span>
                        <span className="font-semibold">{huf(day.totalHuf)}</span>
                      </div>
                      <div className="space-y-1.5 p-3 sm:p-4">
                        {day.perPerson
                          .filter((p) => p.amountHuf > 0)
                          .map((p) => (
                            <DetailRow key={p.id} label={p.name} value={huf(p.amountHuf)} />
                          ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}

            {detailTab === "program" && (
              <div className="space-y-3">
                {selectedTrip.programs.length === 0 &&
                (selectedTrip.accommodations ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nincs programhoz vagy szálláshoz kötött költség.
                  </p>
                ) : (
                  <>
                    {selectedTrip.programs.map((program) => (
                      <article key={program.id} className="overflow-hidden rounded-2xl border">
                        <div className="flex flex-col gap-1 border-b bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                          <span className="font-medium">
                            {program.title}
                            <span className="mt-0.5 block text-sm font-normal text-muted-foreground sm:mt-0 sm:inline sm:before:content-['_·_']">
                              {program.date}
                            </span>
                          </span>
                          <span className="font-semibold">{huf(program.totalHuf)}</span>
                        </div>
                        <div className="space-y-1.5 p-3 sm:p-4">
                          {program.perPerson
                            .filter((p) => p.amountHuf > 0)
                            .map((p) => (
                              <DetailRow key={p.id} label={p.name} value={huf(p.amountHuf)} />
                            ))}
                        </div>
                      </article>
                    ))}
                    {(selectedTrip.accommodations ?? []).map((accommodation) => (
                      <article key={accommodation.id} className="overflow-hidden rounded-2xl border">
                        <div className="flex flex-col gap-1 border-b bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                          <span className="font-medium">
                            🏨 {accommodation.title}
                            <span className="mt-0.5 block text-sm font-normal text-muted-foreground sm:mt-0 sm:inline sm:before:content-['_·_']">
                              {accommodation.checkIn} – {accommodation.checkOut}
                            </span>
                          </span>
                          <span className="font-semibold">{huf(accommodation.totalHuf)}</span>
                        </div>
                        <div className="space-y-1.5 p-3 sm:p-4">
                          {accommodation.perPerson
                            .filter((p) => p.amountHuf > 0)
                            .map((p) => (
                              <DetailRow key={p.id} label={p.name} value={huf(p.amountHuf)} />
                            ))}
                        </div>
                      </article>
                    ))}
                  </>
                )}
              </div>
            )}

            {detailTab === "settlement" && selectedTrip.settlement && (
              <div className="space-y-4">
                <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                  {selectedTrip.settlement.settledCostCount} / {selectedTrip.settlement.totalCostCount}{" "}
                  költségnél van megadva fizető.
                </p>

                {selectedTrip.settlement.transfers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTrip.settlement.transfers.map((transfer, index) => (
                      <div
                        key={`${transfer.fromId}-${transfer.toId}-${index}`}
                        className="flex flex-col gap-2 rounded-xl border px-3 py-3 text-sm sm:flex-row sm:items-center sm:px-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{transfer.fromName}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{transfer.toName}</span>
                        </div>
                        <span className="font-semibold sm:ml-auto">{huf(transfer.amountHuf)}</span>
                      </div>
                    ))}
                  </div>
                ) : selectedTrip.settlement.settledCostCount > 0 ? (
                  <p className="text-sm text-muted-foreground">Nincs tartozás — minden kiegyenlített.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add meg a fizetőt a költségeknél az elszámolás megjelenítéséhez.
                  </p>
                )}

                <div className="space-y-2">
                  {selectedTrip.settlement.balances.map((balance) => (
                    <DetailRow key={balance.id} label={balance.name} value={huf(balance.balanceHuf)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
