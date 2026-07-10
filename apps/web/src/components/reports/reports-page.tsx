"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
import type { ReportsData } from "@/lib/queries/reports";
import { pickDefaultTripId } from "@/lib/reports-utils";
import { cn } from "@/lib/utils";

const COLORS = ["#3b5bdb", "#51cf66", "#fcc419", "#ff6b6b", "#845ef7"];

type DetailTab = "person" | "day" | "program" | "settlement";

const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "person", label: "Fejenként" },
  { id: "day", label: "Naponként" },
  { id: "program", label: "Programonként" },
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

function ChartSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-3 sm:p-5">{children}</div>
    </section>
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
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <ChartSection title="Költségek kategóriánként" description="Megoszlás százalékban">
            <div className="space-y-4">
              <div className="md:hidden space-y-2">
                {categoryData.map((item, index) => {
                  const pct =
                    totalHuf > 0 ? Math.round((item.amount / totalHuf) * 100) : 0;
                  return (
                    <div key={item.label} className="rounded-xl border px-3 py-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="shrink-0 font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs text-muted-foreground">{huf(item.amount)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartSection>

          <ChartSection title="Kategóriák összehasonlítása">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData} margin={{ left: -12, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
                <Bar dataKey="amount" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>
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
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={personChartData} margin={{ left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
                      <Bar dataKey="összeg" fill="#51cf66" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                {dayChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dayChartData} margin={{ left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
                      <Bar dataKey="összeg" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
                {selectedTrip.programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nincs programhoz kötött költség.</p>
                ) : (
                  selectedTrip.programs.map((program) => (
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
                  ))
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
