import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { CUSTOMER_KIND } from "@/components/customers/kinds";
import { DeleteButton } from "@/components/forms/form";
import { mapData } from "@/components/map/map-data";
import { TurkeyMap } from "@/components/map/turkey-map";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { SalesTable } from "@/components/sales/sales-table";
import { deleteCustomer } from "@/lib/actions";
import { KURUM_ID, getDataset } from "@/lib/data/repo";
import { customerStats, productName, salePriceOf } from "@/lib/domain/calc";
import { dateLabel, fmtKg, fmtNum, fmtTL } from "@/lib/format";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const ds = await getDataset();
  const { id } = await params;
  const c = ds.customers.find((x) => x.id === id);
  if (!c) notFound();
  const s = customerStats(ds).get(id);
  const rows = ds.deliveries.filter((d) => d.customerId === id).sort((a, b) => b.date.localeCompare(a.date));
  const map = mapData(ds);

  // Ürün bazlı özet — müşteri de ürün üzerinden okunur
  const byProduct = new Map<string, { kg: number; revenue: number }>();
  for (const d of rows) {
    const r = byProduct.get(d.productId) ?? { kg: 0, revenue: 0 };
    r.kg += d.kg;
    r.revenue += d.kg * salePriceOf(ds, d);
    byProduct.set(d.productId, r);
  }
  const products = [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <>
      <Link href="/musteriler" className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Müşteriler
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{c.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {CUSTOMER_KIND[c.kind]} · {c.il ? <Link href={`/harita?il=${encodeURIComponent(c.il)}`} className="underline">{c.il}{c.ilce ? ` / ${c.ilce}` : ""}</Link> : "il girilmedi"}
            {c.phone && <> · <a href={`tel:${c.phone}`} className="underline">{c.phone}</a></>}
          </p>
        </div>
        {id !== KURUM_ID && !rows.length && <DeleteButton action={deleteCustomer.bind(null, id)} label="Müşteriyi sil" />}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Toplam satış" value={fmtTL(s?.revenue ?? 0)} />
        <Kpi label="Toplam kg" value={fmtKg(s?.kg ?? 0)} />
        <Kpi label="Satış sayısı" value={fmtNum(s?.count ?? 0)} />
        <Kpi label="Son satış" value={s?.lastDate ? dateLabel(s.lastDate) : "—"} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Bilgiler" subtitle={c.note ?? undefined} />
          <div className="px-5 pt-3 pb-4"><CustomerForm customer={c} /></div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Konum" subtitle={c.il ? `${c.il} haritada vurgulu` : "İl seçilince haritada görünür"} />
          <div className="mt-2">
            <TurkeyMap values={map.values} tips={map.tips} selected={c.il} hrefBase="/harita?il=" compact />
          </div>
        </Card>
      </div>

      {products.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Ürüne göre" />
          <ul className="mt-3 border-t border-hairline">
            {products.map(([pid, r]) => (
              <li key={pid} className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-hairline/70 px-5 py-2 text-[13px] last:border-0">
                <Link href={`/urunler/${pid}`} className="font-medium text-ink hover:underline">{productName(ds, pid)}</Link>
                <span className="num text-muted">{fmtKg(r.kg)}</span>
                <span className="num w-32 text-right text-ink">{fmtTL(r.revenue)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Satışlar" subtitle={id === KURUM_ID ? "Kuruma yapılan tüm teslimler" : undefined} />
        <div className="mt-3">
          <SalesTable ds={ds} rows={id === KURUM_ID ? rows.slice(0, 100) : rows} hideCustomer empty="Bu müşteriye satış girilmedi." />
          {id === KURUM_ID && rows.length > 100 && <p className="px-5 py-3 text-xs text-muted">Son 100 teslim gösteriliyor · tamamı için <Link href="/satislar" className="underline">Satışlar</Link>.</p>}
        </div>
      </Card>
    </>
  );
}
