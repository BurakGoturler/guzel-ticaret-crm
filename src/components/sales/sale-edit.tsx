import { EditDialog } from "@/components/forms/edit-dialog";
import { ActionForm, Field, Input, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { FIRM_META } from "@/components/ui/firm";
import { updateSale } from "@/lib/actions";
import { firmOf, monthOf, productName, salePriceOf } from "@/lib/domain/calc";
import type { Dataset, Delivery } from "@/lib/domain/types";
import { dateLabel, fmtKg } from "@/lib/format";

const dec = (n: number) => String(n).replace(".", ",");

/** Satır düzenleme: tarih, ürün, kilo, fiyat, satan, alıcı ve not değiştirilebilir. */
export function SaleEdit({ ds, d }: { ds: Dataset; d: Delivery }) {
  const products = ds.products
    .filter((p) => p.active || p.id === d.productId)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const customers = ds.customers.filter((c) => c.kind !== "kurum");
  const hasFirm = !!firmOf(ds, monthOf(d.date), d.productId);

  return (
    <EditDialog title="Satışı düzenle" subtitle={`${productName(ds, d.productId)} · ${fmtKg(d.kg)} · ${dateLabel(d.date)}`} label="Satışı düzenle">
      <ActionForm action={updateSale} resetOnSuccess={false} className="grid grid-cols-2 items-start gap-3">
        <input type="hidden" name="id" value={d.id} />
        <Field label="Satan">
          <Select name="seller" defaultValue={d.seller}>
            <option value="kurum">Kuruma teslim</option>
            <option value="halis">Halis satışı</option>
          </Select>
        </Field>
        <Field label="Tarih"><Input type="date" name="date" defaultValue={d.date} required /></Field>
        <Field label="Ürün" className="col-span-2">
          <Select name="productId" defaultValue={d.productId} required>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Kilo (kg)"><NumberInput name="kg" defaultValue={dec(d.kg)} required /></Field>
        <Field label="Fiyat ₺/kg" hint="Kuruma teslimde sözleşme fiyatı"><NumberInput name="salePrice" defaultValue={dec(salePriceOf(ds, d))} required /></Field>
        <Field label="Alıcı" hint="Yalnız Halis satışında kullanılır">
          <Select name="customerId" defaultValue={d.seller === "halis" ? (d.customerId ?? "") : ""}>
            <option value="">Belirtilmedi</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.il ? ` · ${c.il}` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Firma (ay ataması yoksa)" hint={hasFirm ? "Ürünün o ayki atamasından gelir" : "Yeni ay/ürün atanmamışsa seçilen firma atanır"}>
          <Select name="firmId" defaultValue="">
            <option value="">Otomatik</option>
            <option value="ecrin">{FIRM_META.ecrin.name}</option>
            <option value="guzel">{FIRM_META.guzel.name}</option>
          </Select>
        </Field>
        <Field label="Not" className="col-span-2"><Input name="note" defaultValue={d.note ?? ""} /></Field>
        <div className="col-span-2 flex justify-end gap-2">
          <SubmitButton>Değişiklikleri kaydet</SubmitButton>
        </div>
        <p className="col-span-2 text-[11px] text-faint">Kaydedince kalan kg, ciro, kâr ve firma tabloları yeniden hesaplanır.</p>
      </ActionForm>
    </EditDialog>
  );
}
