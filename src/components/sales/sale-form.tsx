"use client";

import { useState } from "react";
import { ActionForm, Field, Input, NumberInput, Select, SubmitButton } from "@/components/forms/form";
import { FIRM_META } from "@/components/ui/firm";
import { addSale } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { fmtTL2 } from "@/lib/format";
import type { SaleOptions } from "./sale-options";

/**
 * Satış girişi — Excel'de ay sayfasında ürün kolonuna kg yazmanın karşılığı.
 * Kaydedince ürünün ay toplamı, kalanı, cirosu, kârı ve firma tablosu kendiliğinden güncellenir.
 */
export function SaleForm({ options, defaultDate, productId: fixedProduct, defaultSeller = "kurum", compact, onSaved }: {
  options: SaleOptions;
  defaultDate: string;
  /** Verilirse ürün seçimi gizlenir (ürün satırı / ürün detayı) */
  productId?: string;
  defaultSeller?: "kurum" | "halis";
  compact?: boolean;
  onSaved?: () => void;
}) {
  const [seller, setSeller] = useState<"kurum" | "halis">(defaultSeller);
  const [date, setDate] = useState(defaultDate);
  const [productId, setProductId] = useState(fixedProduct ?? "");

  const month = date.slice(0, 7);
  const season = options.seasons.find((s) => s.start <= date && date <= s.end);
  const price = season && productId ? options.prices[`${season.id}|${productId}`] : undefined;
  const firm = productId ? options.firms[`${month}|${productId}`] : undefined;

  return (
    <ActionForm
      action={addSale}
      keep={["date", "seller", "productId", "customerId"]}
      onSuccess={onSaved}
      className={cn("grid items-end gap-3", compact ? "grid-cols-2 sm:grid-cols-[auto_9.5rem_7rem_1fr_auto]" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-[auto_10rem_minmax(10rem,1fr)_8rem_auto]")}
    >
      <input type="hidden" name="seller" value={seller} />
      <Field label="Satan" className="col-span-2 sm:col-span-1">
        <div className="flex h-9 rounded-md border border-hairline-strong bg-surface p-0.5" role="radiogroup" aria-label="Satan">
          {(["kurum", "halis"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={seller === s}
              onClick={() => setSeller(s)}
              className={cn("rounded px-2.5 text-[13px] whitespace-nowrap", seller === s ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt")}
            >
              {s === "kurum" ? "Kuruma teslim" : "Halis satışı"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tarih">
        <Input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>

      {fixedProduct ? (
        <input type="hidden" name="productId" value={fixedProduct} />
      ) : (
        <Field label="Ürün" className="col-span-2 md:col-span-1">
          <Select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Ürün seçin…</option>
            {options.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      )}

      <Field label="Kilo (kg)">
        <NumberInput name="kg" placeholder="ör. 1000" required data-autofocus autoFocus={compact} />
      </Field>

      {seller === "halis" && (
        <>
          <Field label="Halis'in fiyatı ₺/kg" hint={price ? `Sözleşme fiyatı ${fmtTL2(price)}` : undefined}>
            <NumberInput name="salePrice" placeholder={price ? String(price).replace(".", ",") : "₺/kg"} required />
          </Field>
          <Field label="Alıcı" hint={options.customers.length ? undefined : "Müşteriler'den alıcı ekleyebilirsiniz"}>
            <Select name="customerId" defaultValue="">
              <option value="">Belirtilmedi</option>
              {options.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.il ? ` · ${c.il}` : ""}</option>)}
            </Select>
          </Field>
        </>
      )}

      {seller === "kurum" && productId && !firm && (
        <Field label="Firma" hint="Bu ay atanmamış — seçtiğiniz firma bu aya atanır">
          <Select name="firmId" defaultValue="" required>
            <option value="">Seçin…</option>
            <option value="ecrin">{FIRM_META.ecrin.name}</option>
            <option value="guzel">{FIRM_META.guzel.name}</option>
          </Select>
        </Field>
      )}

      <div className={cn("flex items-center gap-3", !compact && "col-span-2 md:col-span-1")}>
        <SubmitButton>Kaydet</SubmitButton>
      </div>

      {productId && (
        <p className="col-span-full -mt-1 text-xs text-muted">
          {seller === "kurum" ? (
            <>
              {firm ? <>Fatura: <b className={cn("font-medium", FIRM_META[firm].text)}>{FIRM_META[firm].name}</b> · </> : null}
              {price ? <>Sözleşme fiyatı {fmtTL2(price)}/kg</> : <span className="text-warning">Bu dönemde sözleşme yok</span>}
            </>
          ) : (
            <>Halis satışı sözleşme kalanından düşer; firma faturasına ve stopaja girmez.</>
          )}
        </p>
      )}
    </ActionForm>
  );
}
