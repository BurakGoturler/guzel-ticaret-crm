"use client";

import { useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartColumn, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { dayLabel, fmtCompact, fmtKg, fmtNum, fmtPct, fmtTL, monthShort } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Biçimler — sunucudan istemciye fonksiyon geçemediği için ad ile seçilir */
export type ValueFormat = "tl" | "kg" | "pct" | "num";
export type AxisFormat = "month" | "day" | "text";

const fmtValue = (f: ValueFormat, v: number) =>
  f === "tl" ? fmtTL(v) : f === "kg" ? fmtKg(v) : f === "pct" ? fmtPct(v) : fmtNum(v);
const fmtAxisValue = (f: ValueFormat, v: number) => (f === "pct" ? fmtPct(v) : fmtCompact(v));
const fmtAxis = (f: AxisFormat, v: string) => (f === "month" ? monthShort(v) : f === "day" ? dayLabel(v) : v);

export interface Series {
  key: string;
  label: string;
  color: string;
}

type Row = Record<string, string | number | null>;

const AXIS = { fontSize: 12, fill: "var(--muted-ink)" } as const;

/* ------------------------------------------------------------------ */
/* Lejant — ≥2 seride her zaman; renk tek başına kimlik taşımaz       */
function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-body">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function TooltipBox({ active, payload, label, series, format, axis, total }: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; payload?: Row }[];
  label?: string | number;
  series: Series[];
  format: ValueFormat;
  axis: AxisFormat;
  total?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = series
    .map((s) => ({ s, v: payload.find((p) => p.dataKey === s.key)?.value }))
    .filter((r) => typeof r.v === "number");
  const sum = rows.reduce((a, r) => a + (r.v ?? 0), 0);
  return (
    <div className="min-w-44 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-medium text-ink">{fmtAxis(axis, String(label ?? ""))}</div>
      {rows.map(({ s, v }) => (
        <div key={s.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
          <span className="num font-medium text-ink">{fmtValue(format, v ?? 0)}</span>
        </div>
      ))}
      {total && rows.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-hairline pt-1">
          <span className="text-muted">Toplam</span>
          <span className="num font-semibold text-ink">{fmtValue(format, sum)}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kart: Grafik ⇄ Tablo (kontrast uyarısının karşılığı: tablo görünümü) */
export function ChartCard({ title, subtitle, series = [], table, children, className, height = 280 }: {
  title: string;
  subtitle?: string;
  series?: Series[];
  table: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
  height?: number;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <section className={cn("flex flex-col rounded-xl border border-hairline bg-surface", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 rounded-md border border-hairline p-0.5">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === "chart" ? "Grafik görünümü" : "Tablo görünümü"}
              className={cn("rounded p-1 text-muted", view === v && "bg-surface-alt text-ink")}
            >
              {v === "chart" ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pt-3"><Legend series={series} /></div>
      <div className="flex-1 px-2 pb-3 pt-2">
        {view === "chart" ? (
          <div style={{ height }}>{children}</div>
        ) : (
          <div className="overflow-auto px-3" style={{ maxHeight: height + 20 }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-hairline text-left text-muted">
                  {table.columns.map((c, i) => (
                    <th key={c} className={cn("py-2 pr-3 font-medium", i > 0 && "text-right")}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-hairline/60 last:border-0">
                    {r.map((c, j) => (
                      <td key={j} className={cn("num py-1.5 pr-3", j > 0 ? "text-right" : "text-ink")}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function BarsChart({ data, xKey, series, stacked = false, format = "tl", axis = "month", horizontal = false, total = false }: {
  data: Row[];
  xKey: string;
  series: Series[];
  stacked?: boolean;
  format?: ValueFormat;
  axis?: AxisFormat;
  horizontal?: boolean;
  total?: boolean;
}) {
  const lastIndex = series.length - 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: 4, bottom: 0 }} barGap={2} barCategoryGap={horizontal ? "22%" : "28%"}>
        <CartesianGrid stroke="var(--grid)" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={(v: number) => fmtAxisValue(format, v)} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} width={104} tickFormatter={(v: string) => fmtAxis(axis, v)} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v: string) => fmtAxis(axis, v)} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtAxisValue(format, v)} />
          </>
        )}
        <Tooltip cursor={{ fill: "var(--surface-alt)" }} content={<TooltipBox series={series} format={format} axis={axis} total={total || stacked} />} />
        {series.map((s, i) => {
          const end = !stacked || i === lastIndex;
          const radius: [number, number, number, number] = !end ? [0, 0, 0, 0] : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
          return (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? "s" : undefined} radius={radius}
              maxBarSize={horizontal ? 18 : 30} stroke="var(--surface)" strokeWidth={stacked ? 1 : 0} isAnimationActive={false} />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({ data, xKey, series, format = "tl", axis = "month", area = false }: {
  data: Row[];
  xKey: string;
  series: Series[];
  format?: ValueFormat;
  axis?: AxisFormat;
  area?: boolean;
}) {
  const common = (
    <>
      <CartesianGrid stroke="var(--grid)" vertical={false} />
      <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v: string) => fmtAxis(axis, v)} interval="preserveStartEnd" minTickGap={16} />
      <YAxis tick={AXIS} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtAxisValue(format, v)} />
      <Tooltip cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }} content={<TooltipBox series={series} format={format} axis={axis} total={area} />} />
    </>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          {common}
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="a" stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.18} isAnimationActive={false}
              activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          {common}
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, format = "tl", centerLabel }: {
  data: { key: string; label: string; value: number; color: string }[];
  format?: ValueFormat;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-full min-h-48 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={1.5} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.key} fill={d.color} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              const p = payload?.[0];
              if (!active || !p) return null;
              const v = Number(p.value ?? 0);
              return (
                <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-lg">
                  <div className="font-medium text-ink">{String(p.name)}</div>
                  <div className="num text-muted">{fmtValue(format, v)} · {fmtPct(total ? v / total : 0)}</div>
                </div>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="num text-lg font-semibold text-ink">{fmtCompact(total)}</div>
            {centerLabel && <div className="text-[11px] text-muted">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2 sm:w-1/2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-body">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} aria-hidden />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="num shrink-0 whitespace-nowrap text-right text-ink">
              {fmtValue(format, d.value)} <span className="text-muted">· {fmtPct(total ? d.value / total : 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
