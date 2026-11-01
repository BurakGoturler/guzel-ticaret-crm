import { ArrowRightLeft, CircleAlert } from "lucide-react";
import { BarsChart, ChartCard } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { FIRM_META, FirmBadge } from "@/components/ui/firm";
import { Kpi } from "@/components/ui/kpi";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { dailyByFirm, firmOf, monthSummary, monthsWithData, productLines, seasonOfMonth } from "@/lib/domain/calc";
import type { FirmId } from "@/lib/domain/types";
import { dayLabel, fmtKg, fmtNum, fmtPct, fmtTL, fmtTL2, monthLabel } from "@/lib/format";

// Ay / dönem seçimi URL parametresinden gelir; sayfa isteğe göre üretilir.
export const instant = false;

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = getDataset();
  const months = monthsWithData(ds);
  const { ay } = await searchParams;
  const month = ay && months.includes(ay) ? ay : months[months.length - 1]!;
  const idx = months.indexOf(month);
  const prev = idx > 0 ? months[idx - 1]! : null;

  const s = monthSummary(ds, month);
  const ps = prev ? monthSummary(ds, prev) : null;
  const season = seasonOfMonth(ds, month);
  const daily = dailyByFirm(ds, month);
  const allLines = productLines(ds, month); // atanmamış ürünler dahil

  // Önceki aya göre firma değiştiren ürünler
  const swaps = prev
    ? allLines
        .map((l) => ({ l, before: firmOf(ds, prev, l.productId) }))
        .filter(({ l, before }) => before && l.firmId && before !== l.firmId)
    : [];

  const delta = (cur: number, old: number | undefined) =>
    old ? <span className={cur >= old ? "text-success" : "text-danger"}>{cur >= old ? "▲" : "▼"} {fmtPct(Math.abs(cur - old) / old)} <span className="text-muted">önceki aya göre</span></span> : undefined;

  return (
    <>
      <PageHeader
        title="Panel"
        subtitle={<>{monthLabel(month)} · {season?.name ?? "Dönem dışı"} · iki firma birlikte</>}
        action={<MonthPicker months={months} current={month} />}
      />

      {/* Birleşik özet */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Satış cirosu" value={fmtTL(s.revenue)} hint={delta(s.revenue, ps?.revenue)} />
        <Kpi label="Alış maliyeti" value={fmtTL(s.cost)} hint={`Satışın ${fmtPct(s.revenue ? s.cost / s.revenue : 0)}`} />
        <Kpi label="Brüt kâr" value={fmtTL(s.grossProfit)} hint={delta(s.grossProfit, ps?.grossProfit)} />
        <Kpi label="Kesinti & masraf" value={fmtTL(s.deductions)} hint="Stopaj, vergi, fire, masraf" />
        <Kpi label="Net kâr" value={fmtTL(s.netProfit)} tone={s.netProfit < 0 ? "negative" : "default"} hint={`Net marj ${fmtPct(s.netMargin)}`} />
        <Kpi label="Teslim edilen" value={fmtKg(s.kg)} hint={`${daily.length} sevkiyat günü`} />
      </div>

      {/* İki firma yan yana */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {s.firms.map((f) => (
          <FirmPanel key={f.firmId} firmId={f.firmId} totals={f} share={s.revenue ? f.revenue / s.revenue : 0} />
        ))}
      </div>

      {(swaps.length > 0 || s.unassignedRevenue > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {swaps.length > 0 && prev && (
            <div className="flex items-start gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 text-[13px] text-body">
              <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <span>
                {monthLabel(prev)} → {monthLabel(month)} firma değişimi:{" "}
                {swaps.map(({ l, before }, i) => (
                  <span key={l.productId}>
                    {i > 0 && ", "}
                    <b className="font-medium text-ink">{l.productName}</b> {FIRM_META[before as FirmId].short} → {FIRM_META[l.firmId as FirmId].short}
                  </span>
                ))}
              </span>
            </div>
          )}
          {s.unassignedRevenue > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-body">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              Bu ay {fmtTL(s.unassignedRevenue)} tutarında satış hiçbir firmaya atanmamış ürünlerden geliyor.
            </div>
          )}
        </div>
      )}

      {/* Ürün durumu */}
      <Card className="mt-6">
        <CardHeader
          title="Ürün durumu"
          subtitle="Sözleşme kalanı bir önceki aydan devreder — Excel'deki B8 satırının doğru hâli"
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead>
              <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
                <th className="px-5 py-2 font-medium">Ürün</th>
                <th className="px-3 py-2 font-medium">Firma</th>
                <th className="px-3 py-2 text-right font-medium">Devreden kalan</th>
                <th className="px-3 py-2 text-right font-medium">Bu ay teslim</th>
                <th className="px-3 py-2 text-right font-medium">Ay sonu kalan</th>
                <th className="w-40 px-3 py-2 font-medium">Gerçekleşme</th>
                <th className="px-3 py-2 text-right font-medium">Satış ₺/kg</th>
                <th className="px-3 py-2 text-right font-medium">Alış ₺/kg</th>
                <th className="px-3 py-2 text-right font-medium">Ciro</th>
                <th className="px-5 py-2 text-right font-medium">Brüt kâr</th>
              </tr>
            </thead>
            <tbody>
              {allLines.map((l, i) => {
                const ratio = l.contractKg ? l.deliveredToDate / l.contractKg : 0;
                return (
                  <tr key={l.contractId} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60")}>
                    <td className="px-5 py-2.5 font-medium text-ink">
                      {l.productName}
                      {l.contractId.startsWith("onceki") && <span className="ml-1.5 text-xs font-normal text-muted">(önceki sözleşme)</span>}
                    </td>
                    <td className="px-3 py-2.5"><FirmBadge firm={l.firmId} /></td>
                    <td className="num px-3 py-2.5 text-right">{fmtNum(l.openingRemaining)}</td>
                    <td className="num px-3 py-2.5 text-right font-medium text-ink">{fmtNum(l.kg)}</td>
                    <td className="num px-3 py-2.5 text-right">{fmtNum(l.remaining)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Progress ratio={ratio} colorClass={l.firmId ? FIRM_META[l.firmId].dot : undefined} />
                        <span className="num w-11 text-right text-xs text-muted">{fmtPct(ratio)}</span>
                      </div>
                    </td>
                    <td className="num px-3 py-2.5 text-right">{fmtTL2(l.salePrice)}</td>
                    <td className="num px-3 py-2.5 text-right">
                      {l.purchasePrice === null ? <span className="text-warning">girilmedi</span> : fmtTL2(l.purchasePrice)}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-ink">{fmtTL(l.revenue)}</td>
                    <td className={cn("num px-5 py-2.5 text-right font-medium", l.profit < 0 ? "text-danger" : "text-ink")}>{fmtTL(l.profit)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-[13px] font-semibold text-ink">
                <td className="px-5 py-3" colSpan={3}>Toplam</td>
                <td className="num px-3 py-3 text-right">{fmtNum(s.kg)}</td>
                <td colSpan={4} />
                <td className="num px-3 py-3 text-right">{fmtTL(s.revenue)}</td>
                <td className="num px-5 py-3 text-right">{fmtTL(s.grossProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Günlük sevkiyat"
          subtitle={`${monthLabel(month)} · firmaya göre kg`}
          series={[
            { key: "ecrin", label: FIRM_META.ecrin.name, color: FIRM_META.ecrin.color },
            { key: "guzel", label: FIRM_META.guzel.name, color: FIRM_META.guzel.color },
          ]}
          table={{
            columns: ["Tarih", "Ecrin (kg)", "Güzel (kg)", "Toplam"],
            rows: daily.map((d) => [dayLabel(d.date), fmtNum(d.ecrin), fmtNum(d.guzel), fmtNum(d.ecrin + d.guzel + d.diger)]),
          }}
        >
          <BarsChart
            data={daily}
            xKey="date"
            axis="day"
            format="kg"
            stacked
            series={[
              { key: "ecrin", label: "Ecrin", color: FIRM_META.ecrin.color },
              { key: "guzel", label: "Güzel", color: FIRM_META.guzel.color },
            ]}
          />
        </ChartCard>

        {/* Kâr köprüsü — Excel'deki "KAR → STOPAJ → HALİS → … → kalan kar" sütunu */}
        <Card>
          <CardHeader title="Kârdan net kâra" subtitle="Excel'deki kesinti sütununun hesaplanmış hâli" />
          <ul className="mt-3 px-5 pb-4 text-[13px]">
            <BridgeRow label="Brüt kâr" value={s.grossProfit} strong />
            <BridgeRow label={`Fire / kasa-dara (${fmtKg(s.fireKg)})`} value={-s.fireLoss} />
            <BridgeRow label={`Stopaj (%${(ds.settings.stopajRate * 100).toLocaleString("tr-TR")})`} value={-s.stopaj} />
            <BridgeRow label={`Peşin kesilen vergi (%${ds.settings.advanceTaxRate * 100})`} value={-s.advanceTax} />
            {s.expenses.map((e) => <BridgeRow key={e.label} label={e.label} value={-e.amount} />)}
            <BridgeRow label="Net kâr" value={s.netProfit} strong total />
          </ul>
          <p className="border-t border-hairline px-5 py-3 text-xs text-muted">
            KDV (%{ds.settings.kdvRate * 100}) faturaya eklenir, kârdan düşülmez: {fmtTL(s.kdv)}. Oranlar Ayarlar&apos;dan değiştirilebilecek.
          </p>
        </Card>
      </div>
    </>
  );
}

function BridgeRow({ label, value, strong, total }: { label: string; value: number; strong?: boolean; total?: boolean }) {
  return (
    <li className={cn("flex items-center justify-between gap-3 py-1.5", total && "mt-1 border-t border-hairline pt-2.5", strong ? "font-semibold text-ink" : "text-body")}>
      <span>{label}</span>
      <span className={cn("num", value < 0 && !strong && "text-muted", total && value < 0 && "text-danger")}>{fmtTL(value)}</span>
    </li>
  );
}

function FirmPanel({ firmId, totals, share }: {
  firmId: FirmId;
  totals: ReturnType<typeof monthSummary>["firms"][number];
  share: number;
}) {
  const m = FIRM_META[firmId];
  const margin = totals.revenue ? totals.profit / totals.revenue : 0;
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5", m.soft)}>
        <div className="flex items-center gap-2.5">
          <span className={cn("size-3 rounded-full", m.dot)} aria-hidden />
          <h2 className="text-[15px] font-semibold text-ink">{m.name}</h2>
        </div>
        <span className="num text-[13px] text-body">Cironun {fmtPct(share)}&apos;i</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4">
        <Stat label="Ciro" value={fmtTL(totals.revenue)} />
        <Stat label="Brüt kâr" value={fmtTL(totals.profit)} sub={`Marj ${fmtPct(margin)}`} />
        <Stat label="Teslim" value={fmtKg(totals.kg)} />
        <Stat label="Fatura (KDV dahil)" value={fmtTL(totals.invoiceTotal)} sub={`KDV ${fmtTL(totals.kdv)}`} />
      </dl>
      <div className="border-t border-hairline">
        {totals.products.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted">Bu ay bu firmaya atanmış ürün yok.</p>
        ) : (
          <ul>
            {totals.products.map((p) => (
              <li key={p.contractId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-hairline/60 px-5 py-2 text-[13px] last:border-0">
                <span className="truncate font-medium text-ink">{p.productName}</span>
                <span className="num text-right text-muted">{fmtKg(p.kg)} × {fmtTL2(p.salePrice)}</span>
                <span className="num w-28 text-right text-ink">{fmtTL(p.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-0.5 truncate text-[17px] font-semibold text-ink">{value}</dd>
      {sub && <dd className="num text-xs text-muted">{sub}</dd>}
    </div>
  );
}
