import { ActionForm, Field, Input, NumberInput, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { resetData, saveSettings } from "@/lib/actions";
import { getDataset } from "@/lib/data/repo";
import { dateLabel, fmtNum } from "@/lib/format";

const pct = (r: number) => (r * 100).toLocaleString("tr-TR", { maximumFractionDigits: 4 });

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function SettingsPage() {
  const ds = await getDataset();
  const { stopajRate, advanceTaxRate, kdvRate } = ds.settings;
  const counts: [string, number][] = [
    ["Ürün", ds.products.length],
    ["Müşteri", ds.customers.length],
    ["Sözleşme", ds.contracts.length],
    ["Satış / sevkiyat", ds.deliveries.length],
    ["Halis satışı", ds.deliveries.filter((d) => d.seller === "halis").length],
    ["Alış fiyatı", ds.purchasePrices.length],
    ["Fire & iade", ds.fires.length],
    ["Masraf", ds.expenses.length],
  ];

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Kesinti oranları ve veri yönetimi" />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Oranlar" subtitle="Değiştirince tüm aylar yeniden hesaplanır" />
          <ActionForm action={saveSettings} resetOnSuccess={false} className="grid grid-cols-1 items-end gap-3 px-5 pt-3 pb-4 sm:grid-cols-3">
            <Field label="Stopaj %" hint="Excel: =-N24*0,022"><NumberInput name="stopaj" defaultValue={pct(stopajRate)} required /></Field>
            <Field label="Peşin kesilen vergi %" hint="Excel: =-0,02*N24"><NumberInput name="advanceTax" defaultValue={pct(advanceTaxRate)} required /></Field>
            <Field label="KDV %" hint="Faturaya eklenir, kârdan düşmez"><NumberInput name="kdv" defaultValue={pct(kdvRate)} required /></Field>
            <div><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Kayıtlar" subtitle={`Son değişiklik: ${dateLabel(ds.generatedAt.slice(0, 10))} ${ds.generatedAt.slice(11, 16)}`} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-5 pt-3 pb-4 text-[13px] sm:grid-cols-4">
            {counts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="num text-[17px] font-semibold text-ink">{fmtNum(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-hairline px-5 py-3 text-xs text-muted">
            Veriler bu bilgisayarda <code className="rounded bg-surface-alt px-1">.data/db.json</code> dosyasında tutulur. Veritabanına geçince bu dosya taşınacak.
          </p>
        </Card>

        <Card className="border-danger/30 xl:col-span-2">
          <CardHeader title="Excel'deki ilk hâline dön" subtitle="Ekrandan girilen tüm satışlar, müşteriler, masraflar ve değişiklikler silinir. Geri alınamaz." />
          <ActionForm action={resetData} className="flex flex-wrap items-end gap-3 px-5 pt-3 pb-4">
            <Field label="Onay için SIFIRLA yazın" className="w-56"><Input name="confirm" autoComplete="off" placeholder="SIFIRLA" /></Field>
            <SubmitButton variant="danger">Verileri sıfırla</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
