"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { buttonClass } from "@/components/forms/button-class";
import { FIRM_META, FirmBadge } from "@/components/ui/firm";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import type { ProductLine } from "@/lib/domain/calc";
import { fmtNum, fmtPct, fmtTL, fmtTL2 } from "@/lib/format";
import { SaleForm } from "./sale-form";
import type { SaleOptions } from "./sale-options";

/** Ürün odaklı ana tablo: her ürünün bu ayki satışı, sözleşme kalanı ve satırdan satış girişi. */
export function ProductBoard({ lines, options, defaultDate, month, categories = {} }: {
  lines: ProductLine[];
  /** ürün → sebze / meyve (satır rozetinin rengi) */
  categories?: Record<string, "sebze" | "meyve">;
  options: SaleOptions;
  defaultDate: string;
  month: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const total = lines.reduce((a, l) => ({ kg: a.kg + l.kg, halis: a.halis + l.halisKg, rev: a.rev + l.revenue }), { kg: 0, halis: 0, rev: 0 });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Ürün</th>
            <th className="px-3 py-2 font-medium">Bu ay satan</th>
            <th className="px-3 py-2 text-right font-medium">Bu ay satılan</th>
            <th className="w-56 px-3 py-2 font-medium">Sözleşmeden kalan</th>
            <th className="px-3 py-2 text-right font-medium">Fiyat ₺/kg</th>
            <th className="px-3 py-2 text-right font-medium">Ciro</th>
            <th className="px-5 py-2 text-right font-medium"><span className="sr-only">İşlem</span></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const ratio = l.contractKg ? l.deliveredToDate / l.contractKg : 0;
            const isOpen = open === l.contractId;
            const old = l.contractId.startsWith("onceki");
            return (
              <Fragment key={l.contractId}>
                <tr className={cn("border-b border-hairline/70", i % 2 === 1 && !isOpen && "bg-zebra/60", isOpen && "bg-brand-soft/60")}>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn("grid size-7 shrink-0 place-items-center rounded-md text-xs font-semibold", categories[l.productId] === "meyve" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}
                        title={categories[l.productId] === "meyve" ? "Meyve" : "Sebze"}
                        aria-hidden
                      >
                        {l.productName.slice(0, 1).toLocaleUpperCase("tr-TR")}
                      </span>
                      <span>
                        <Link href={`/urunler/${l.productId}?ay=${month}`} className="font-medium text-ink hover:underline">{l.productName}</Link>
                        {old && <span className="ml-1.5 text-xs text-muted">(önceki sözleşme)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><FirmBadge firm={l.firmId} /></td>
                  <td className="num px-3 py-2.5 text-right">
                    <span className={cn("font-medium", l.kg ? "text-ink" : "text-faint")}>{l.kg ? `${fmtNum(l.kg)} kg` : "—"}</span>
                    {l.halisKg > 0 && <div className="text-xs text-muted">+ Halis {fmtNum(l.halisKg)} kg</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    {l.contractKg ? (
                      <div className="flex items-center gap-2">
                        <Progress ratio={ratio} colorClass={l.firmId ? FIRM_META[l.firmId].dot : undefined} />
                        <span className={cn("num w-24 shrink-0 text-right text-xs", l.remaining < 0 ? "text-danger" : "text-body")} title={`Kullanılan %${Math.round(ratio * 100)}`}>
                          {fmtNum(l.remaining)} kg
                        </span>
                      </div>
                    ) : <span className="text-xs text-faint">sözleşme kg yok</span>}
                  </td>
                  <td className="num px-3 py-2.5 text-right">{fmtTL2(l.salePrice)}</td>
                  <td className="num px-3 py-2.5 text-right text-ink">{l.revenue ? fmtTL(l.revenue) : <span className="text-faint">—</span>}</td>
                  <td className="px-5 py-2 text-right">
                    {!old && (
                      <button type="button" onClick={() => setOpen(isOpen ? null : l.contractId)} className={buttonClass(isOpen ? "ghost" : "secondary", "sm")} aria-expanded={isOpen}>
                        {isOpen ? <X className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                        {isOpen ? "Kapat" : "Satış"}
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-hairline bg-brand-soft/60">
                    <td colSpan={7} className="px-5 pt-1 pb-4">
                      <div className="mb-2 text-xs text-muted">
                        <b className="font-medium text-ink">{l.productName}</b> için satış — kalan {fmtNum(l.remaining)} kg · kullanılan {fmtPct(ratio)}
                      </div>
                      <SaleForm options={options} productId={l.productId} defaultDate={defaultDate} compact />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold text-ink">
            <td className="px-5 py-3" colSpan={2}>Toplam</td>
            <td className="num px-3 py-3 text-right">
              {fmtNum(total.kg)} kg
              {total.halis > 0 && <div className="text-xs font-normal text-muted">+ Halis {fmtNum(total.halis)} kg</div>}
            </td>
            <td colSpan={2} />
            <td className="num px-3 py-3 text-right">{fmtTL(total.rev)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
