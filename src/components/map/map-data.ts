import { customerStats } from "@/lib/domain/calc";
import type { Customer, Dataset } from "@/lib/domain/types";
import { fmtCompact, fmtNum } from "@/lib/format";
import type { MapTip } from "./turkey-map";

export type MapMetric = "ciro" | "kg" | "musteri";

export interface IlStat {
  il: string;
  revenue: number;
  kg: number;
  customers: (Customer & { revenue: number; kg: number; count: number; lastDate: string | null })[];
}

/** Müşterileri iline göre toplar; harita boyaması ve üzerine gelince görünen özet. */
export function mapData(ds: Dataset, metric: MapMetric = "ciro", from = "") {
  const stats = customerStats(ds, from);
  const byIl = new Map<string, IlStat>();
  let unknown = 0;
  for (const c of ds.customers) {
    const s = stats.get(c.id);
    if (!c.il) { unknown++; continue; }
    const row = byIl.get(c.il) ?? { il: c.il, revenue: 0, kg: 0, customers: [] };
    row.revenue += s?.revenue ?? 0;
    row.kg += s?.kg ?? 0;
    row.customers.push({ ...c, revenue: s?.revenue ?? 0, kg: s?.kg ?? 0, count: s?.count ?? 0, lastDate: s?.lastDate ?? null });
    byIl.set(c.il, row);
  }
  for (const r of byIl.values()) r.customers.sort((a, b) => b.revenue - a.revenue);

  const values: Record<string, number> = {};
  const tips: Record<string, MapTip> = {};
  for (const r of byIl.values()) {
    values[r.il] = metric === "ciro" ? r.revenue : metric === "kg" ? r.kg : r.customers.length;
    tips[r.il] = {
      title: r.il,
      lines: [`${r.customers.length} müşteri · ${fmtCompact(r.revenue)} ₺`, `${fmtNum(r.kg)} kg satış`],
    };
  }
  const ranking = [...byIl.values()].sort((a, b) => (values[b.il] ?? 0) - (values[a.il] ?? 0));
  return { byIl, values, tips, unknown, ranking };
}
