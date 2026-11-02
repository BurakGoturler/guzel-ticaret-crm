import { MapPin } from "lucide-react";
import Link from "next/link";
import { CustomerForm } from "@/components/customers/customer-form";
import { CUSTOMER_KIND } from "@/components/customers/kinds";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { customerStats } from "@/lib/domain/calc";
import { dateLabel, fmtNum, fmtTL } from "@/lib/format";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function CustomersPage() {
  const ds = await getDataset();
  const stats = customerStats(ds);
  const list = [...ds.customers].sort((a, b) => (stats.get(b.id)?.revenue ?? 0) - (stats.get(a.id)?.revenue ?? 0));
  const noIl = list.filter((c) => !c.il).length;

  return (
    <>
      <PageHeader title="Müşteriler" subtitle="Sözleşmeli kurum ve Halis'in alıcıları · il girilen müşteri haritada görünür" />

      {noIl > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-body">
          <MapPin className="size-4 shrink-0 text-warning" aria-hidden />
          {noIl} müşterinin ili girilmemiş; haritada görünmesi için müşteriye tıklayıp il seçin.
        </div>
      )}

      <Card className="mb-6 border-brand/25">
        <CardHeader title="Yeni müşteri" subtitle="Halis'in sattığı esnaf veya kişi; satış girerken listeden seçilir" />
        <div className="px-5 pt-3 pb-4"><CustomerForm /></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-surface-alt text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Müşteri</th>
                <th className="px-3 py-2.5 font-medium">Tür</th>
                <th className="px-3 py-2.5 font-medium">Konum</th>
                <th className="px-3 py-2.5 text-right font-medium">Satış</th>
                <th className="px-3 py-2.5 text-right font-medium">kg</th>
                <th className="px-3 py-2.5 text-right font-medium">Tutar</th>
                <th className="px-5 py-2.5 text-right font-medium">Son satış</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => {
                const s = stats.get(c.id);
                return (
                  <tr key={c.id} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60")}>
                    <td className="px-5 py-2.5"><Link href={`/musteriler/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link></td>
                    <td className="px-3 py-2.5 text-muted">{CUSTOMER_KIND[c.kind]}</td>
                    <td className="px-3 py-2.5">
                      {c.il ? <Link href={`/harita?il=${encodeURIComponent(c.il)}`} className="hover:underline">{c.il}{c.ilce ? ` / ${c.ilce}` : ""}</Link> : <span className="text-warning">il girilmedi</span>}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{fmtNum(s?.count ?? 0)}</td>
                    <td className="num px-3 py-2.5 text-right">{fmtNum(s?.kg ?? 0)}</td>
                    <td className="num px-3 py-2.5 text-right text-ink">{fmtTL(s?.revenue ?? 0)}</td>
                    <td className="num px-5 py-2.5 text-right text-muted">{s?.lastDate ? dateLabel(s.lastDate) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

    </>
  );
}
