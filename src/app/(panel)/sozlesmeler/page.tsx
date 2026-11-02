import Link from "next/link";
import { ActionForm, DeleteButton, Field, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { deleteContract, saveContract } from "@/lib/actions";
import { EditDialog } from "@/components/forms/edit-dialog";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { contractProgress, monthOf, seasonOfMonth } from "@/lib/domain/calc";
import { fmtNum, fmtPct, fmtTL, fmtTL2, todayISO } from "@/lib/format";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ donem?: string }> }) {
  const ds = await getDataset();
  const { donem } = await searchParams;
  const current = seasonOfMonth(ds, monthOf(todayISO()));
  const season = ds.seasons.find((s) => s.id === donem) ?? current ?? ds.seasons[ds.seasons.length - 1]!;
  const list = contractProgress(ds, season.id);
  const total = list.reduce((a, c) => ({ value: a.value + c.contractKg * c.salePrice, revenue: a.revenue + c.revenue }), { value: 0, revenue: 0 });
  const used = new Set(list.map((c) => c.productId));
  const free = ds.products.filter((p) => p.active && !used.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <>
      <PageHeader
        title="Sözleşmeler"
        subtitle="Excel'de satır 5 (sözleşme kg) ve satır 6 (satış ₺/kg) · kalan, önceki aylardan devrederek hesaplanır"
        action={
          <div className="flex flex-wrap gap-1 rounded-lg border border-hairline bg-surface p-1">
            {ds.seasons.map((s) => (
              <Link key={s.id} href={`/sozlesmeler?donem=${s.id}`} className={cn("rounded-md px-3 py-1.5 text-[13px]", s.id === season.id ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt")}>
                {s.name}
              </Link>
            ))}
          </div>
        }
      />

      <Card>
        <CardHeader
          title={season.name}
          subtitle={<>{list.length} sözleşme · sözleşme tutarı {fmtTL(total.value)} · gerçekleşen {fmtTL(total.revenue)}</>}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
                <th className="px-5 py-2 font-medium">Ürün</th>
                <th className="px-3 py-2 text-right font-medium">Sözleşme kg</th>
                <th className="px-3 py-2 text-right font-medium">Satış ₺/kg</th>
                <th className="px-3 py-2 text-right font-medium">Tutar</th>
                <th className="px-3 py-2 text-right font-medium">Çıkan kg</th>
                <th className="w-44 px-3 py-2 font-medium">Gerçekleşme</th>
                <th className="px-3 py-2 text-right font-medium">Kalan kg</th>
                <th className="px-5 py-2"><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.contractId} className={cn("border-b border-hairline/70 align-top", i % 2 === 1 && "bg-zebra/60")}>
                  <td className="px-5 py-2.5">
                    <Link href={`/urunler/${c.productId}`} className="font-medium text-ink hover:underline">{c.productName}</Link>
                    {c.contractId.startsWith("onceki") && <div className="text-xs text-muted">önceki dönemden devir</div>}
                  </td>
                  <td className="num px-3 py-2.5 text-right">{fmtNum(c.contractKg)}</td>
                  <td className="num px-3 py-2.5 text-right">{fmtTL2(c.salePrice)}</td>
                  <td className="num px-3 py-2.5 text-right">{fmtTL(c.contractKg * c.salePrice)}</td>
                  <td className="num px-3 py-2.5 text-right">
                    {fmtNum(c.delivered)}
                    {c.halisKg > 0 && <div className="text-xs text-muted">Halis {fmtNum(c.halisKg)}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 pt-1">
                      <Progress ratio={c.ratio} colorClass="bg-brand" />
                      <span className="num w-11 text-right text-xs text-muted">{fmtPct(c.ratio)}</span>
                    </div>
                  </td>
                  <td className={cn("num px-3 py-2.5 text-right font-medium", c.remaining < 0 ? "text-danger" : "text-ink")}>{fmtNum(c.remaining)}</td>
                  <td className="px-5 py-2 text-right">
                    <span className="whitespace-nowrap">
                      <EditDialog title="Sözleşmeyi düzenle" subtitle={`${c.productName} · ${season.name}`}>
                        <ActionForm action={saveContract} resetOnSuccess={false} className="grid grid-cols-2 items-end gap-3">
                          <input type="hidden" name="id" value={c.contractId} />
                          <Field label="Sözleşme kg"><NumberInput name="contractKg" defaultValue={c.contractKg} required /></Field>
                          <Field label="Satış ₺/kg"><NumberInput name="salePrice" defaultValue={String(c.salePrice).replace(".", ",")} required /></Field>
                          <p className="col-span-2 text-[11px] text-faint">Fiyat değişikliği yalnız bundan sonraki satışlara uygulanır; geçmiş satışın fiyatı Satışlar&apos;dan düzeltilir.</p>
                          <div className="col-span-2 flex justify-end"><SubmitButton>Değişiklikleri kaydet</SubmitButton></div>
                        </ActionForm>
                      </EditDialog>
                      {c.deliveryCount === 0 && <DeleteButton action={deleteContract.bind(null, c.contractId)} label="Sözleşmeyi sil" />}
                    </span>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan={8} className="px-5 py-6 text-muted">Bu dönemde sözleşme yok — aşağıdan ekleyin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Sözleşmeye ürün ekle" subtitle={`${season.name} için yeni kalem`} />
        <ActionForm action={saveContract} className="grid grid-cols-1 items-end gap-3 px-5 pt-3 pb-4 sm:grid-cols-[minmax(12rem,1fr)_10rem_9rem_auto]">
          <input type="hidden" name="seasonId" value={season.id} />
          <Field label="Ürün" hint={<>Listede yoksa <Link href="/urunler" className="underline">Ürünler</Link>&apos;den ekleyin</>}>
            <Select name="productId" required defaultValue="">
              <option value="">Seçin…</option>
              {free.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Sözleşme kg"><NumberInput name="contractKg" placeholder="ör. 60000" required /></Field>
          <Field label="Satış ₺/kg"><NumberInput name="salePrice" placeholder="ör. 53" required /></Field>
          <div><SubmitButton>Ekle</SubmitButton></div>
        </ActionForm>
      </Card>
    </>
  );
}
