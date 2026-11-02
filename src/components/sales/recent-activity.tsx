import Link from "next/link";
import { FIRM_META } from "@/components/ui/firm";
import { cn } from "@/lib/cn";
import { firmOf, monthOf, productName, salePriceOf } from "@/lib/domain/calc";
import type { Dataset, Delivery } from "@/lib/domain/types";
import { dateLabel, fmtKg, fmtTL } from "@/lib/format";

/** Son satışlar — her satır renkli rozetle kimin sattığını gösterir. */
export function RecentActivity({ ds, rows }: { ds: Dataset; rows: Delivery[] }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-[13px] text-muted">Bu ay henüz satış girilmedi.<br />Yukarıdaki formdan ilk satışı girin.</p>;
  return (
    <ul className="grid gap-x-6 px-3 pb-3 lg:grid-cols-2">
      {rows.map((d) => {
        const firm = d.seller === "halis" ? null : firmOf(ds, monthOf(d.date), d.productId);
        const who = d.seller === "halis" ? "Halis" : firm ? FIRM_META[firm].short : "Atanmamış";
        const tone = d.seller === "halis" ? "bg-halis-soft text-halis" : firm ? cn(FIRM_META[firm].soft, FIRM_META[firm].text) : "bg-surface-alt text-muted";
        const name = productName(ds, d.productId);
        const customer = ds.customers.find((c) => c.id === d.customerId);
        return (
          <li key={d.id}>
            <Link href={`/urunler/${d.productId}?ay=${monthOf(d.date)}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-alt">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold", tone)} aria-hidden>
                {name.slice(0, 1).toLocaleUpperCase("tr-TR")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{name} · {fmtKg(d.kg)}</span>
                <span className="block truncate text-xs text-muted">{who}{customer && d.seller === "halis" ? ` → ${customer.name}` : ""} · {dateLabel(d.date)}</span>
              </span>
              <span className="num text-[13px] font-semibold text-ink">{fmtTL(d.kg * salePriceOf(ds, d))}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
