import Link from "next/link";
import { ActionForm, DeleteButton, Field, Input, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { addFire, deleteFire, updateFire } from "@/lib/actions";
import { EditDialog } from "@/components/forms/edit-dialog";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { productName, purchasePriceOf } from "@/lib/domain/calc";
import type { Fire } from "@/lib/domain/types";
import { fmtKg, fmtNum, fmtTL, fmtTL2, monthLabel } from "@/lib/format";
import { resolveMonth } from "@/lib/month";

const REASON: Record<Fire["reason"], string> = {
  fire: "Fire (bozulan / çürüyen)",
  "kasa-dara": "Kasa-dara",
  iade: "Kurumdan geri gelen",
  bozuk: "Kötü mal",
};

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function FirePage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const { months, month } = resolveMonth(ds, (await searchParams).ay);
  const rows = ds.fires.filter((f) => f.month === month);
  const loss = rows.reduce((a, f) => a + f.kg * f.price, 0);
  const kg = rows.reduce((a, f) => a + f.kg, 0);
  const products = ds.products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const byReason = (Object.keys(REASON) as Fire["reason"][]).map((r) => ({ r, v: rows.filter((f) => f.reason === r).reduce((a, f) => a + f.kg * f.price, 0) }));

  return (
    <>
      <PageHeader
        title="Fire & İade"
        subtitle={<>Excel&apos;de satır 30–31 (&quot;100*20 fire&quot; = 100 kg × 20 ₺) · kayıp net kârdan düşülür</>}
        action={<MonthPicker months={months} current={month} basePath="/fire-iade" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Toplam kayıp" value={fmtTL(loss)} hint={monthLabel(month)} />
        <Kpi label="Toplam kg" value={fmtKg(kg)} hint={`${rows.length} kayıt`} />
        {byReason.filter((x) => x.v > 0).slice(0, 2).map((x) => <Kpi key={x.r} label={REASON[x.r]} value={fmtTL(x.v)} />)}
      </div>

      <Card className="mt-6">
        <CardHeader title="Kayıt ekle" subtitle="₺/kg genelde o ayın alış fiyatıdır" />
        <ActionForm action={addFire} keep={["reason"]} className="grid grid-cols-2 items-end gap-3 px-5 pt-3 pb-4 md:grid-cols-[minmax(10rem,1fr)_8rem_8rem_minmax(10rem,14rem)_minmax(8rem,1fr)_auto]">
          <input type="hidden" name="month" value={month} />
          <Field label="Ürün" className="col-span-2 md:col-span-1">
            <Select name="productId" required defaultValue="">
              <option value="">Seçin…</option>
              {products.map((p) => {
                const pp = purchasePriceOf(ds, month, p.id);
                return <option key={p.id} value={p.id}>{p.name}{pp !== null ? ` · alış ${fmtTL2(pp)}` : ""}</option>;
              })}
            </Select>
          </Field>
          <Field label="Kilo"><NumberInput name="kg" placeholder="ör. 100" required data-autofocus /></Field>
          <Field label="₺/kg"><NumberInput name="price" placeholder="ör. 20" required /></Field>
          <Field label="Neden">
            <Select name="reason" defaultValue="fire">
              {(Object.keys(REASON) as Fire["reason"][]).map((r) => <option key={r} value={r}>{REASON[r]}</option>)}
            </Select>
          </Field>
          <Field label="Not"><Input name="note" placeholder="isteğe bağlı" /></Field>
          <div><SubmitButton>Ekle</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card className="mt-6">
        <CardHeader title={`${monthLabel(month)} kayıtları`} />
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">Bu ay fire veya iade girilmedi.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
                  <th className="px-5 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 font-medium">Neden</th>
                  <th className="px-3 py-2 text-right font-medium">kg</th>
                  <th className="px-3 py-2 text-right font-medium">₺/kg</th>
                  <th className="px-3 py-2 text-right font-medium">Kayıp</th>
                  <th className="px-3 py-2 font-medium">Not</th>
                  <th className="px-5 py-2"><span className="sr-only">Sil</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f, i) => (
                  <tr key={f.id} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60")}>
                    <td className="px-5 py-2 font-medium text-ink"><Link href={`/urunler/${f.productId}?ay=${month}`} className="hover:underline">{productName(ds, f.productId)}</Link></td>
                    <td className="px-3 py-2">{REASON[f.reason]}</td>
                    <td className="num px-3 py-2 text-right">{fmtNum(f.kg)}</td>
                    <td className="num px-3 py-2 text-right">{fmtTL2(f.price)}</td>
                    <td className="num px-3 py-2 text-right font-medium text-ink">{fmtTL(f.kg * f.price)}</td>
                    <td className="px-3 py-2 text-xs text-muted">{f.note}</td>
                    <td className="px-5 py-1.5 text-right whitespace-nowrap">
                      <EditDialog title="Fire / iade kaydını düzenle" subtitle={`${productName(ds, f.productId)} · ${monthLabel(f.month)}`}>
                        <ActionForm action={updateFire} resetOnSuccess={false} className="grid grid-cols-2 items-end gap-3">
                          <input type="hidden" name="id" value={f.id} />
                          <Field label="Ay">
                            <Select name="month" defaultValue={f.month}>
                              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                            </Select>
                          </Field>
                          <Field label="Ürün">
                            <Select name="productId" defaultValue={f.productId}>
                              {ds.products.filter((p) => p.active || p.id === f.productId).sort((a, b) => a.name.localeCompare(b.name, "tr")).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                          </Field>
                          <Field label="Kilo"><NumberInput name="kg" defaultValue={String(f.kg).replace(".", ",")} required /></Field>
                          <Field label="₺/kg"><NumberInput name="price" defaultValue={String(f.price).replace(".", ",")} required /></Field>
                          <Field label="Neden">
                            <Select name="reason" defaultValue={f.reason}>
                              {(Object.keys(REASON) as Fire["reason"][]).map((r) => <option key={r} value={r}>{REASON[r]}</option>)}
                            </Select>
                          </Field>
                          <Field label="Not"><Input name="note" defaultValue={f.note ?? ""} /></Field>
                          <div className="col-span-2 flex justify-end"><SubmitButton>Değişiklikleri kaydet</SubmitButton></div>
                        </ActionForm>
                      </EditDialog>
                      <DeleteButton action={deleteFire.bind(null, f.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
