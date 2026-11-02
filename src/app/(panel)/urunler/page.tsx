import Link from "next/link";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { FirmBadge } from "@/components/ui/firm";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { saveProduct } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { contractProgress, firmOf, monthOf, seasonOfMonth } from "@/lib/domain/calc";
import { fmtNum, fmtTL, fmtTL2, todayISO } from "@/lib/format";
import { ToggleActive } from "./toggle-active";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function ProductsPage() {
  const ds = await getDataset();
  const month = monthOf(todayISO());
  const season = seasonOfMonth(ds, month);
  const progress = contractProgress(ds);
  const products = [...ds.products].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "tr"));

  return (
    <>
      <PageHeader title="Ürünler" subtitle="Sistemin merkezi ürün: satış, sözleşme, alış fiyatı ve firma hep ürün üzerinden · ürüne tıklayınca tüm geçmişi açılır" />

      <Card className="mb-6 border-brand/25">
        <CardHeader title="Yeni ürün" subtitle="Satış girebilmek için ardından Sözleşmeler'den kg ve fiyat ekleyin" />
        <ActionForm action={saveProduct} className="grid grid-cols-1 items-end gap-3 px-5 pt-3 pb-4 sm:grid-cols-[minmax(12rem,1fr)_10rem_auto]">
          <Field label="Ürün adı"><Input name="name" placeholder="ör. Mandalina" required data-autofocus /></Field>
          <Field label="Tür">
            <Select name="category" defaultValue="sebze">
              <option value="sebze">Sebze</option>
              <option value="meyve">Meyve</option>
            </Select>
          </Field>
          <div><SubmitButton>Ekle</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-surface-alt text-left text-xs text-muted">
                <th className="px-5 py-2.5 font-medium">Ürün</th>
                <th className="px-3 py-2.5 font-medium">Tür</th>
                <th className="px-3 py-2.5 font-medium">Bu ay satan</th>
                <th className="px-3 py-2.5 text-right font-medium">{season ? "Dönem sözleşmesi" : "Sözleşme"}</th>
                <th className="w-48 px-3 py-2.5 font-medium">Kalan</th>
                <th className="px-3 py-2.5 text-right font-medium">Toplam satış</th>
                <th className="px-5 py-2.5 text-right font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const all = progress.filter((c) => c.productId === p.id);
                const cur = all.find((c) => c.seasonId === season?.id && !c.contractId.startsWith("onceki"));
                const revenue = all.reduce((a, c) => a + c.revenue, 0);
                return (
                  <tr key={p.id} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60", !p.active && "opacity-60")}>
                    <td className="px-5 py-2.5"><Link href={`/urunler/${p.id}`} className="font-medium text-ink hover:underline">{p.name}</Link></td>
                    <td className="px-3 py-2.5 text-muted">{p.category === "meyve" ? "Meyve" : "Sebze"}</td>
                    <td className="px-3 py-2.5">{cur || firmOf(ds, month, p.id) ? <FirmBadge firm={firmOf(ds, month, p.id)} /> : <span className="text-faint">—</span>}</td>
                    <td className="num px-3 py-2.5 text-right">{cur ? <>{fmtNum(cur.contractKg)} kg × {fmtTL2(cur.salePrice)}</> : <span className="text-faint">yok</span>}</td>
                    <td className="px-3 py-2.5">
                      {cur ? (
                        <div className="flex items-center gap-2">
                          <Progress ratio={cur.ratio} colorClass="bg-brand" />
                          <span className="num w-20 shrink-0 text-right text-xs">{fmtNum(cur.remaining)} kg</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="num px-3 py-2.5 text-right">{revenue ? fmtTL(revenue) : <span className="text-faint">—</span>}</td>
                    <td className="px-5 py-2 text-right"><ToggleActive id={p.id} active={p.active} /></td>
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
