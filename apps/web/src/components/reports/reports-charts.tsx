"use client";

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

const COLORS = ["#3b5bdb", "#51cf66", "#fcc419", "#ff6b6b", "#845ef7"];

function huf(value: number) {
  return `${value.toLocaleString("hu-HU")} Ft`;
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

export function ChartsGrid({
  categoryData,
  totalHuf,
}: {
  categoryData: { label: string; amount: number }[];
  totalHuf: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <ChartSection title="Költségek kategóriánként" description="Megoszlás százalékban">
        <div className="space-y-4">
          <div className="space-y-2 md:hidden">
            {categoryData.map((item, index) => {
              const pct = totalHuf > 0 ? Math.round((item.amount / totalHuf) * 100) : 0;
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
                  label={({ name, percent }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={36}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
            <Bar dataKey="amount" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}

export function ReportsBarChart({
  data,
  height = 220,
  fill = "#3b5bdb",
}: {
  data: { name: string; összeg: number }[];
  height?: number;
  fill?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={36}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        />
        <Tooltip formatter={(value) => huf(Number(value ?? 0))} />
        <Bar dataKey="összeg" fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
