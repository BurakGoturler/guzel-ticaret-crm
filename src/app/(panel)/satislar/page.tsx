import { Card, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/forms/button-class";
import { Select } from "@/components/forms/form";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import { saleOptions } from "@/components/sales/sale-options";
import { SalesTable } from "@/components/sales/sales-table";
import { getDataset } from "@/lib/data/repo";
import { firmOf, monthOf } from "@/lib/domain/calc";
import { defaultDateFor, monthLabel } from "@/lib/format";
import { resolveMonth } from "@/lib/month";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ ay?: string; urun?: string; satan?: string }> }) {
  const ds = await getDataset();
  const sp = await searchParams;
  const { today, months, month } = resolveMonth(ds, sp.ay);
  const urun = sp.urun ?? "";
  const satan = sp.satan ?? "";

  const inMonth = ds.deliveries.filter((d) => monthOf(d.date) === month);
  const rows = inMonth
    .filter((d) => !urun || d.productId === urun)
    .filter((d) => {
      if (!satan) return true;
      if (satan === "halis") return d.seller === "halis";
      return d.seller !== "halis" && firmOf(ds, month, d.productId) === satan;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.productId.localeCompare(b.productId));
  const productsInMonth = [...new Set(inMonth.map((d) => d.productId))]
    .map((id) => ({ id, name: ds.products.find((p) => p.id === id)?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const extra = `${urun ? `&urun=${urun}` : ""}${satan ? `&satan=${satan}` : ""}`;

  return (
    <>
      <PageHeader
        title="Satışlar"
        subtitle="Excel'de ay sayfasına yazılan her kg burada bir satır · kuruma teslim ve Halis satışları birlikte"
        action={<MonthPicker months={months} current={month} basePath="/satislar" extra={extra} />}
      />

      <Card>
        <CardHeader title="Yeni satış" subtitle="Firma, ürünün o ayki atamasından otomatik gelir" />
        <div className="px-5 pt-3 pb-4">
          <SaleForm options={saleOptions(ds)} defaultDate={defaultDateFor(month, today)} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title={`${monthLabel(month)} satışları`}
          subtitle="Kalem simgesiyle düzenleyin, çöp kutusuyla silin"
          action={
            <form method="get" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="ay" value={month} />
              <Select name="urun" defaultValue={urun} className="h-8 w-44 text-[13px]" aria-label="Ürün filtresi">
                <option value="">Tüm ürünler</option>
                {productsInMonth.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select name="satan" defaultValue={satan} className="h-8 w-40 text-[13px]" aria-label="Satan filtresi">
                <option value="">Tüm satanlar</option>
                <option value="ecrin">Ecrin</option>
                <option value="guzel">Güzel</option>
                <option value="halis">Halis</option>
              </Select>
              <button type="submit" className={buttonClass("secondary", "sm")}>Filtrele</button>
            </form>
          }
        />
        <div className="mt-3">
          <SalesTable ds={ds} rows={rows} empty={inMonth.length ? "Filtreye uyan satış yok." : "Bu ay henüz satış girilmedi."} />
        </div>
      </Card>
    </>
  );
}
