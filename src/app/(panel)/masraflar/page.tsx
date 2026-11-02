import Link from "next/link";
import { ActionForm, DeleteButton, Field, Input, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { addExpense, deleteExpense, updateExpense } from "@/lib/actions";
import { EditDialog } from "@/components/forms/edit-dialog";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { monthSummary } from "@/lib/domain/calc";
import { fmtTL, monthLabel } from "@/lib/format";
import { resolveMonth } from "@/lib/month";
import { CopyExpensesButton } from "./copy-button";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const { months, month } = resolveMonth(ds, (await searchParams).ay);
  const rows = ds.expenses.filter((e) => e.month === month);
  const s = monthSummary(ds, month);
  const prev = [...new Set(ds.expenses.map((e) => e.month))].filter((m) => m < month).sort().pop();
  const labels = [...new Set(ds.expenses.map((e) => e.label))].sort((a, b) => a.localeCompare(b, "tr"));
  const { stopajRate, advanceTaxRate } = ds.settings;

  return (
    <>
      <PageHeader
        title="Masraflar"
        subtitle="Excel'de satır 34–41: Halis, elemanlar, ceza, damga … · stopaj ve peşin vergi ciroya göre otomatik"
        action={<MonthPicker months={months} current={month} basePath="/masraflar" />}
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title={`${monthLabel(month)} masrafları`}
            subtitle={`${rows.length} kalem · toplam ${fmtTL(s.expenseTotal)}`}
            action={!rows.length && prev ? <CopyExpensesButton month={month} from={prev} label={`${monthLabel(prev)} kalemlerini kopyala`} /> : undefined}
          />
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">Bu ay masraf girilmedi.</p>
          ) : (
            <ul className="mt-3 border-t border-hairline">
              {rows.map((e, i) => (
                <li key={e.id} className={cn("flex items-center justify-between gap-3 border-b border-hairline/70 px-5 py-2 text-[13px]", i % 2 === 1 && "bg-zebra/60")}>
                  <span className="text-ink">{e.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="num font-medium text-ink">{fmtTL(e.amount)}</span>
                    <span className="whitespace-nowrap">
                      <EditDialog title="Masrafı düzenle" subtitle={`${e.label} · ${monthLabel(e.month)}`}>
                        <ActionForm action={updateExpense} resetOnSuccess={false} className="grid grid-cols-2 items-end gap-3">
                          <input type="hidden" name="id" value={e.id} />
                          <Field label="Kalem" className="col-span-2"><Input name="label" list="expense-labels" defaultValue={e.label} required /></Field>
                          <Field label="Tutar ₺"><NumberInput name="amount" defaultValue={String(e.amount).replace(".", ",")} required /></Field>
                          <Field label="Ay">
                            <Select name="month" defaultValue={e.month}>
                              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                            </Select>
                          </Field>
                          <div className="col-span-2 flex justify-end"><SubmitButton>Değişiklikleri kaydet</SubmitButton></div>
                        </ActionForm>
                      </EditDialog>
                      <DeleteButton action={deleteExpense.bind(null, e.id)} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ActionForm action={addExpense} className="grid grid-cols-1 items-end gap-3 px-5 pt-4 pb-4 sm:grid-cols-[1fr_10rem_auto]">
            <input type="hidden" name="month" value={month} />
            <Field label="Kalem">
              <Input name="label" list="expense-labels" placeholder="ör. Elemanlar" required data-autofocus />
            </Field>
            <Field label="Tutar ₺"><NumberInput name="amount" placeholder="ör. 54000" required /></Field>
            <div><SubmitButton>Ekle</SubmitButton></div>
            <datalist id="expense-labels">{labels.map((l) => <option key={l} value={l} />)}</datalist>
          </ActionForm>
        </Card>

        <Card>
          <CardHeader title="Otomatik kesintiler" subtitle="Kurum cirosu üzerinden hesaplanır, elle girilmez" />
          <ul className="mt-3 px-5 pb-4 text-[13px]">
            <li className="flex justify-between py-1.5"><span>Kurum cirosu</span><span className="num">{fmtTL(s.revenue)}</span></li>
            <li className="flex justify-between py-1.5"><span>Stopaj (%{(stopajRate * 100).toLocaleString("tr-TR")})</span><span className="num">{fmtTL(s.stopaj)}</span></li>
            <li className="flex justify-between py-1.5"><span>Peşin vergi (%{(advanceTaxRate * 100).toLocaleString("tr-TR")})</span><span className="num">{fmtTL(s.advanceTax)}</span></li>
            <li className="flex justify-between py-1.5"><span>Fire / kasa-dara</span><span className="num">{fmtTL(s.fireLoss)}</span></li>
            <li className="mt-1 flex justify-between border-t border-hairline pt-2.5 font-semibold text-ink"><span>Masraflarla birlikte toplam</span><span className="num">{fmtTL(s.deductions)}</span></li>
          </ul>
          <p className="border-t border-hairline px-5 py-3 text-xs text-muted">
            Oranlar <Link href="/ayarlar" className="underline">Ayarlar</Link>&apos;dan değişir. Net kâr: <Link href={`/raporlar?ay=${month}`} className="underline">Raporlar</Link>.
          </p>
        </Card>
      </div>
    </>
  );
}
