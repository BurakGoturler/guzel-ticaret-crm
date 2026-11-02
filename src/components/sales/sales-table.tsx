import Link from "next/link";
import { DeleteButton } from "@/components/forms/form";
import { FirmBadge, HalisBadge } from "@/components/ui/firm";
import { deleteSale } from "@/lib/actions";
import { SaleEdit } from "./sale-edit";
import { cn } from "@/lib/cn";
import { firmOf, monthOf, productName, salePriceOf } from "@/lib/domain/calc";
import type { Dataset, Delivery } from "@/lib/domain/types";
import { dateLabel, fmtNum, fmtTL, fmtTL2 } from "@/lib/format";

/** Satış listesi — her satır Excel'de bir hücreye yazılmış kg'ın karşılığı. */
export function SalesTable({ ds, rows, hideProduct, hideCustomer, empty = "Kayıt yok." }: {
  ds: Dataset;
  rows: Delivery[];
  hideProduct?: boolean;
  hideCustomer?: boolean;
  empty?: string;
}) {
  if (!rows.length) return <p className="px-5 py-6 text-[13px] text-muted">{empty}</p>;
  const customer = (id: string | null) => ds.customers.find((c) => c.id === id);
  const kg = rows.reduce((a, d) => a + d.kg, 0);
  const total = rows.reduce((a, d) => a + d.kg * salePriceOf(ds, d), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="border-y border-hairline bg-surface-alt text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Tarih</th>
            {!hideProduct && <th className="px-3 py-2 font-medium">Ürün</th>}
            <th className="px-3 py-2 font-medium">Satan</th>
            {!hideCustomer && <th className="px-3 py-2 font-medium">Alıcı</th>}
            <th className="px-3 py-2 text-right font-medium">kg</th>
            <th className="px-3 py-2 text-right font-medium">₺/kg</th>
            <th className="px-3 py-2 text-right font-medium">Tutar</th>
            <th className="px-3 py-2 font-medium">Not</th>
            <th className="px-5 py-2"><span className="sr-only">Düzenle / sil</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => {
            const price = salePriceOf(ds, d);
            const c = customer(d.customerId);
            return (
              <tr key={d.id} className={cn("border-b border-hairline/70", i % 2 === 1 && "bg-zebra/60")}>
                <td className="num px-5 py-2 whitespace-nowrap">{dateLabel(d.date)}</td>
                {!hideProduct && (
                  <td className="px-3 py-2">
                    <Link href={`/urunler/${d.productId}?ay=${monthOf(d.date)}`} className="font-medium text-ink hover:underline">{productName(ds, d.productId)}</Link>
                  </td>
                )}
                <td className="px-3 py-2">
                  {d.seller === "halis"
                    ? <HalisBadge />
                    : <FirmBadge firm={firmOf(ds, monthOf(d.date), d.productId)} />}
                </td>
                {!hideCustomer && (
                  <td className="max-w-48 truncate px-3 py-2">
                    {c ? <Link href={`/musteriler/${c.id}`} className="text-body hover:underline">{c.name}</Link> : <span className="text-faint">—</span>}
                  </td>
                )}
                <td className="num px-3 py-2 text-right font-medium text-ink">{fmtNum(d.kg)}</td>
                <td className="num px-3 py-2 text-right">{fmtTL2(price)}</td>
                <td className="num px-3 py-2 text-right text-ink">{fmtTL(d.kg * price)}</td>
                <td className="max-w-56 truncate px-3 py-2 text-xs text-muted" title={d.note ?? undefined}>{d.note}</td>
                <td className="px-5 py-1.5 text-right whitespace-nowrap"><SaleEdit ds={ds} d={d} /><DeleteButton action={deleteSale.bind(null, d.id)} /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold text-ink">
            <td className="px-5 py-3" colSpan={2 + (hideProduct ? 0 : 1) + (hideCustomer ? 0 : 1)}>{rows.length} kayıt</td>
            <td className="num px-3 py-3 text-right">{fmtNum(kg)}</td>
            <td />
            <td className="num px-3 py-3 text-right">{fmtTL(total)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
