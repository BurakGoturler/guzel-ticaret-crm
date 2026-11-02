import Link from "next/link";
import { AutoSaveSelect } from "@/components/forms/form";
import { Card, CardHeader } from "@/components/ui/card";
import { FIRM_META } from "@/components/ui/firm";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/ui/page-header";
import { setAssignment } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { firmOf, monthSummary, productName, seasonOfMonth, type FirmTotals } from "@/lib/domain/calc";
import { fmtKg, fmtNum, fmtPct, fmtTL, fmtTL2, monthLabel, monthShort } from "@/lib/format";
import { resolveMonth } from "@/lib/month";

const OPTS = [
  { value: "", label: "—" },
  { value: "ecrin", label: "Ecrin" },
  { value: "guzel", label: "Güzel" },
];

function seasonMonths(start: string, end: string) {
  const out: string[] = [];
  let [y, m] = start.slice(0, 7).split("-").map(Number) as [number, number];
  const last = end.slice(0, 7);
  for (;;) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    if (k > last) break;
    out.push(k);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function FirmsPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const { months, month } = resolveMonth(ds, (await searchParams).ay);
  const s = monthSummary(ds, month);
  const season = seasonOfMonth(ds, month);
  const sMonths = season ? seasonMonths(season.start, season.end) : [month];
  const productIds = [...new Set([
    ...ds.contracts.filter((c) => c.seasonId === season?.id).map((c) => c.productId),
    ...ds.assignments.filter((a) => sMonths.includes(a.month)).map((a) => a.productId),
  ])].sort((a, b) => productName(ds, a).localeCompare(productName(ds, b), "tr"));

  return (
    <>
      <PageHeader
        title="Firmalar"
        subtitle="Ecrin Yaş Sebze Meyve ve Güzel Ticaret · bir ürün bir ayda tek firmadan faturalanır"
        action={<MonthPicker months={months} current={month} basePath="/firmalar" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {s.firms.map((f) => <FirmPanel key={f.firmId} totals={f} share={s.revenue ? f.revenue / s.revenue : 0} month={month} />)}
      </div>

      <Link href={`/halis?ay=${month}`} className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-5 py-3 text-[13px] hover:border-hairline-strong">
        <span className="flex items-center gap-2 font-medium text-ink"><span className="size-2.5 rounded-full bg-halis" aria-hidden />Halis · firma faturasına girmeyen satışlar</span>
        <span className="num text-body">{fmtTL(s.halis.revenue)} · {fmtKg(s.halis.kg)}</span>
      </Link>

      <Card className="mt-6">
        <CardHeader
          title={`Hangi ay hangi ürünü kim satıyor · ${season?.name ?? monthLabel(month)}`}
          subtitle="Hücreden firmayı değiştirin; ürünün o ayki tüm satışları seçilen firmanın faturasına geçer"
        />
        <div className="mt-3 overflow-x-auto px-5 pb-4">
          <table className="w-full min-w-[720px] border-separate border-spacing-[3px] text-xs">
            <thead>
              <tr className="text-muted">
                <th className="pb-1 text-left font-medium">Ürün</th>
                {sMonths.map((m) => <th key={m} className={cn("pb-1 font-medium", m === month && "text-ink")}>{monthShort(m)} {m.slice(2, 4)}</th>)}
              </tr>
            </thead>
            <tbody>
              {productIds.map((pid) => (
                <tr key={pid}>
                  <td className="pr-2 text-[13px] whitespace-nowrap text-ink"><Link href={`/urunler/${pid}`} className="hover:underline">{productName(ds, pid)}</Link></td>
                  {sMonths.map((m) => {
                    const f = firmOf(ds, m, pid);
                    return (
                      <td key={m} className={cn("rounded p-0.5 text-center", f ? FIRM_META[f].soft : "bg-surface-alt")}>
                        <AutoSaveSelect ariaLabel={`${productName(ds, pid)} ${monthLabel(m)} firması`} value={f ?? ""} options={OPTS} onSave={setAssignment.bind(null, m, pid)} className="w-full border-transparent bg-transparent" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function FirmPanel({ totals, share, month }: { totals: FirmTotals; share: number; month: string }) {
  const m = FIRM_META[totals.firmId];
  const margin = totals.revenue ? totals.profit / totals.revenue : 0;
  return (
    <Card id={totals.firmId} className="scroll-mt-20 overflow-hidden">
      <div className={cn("flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5", m.soft)}>
        <div className="flex items-center gap-2.5">
          <span className={cn("size-3 rounded-full", m.dot)} aria-hidden />
          <h2 className="text-[15px] font-semibold text-ink">{m.name}</h2>
        </div>
        <span className="num text-[13px] text-body">Cironun {fmtPct(share)}&apos;i</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4">
        <Stat label="Ciro" value={fmtTL(totals.revenue)} />
        <Stat label="Brüt kâr" value={fmtTL(totals.profit)} sub={`Marj ${fmtPct(margin)}`} />
        <Stat label="Teslim" value={fmtKg(totals.kg)} />
        <Stat label="Fatura (KDV dahil)" value={fmtTL(totals.invoiceTotal)} sub={`KDV ${fmtTL(totals.kdv)}`} />
      </dl>
      <div className="border-t border-hairline">
        {totals.products.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted">{monthLabel(month)} için bu firmadan satış yok.</p>
        ) : (
          <ul>
            {totals.products.map((p) => (
              <li key={p.contractId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-hairline/60 px-5 py-2 text-[13px] last:border-0">
                <Link href={`/urunler/${p.productId}?ay=${month}`} className="truncate font-medium text-ink hover:underline">{p.productName}</Link>
                <span className="num text-right text-muted">{fmtNum(p.kg)} kg × {fmtTL2(p.salePrice)}</span>
                <span className="num w-28 text-right text-ink">{fmtTL(p.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-0.5 truncate text-[17px] font-semibold text-ink">{value}</dd>
      {sub && <dd className="num text-xs text-muted">{sub}</dd>}
    </div>
  );
}
