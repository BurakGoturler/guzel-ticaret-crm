import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, AutoSaveSelect, Field, Input, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { FIRM_META, FirmBadge } from "@/components/ui/firm";
import { Kpi } from "@/components/ui/kpi";
import { MonthPicker } from "@/components/ui/month-picker";
import { Progress } from "@/components/ui/progress";
import { SaleForm } from "@/components/sales/sale-form";
import { saleOptions } from "@/components/sales/sale-options";
import { SalesTable } from "@/components/sales/sales-table";
import { saveProduct, setAssignment, setPurchasePrice } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { contractFor, contractProgress, firmOf, lineFor, monthOf, productHistory, purchasePriceOf } from "@/lib/domain/calc";
import { defaultDateFor, fmtKg, fmtNum, fmtPct, fmtTL, fmtTL2, monthLabel } from "@/lib/format";
import { resolveMonth } from "@/lib/month";

const FIRM_OPTIONS = [
  { value: "", label: "Atanmamış" },
  { value: "ecrin", label: FIRM_META.ecrin.name },
  { value: "guzel", label: FIRM_META.guzel.name },
];

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const { id } = await params;
  const product = ds.products.find((p) => p.id === id);
  if (!product) notFound();
  const { today, months, month } = resolveMonth(ds, (await searchParams).ay);

  const date = defaultDateFor(month, today);
  const contract = contractFor(ds, id, date);
  const line = contract ? lineFor(ds, month, contract.id) : null;
  const firm = firmOf(ds, month, id);
  const pp = purchasePriceOf(ds, month, id);
  const history = productHistory(ds, id);
  const contracts = contractProgress(ds).filter((c) => c.productId === id);
  const rows = ds.deliveries.filter((d) => d.productId === id && monthOf(d.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const halisKg = rows.filter((d) => d.seller === "halis").reduce((a, d) => a + d.kg, 0);

  return (
    <>
      <Link href={`/?ay=${month}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> Panel
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-ink">
            {product.name}
            {!product.active && <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-normal text-muted">pasif</span>}
          </h1>
          <p className="mt-1 text-sm text-muted">{product.category === "meyve" ? "Meyve" : "Sebze"} · kg · Excel&apos;deki ürün kolonunun tamamı</p>
        </div>
        <MonthPicker months={months} current={month} basePath={`/urunler/${id}`} />
      </div>

      {/* Bu ay */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={`${monthLabel(month)} satılan`} value={fmtKg(line?.kg ?? 0)} hint={halisKg ? `+ Halis ${fmtKg(halisKg)}` : `${line?.deliveryDays ?? 0} sevkiyat günü`} />
        <Kpi label="Sözleşmeden kalan" value={line ? fmtKg(line.remaining) : "—"} tone={line && line.remaining < 0 ? "negative" : "default"} hint={line?.contractKg ? `${fmtNum(line.contractKg)} kg'ın ${fmtPct(line.deliveredToDate / line.contractKg)}'i çıktı` : "Bu dönemde sözleşme yok"} />
        <Kpi label="Ciro" value={fmtTL(line?.revenue ?? 0)} hint={contract ? `Sözleşme ${fmtTL2(contract.salePrice)}/kg` : undefined} />
        <Kpi label="Brüt kâr" value={fmtTL(line?.profit ?? 0)} hint={pp === null ? "Alış fiyatı girilmedi" : `Alış ${fmtTL2(pp)}/kg`} />
      </div>

      <Card className="mt-4">
        <CardHeader title={`${monthLabel(month)} · satış gir`} subtitle="Excel'de bu ürünün kolonuna kg yazmak gibi" />
        <div className="px-5 pt-3 pb-4">
          {contract ? (
            <SaleForm options={saleOptions(ds)} productId={id} defaultDate={date} />
          ) : (
            <p className="text-[13px] text-muted">
              Bu ürünün {monthLabel(month)} dönemine ait sözleşmesi yok. <Link href="/sozlesmeler" className="font-medium text-ink underline">Sözleşme ekleyin</Link>.
            </p>
          )}
        </div>
        <div className="grid gap-4 border-t border-hairline px-5 py-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Bu ay faturayı kesen firma</div>
            <div className="flex items-center gap-2">
              <AutoSaveSelect ariaLabel="Firma" value={firm ?? ""} options={FIRM_OPTIONS} onSave={setAssignment.bind(null, month, id)} className="h-9 text-[13px]" />
              <FirmBadge firm={firm} />
            </div>
            <p className="mt-1 text-[11px] text-faint">Excel&apos;de ay sayfasının altındaki ECRİN / GÜZEL tabloları</p>
          </div>
          <ActionForm action={setPurchasePrice} resetOnSuccess={false} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="productId" value={id} />
            <Field label="Bu ayın alış fiyatı ₺/kg" hint="Excel'de satır 26 · boş bırakırsanız kaldırılır" className="w-48">
              <NumberInput name="purchasePrice" defaultValue={pp === null ? "" : String(pp).replace(".", ",")} key={`${month}-${pp}`} placeholder="ör. 20" />
            </Field>
            <SubmitButton variant="secondary">Kaydet</SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title={`${monthLabel(month)} satışları`} subtitle={`${rows.length} kayıt`} />
        <div className="mt-3">
          <SalesTable ds={ds} rows={rows} hideProduct empty="Bu ay bu üründen satış yok." />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Ay ay geçmiş" subtitle="Satış, alış, kâr ve satan firma" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
                  <th className="px-5 py-2 font-medium">Ay</th>
                  <th className="px-3 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 text-right font-medium">kg</th>
                  <th className="px-3 py-2 text-right font-medium">Alış ₺/kg</th>
                  <th className="px-3 py-2 text-right font-medium">Ciro</th>
                  <th className="px-3 py-2 text-right font-medium">Fire</th>
                  <th className="px-5 py-2 text-right font-medium">Brüt kâr</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.month} className={cn("border-b border-hairline/70", h.month === month && "bg-brand-soft/60")}>
                    <td className="px-5 py-2"><Link href={`/urunler/${id}?ay=${h.month}`} className="font-medium text-ink hover:underline">{monthLabel(h.month)}</Link></td>
                    <td className="px-3 py-2"><FirmBadge firm={h.firmId} /></td>
                    <td className="num px-3 py-2 text-right">
                      {fmtNum(h.kg)}
                      {h.halisKg > 0 && <div className="text-xs text-muted">Halis {fmtNum(h.halisKg)}</div>}
                    </td>
                    <td className="num px-3 py-2 text-right">{h.purchasePrice === null ? <span className="text-faint">—</span> : fmtTL2(h.purchasePrice)}</td>
                    <td className="num px-3 py-2 text-right">{fmtTL(h.revenue + h.halisRevenue)}</td>
                    <td className="num px-3 py-2 text-right">{h.fire ? fmtTL(h.fire) : <span className="text-faint">—</span>}</td>
                    <td className={cn("num px-5 py-2 text-right font-medium", h.profit < 0 ? "text-danger" : "text-ink")}>{fmtTL(h.profit)}</td>
                  </tr>
                ))}
                {!history.length && <tr><td colSpan={7} className="px-5 py-6 text-muted">Henüz kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Sözleşmeler" action={<Link href="/sozlesmeler" className="text-[13px] text-muted hover:text-ink">Düzenle</Link>} />
            <ul className="mt-3 border-t border-hairline">
              {contracts.map((c) => (
                <li key={c.contractId} className="border-b border-hairline/70 px-5 py-3 text-[13px] last:border-0">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-ink">{ds.seasons.find((s) => s.id === c.seasonId)?.name}</span>
                    <span className="num text-muted">{fmtNum(c.contractKg)} kg × {fmtTL2(c.salePrice)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress ratio={c.ratio} colorClass="bg-brand" />
                    <span className="num w-28 shrink-0 text-right text-xs text-body">kalan {fmtNum(c.remaining)} kg</span>
                  </div>
                </li>
              ))}
              {!contracts.length && <li className="px-5 py-4 text-[13px] text-muted">Sözleşme yok.</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Ürün bilgisi" />
            <ActionForm action={saveProduct} resetOnSuccess={false} className="grid grid-cols-[1fr_8rem] items-end gap-3 px-5 pt-3 pb-4">
              <input type="hidden" name="id" value={product.id} />
              <Field label="Ad"><Input name="name" defaultValue={product.name} required /></Field>
              <Field label="Tür">
                <Select name="category" defaultValue={product.category}>
                  <option value="sebze">Sebze</option>
                  <option value="meyve">Meyve</option>
                </Select>
              </Field>
              <div><SubmitButton variant="secondary">Kaydet</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
