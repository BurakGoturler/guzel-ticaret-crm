import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import { saleOptions } from "@/components/sales/sale-options";
import { SalesTable } from "@/components/sales/sales-table";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { halisSummary, monthOf } from "@/lib/domain/calc";
import { defaultDateFor, fmtKg, fmtNum, fmtTL, fmtTL2, monthLabel } from "@/lib/format";
import { resolveMonth } from "@/lib/month";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function HalisPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const { today, months, month } = resolveMonth(ds, (await searchParams).ay);
  const h = halisSummary(ds, month);
  const expense = ds.expenses.filter((e) => e.month === month && /halis/i.test(e.label)).reduce((a, e) => a + e.amount, 0);
  const rows = ds.deliveries.filter((d) => d.seller === "halis" && monthOf(d.date) === month).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        title="Halis"
        subtitle="Sözleşme malından kendi fiyatıyla yaptığı satışlar · kg sözleşme kalanından düşer, firma faturasına girmez"
        action={<MonthPicker months={months} current={month} basePath="/halis" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Satış tutarı" value={fmtTL(h.revenue)} hint="Halis'in kendi fiyatıyla" />
        <Kpi label="Satılan" value={fmtKg(h.kg)} hint={`${rows.length} satış`} />
        <Kpi label="Kâr" value={fmtTL(h.profit)} tone={h.profit < 0 ? "negative" : "default"} hint="Satış − alış maliyeti" />
        <Kpi
          label="Sözleşme fiyatına göre fark"
          value={fmtTL(h.priceDiff)}
          tone={h.priceDiff < 0 ? "negative" : "default"}
          hint={h.priceDiff >= 0 ? "Kuruma satılsaydı bu kadar az gelirdi" : "Kuruma satılsaydı bu kadar fazla gelirdi"}
        />
        <Kpi label="Halis masrafı" value={fmtTL(expense)} hint={<Link href={`/masraflar?ay=${month}`} className="underline">Masraflar&apos;da</Link>} />
      </div>

      <Card className="mt-6 border-halis/30">
        <CardHeader title="Halis satışı gir" subtitle="Fiyatı Halis belirler; boş bırakılamaz" />
        <div className="px-5 pt-3 pb-4">
          <SaleForm options={saleOptions(ds)} defaultDate={defaultDateFor(month, today)} defaultSeller="halis" />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Ürüne göre" subtitle={monthLabel(month)} />
          {h.lines.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">Bu ay Halis satışı yok.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
                    <th className="px-5 py-2 font-medium">Ürün</th>
                    <th className="px-3 py-2 text-right font-medium">kg</th>
                    <th className="px-3 py-2 text-right font-medium">Ort. ₺/kg</th>
                    <th className="px-3 py-2 text-right font-medium">Alış ₺/kg</th>
                    <th className="px-5 py-2 text-right font-medium">Kâr</th>
                  </tr>
                </thead>
                <tbody>
                  {h.lines.map((l) => (
                    <tr key={l.productId} className="border-b border-hairline/70">
                      <td className="px-5 py-2 font-medium text-ink"><Link href={`/urunler/${l.productId}?ay=${month}`} className="hover:underline">{l.productName}</Link></td>
                      <td className="num px-3 py-2 text-right">{fmtNum(l.kg)}</td>
                      <td className="num px-3 py-2 text-right">{fmtTL2(l.avgPrice)}</td>
                      <td className="num px-3 py-2 text-right">{l.purchasePrice === null ? <span className="text-warning">girilmedi</span> : fmtTL2(l.purchasePrice)}</td>
                      <td className={cn("num px-5 py-2 text-right font-medium", l.profit < 0 ? "text-danger" : "text-ink")}>{fmtTL(l.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Satışlar" subtitle={monthLabel(month)} />
          <div className="mt-3">
            <SalesTable ds={ds} rows={rows} empty="Bu ay Halis satışı yok." />
          </div>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted">
        Excel&apos;deki &quot;halis aldıgı&quot; sayfası (kışlık patates 164.360 kg × 48,40 ₺, kuru soğan 59.247 kg × 46,50 ₺) kış sözleşmesiyle aynı miktarları taşıyor;
        o sayfanın anlamı netleşince buraya aktarılacak.
      </p>
    </>
  );
}
