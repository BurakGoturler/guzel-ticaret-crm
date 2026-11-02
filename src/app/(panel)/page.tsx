import { ArrowRight, ArrowRightLeft, Building2, Carrot, CircleAlert, HandCoins, History, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { FIRM_META, HALIS_META } from "@/components/ui/firm";
import { MonthPicker } from "@/components/ui/month-picker";
import { IconChip, type ChipTone } from "@/components/ui/icon-chip";
import { ProductBoard } from "@/components/sales/product-board";
import { SaleForm } from "@/components/sales/sale-form";
import { saleOptions } from "@/components/sales/sale-options";
import { RecentActivity } from "@/components/sales/recent-activity";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { firmOf, monthOf, monthSummary, monthsWithData, productBoard, seasonOfMonth } from "@/lib/domain/calc";
import type { FirmId } from "@/lib/domain/types";
import { defaultDateFor, fmtKg, fmtNum, fmtPct, fmtTL, monthLabel, todayISO } from "@/lib/format";

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const ds = await getDataset();
  const today = todayISO();
  const months = monthsWithData(ds, monthOf(today));
  const { ay } = await searchParams;
  const month = ay && months.includes(ay) ? ay : months[months.length - 1]!;
  const prev = months[months.indexOf(month) - 1] ?? null;

  const s = monthSummary(ds, month);
  const season = seasonOfMonth(ds, month);
  const board = productBoard(ds, month);
  const options = saleOptions(ds);
  const defaultDate = defaultDateFor(month, today);
  const recent = ds.deliveries.filter((d) => monthOf(d.date) === month).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  // Önceki aya göre firma değiştiren ürünler
  const swaps = prev
    ? board
        .map((l) => ({ l, before: firmOf(ds, prev, l.productId) }))
        .filter(({ l, before }) => before && l.firmId && before !== l.firmId)
    : [];

  const soldProducts = board.filter((l) => l.kg > 0 || l.halisKg > 0).length;
  const totalAll = s.revenue + s.halis.revenue;
  const categories = Object.fromEntries(ds.products.map((p) => [p.id, p.category]));

  return (
    <>
      {/* Başlık bandı — sayfanın tek koyu alanı; ay seçimi ve hızlı satış burada */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-shell via-shell-active to-[#2a4a86] px-5 pt-5 pb-5 text-white sm:px-7 sm:pt-6">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-white/[0.03]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-white/60">{season?.name ?? "Dönem dışı"}</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{monthLabel(month)}</h1>
            <p className="mt-1 text-[13px] text-white/75">
              {soldProducts ? <>{soldProducts} üründen <b className="font-semibold text-white">{fmtKg(s.kg + s.halis.kg)}</b> satıldı · {fmtTL(totalAll)}</> : <>Bu ay henüz satış yok · {board.length} ürün sözleşmede</>}
            </p>
          </div>
          <MonthPicker months={months} current={month} tone="dark" />
        </div>

        {/* Hızlı satış — Excel'de ay sayfasına kg yazmak gibi */}
        <div className="relative mt-5 rounded-xl bg-surface p-4 text-body shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">Satış gir</span>
            <span className="hidden text-[13px] text-muted sm:inline">· ürün ve kiloyu yazın, gerisi kendiliğinden hesaplanır</span>
          </div>
          <SaleForm options={options} defaultDate={defaultDate} />
        </div>
      </section>

      {/* Üç bölüm: iki firma + Halis — her biri kendi renginde */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {s.firms.map((f) => (
          <SectionCard
            key={f.firmId}
            href={`/firmalar?ay=${month}#${f.firmId}`}
            icon={Building2}
            tone={f.firmId}
            bar={FIRM_META[f.firmId].dot}
            title={FIRM_META[f.firmId].name}
            main={fmtTL(f.revenue)}
            lines={[`${fmtKg(f.kg)} teslim`, `${f.products.length} ürün`]}
            share={totalAll ? f.revenue / totalAll : 0}
          />
        ))}
        <SectionCard
          href={`/halis?ay=${month}`}
          icon={HandCoins}
          tone="halis"
          bar={HALIS_META.dot}
          title="Halis"
          main={fmtTL(s.halis.revenue)}
          lines={s.halis.kg ? [`${fmtKg(s.halis.kg)} satış`, `kâr ${fmtTL(s.halis.profit)}`] : ["Bu ay satış girilmedi"]}
          share={totalAll ? s.halis.revenue / totalAll : 0}
        />
      </div>

      {(swaps.length > 0 || s.unassignedRevenue > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {swaps.length > 0 && prev && (
            <div className="flex items-start gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 text-[13px] text-body">
              <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <span>
                {monthLabel(prev)} → {monthLabel(month)} firma değişimi:{" "}
                {swaps.map(({ l, before }, i) => (
                  <span key={l.contractId}>
                    {i > 0 && ", "}
                    <b className="font-medium text-ink">{l.productName}</b> {FIRM_META[before as FirmId].short} → {FIRM_META[l.firmId as FirmId].short}
                  </span>
                ))}
              </span>
            </div>
          )}
          {s.unassignedRevenue > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-[13px] text-body">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                Bu ay {fmtTL(s.unassignedRevenue)} tutarında satış hiçbir firmaya atanmamış ürünlerden geliyor.{" "}
                <Link href={`/firmalar?ay=${month}`} className="font-medium text-ink underline">Firmalar&apos;dan atayın</Link>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ürünler — sistemin merkezi */}
      <Card className="mt-6">
        <CardHeader
          icon={<IconChip icon={Carrot} tone="success" />}
          title="Ürünler"
          subtitle="Her satırdan doğrudan satış girebilirsiniz · ürün adına tıklayınca tüm geçmişi açılır"
          action={<Link href="/urunler" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">Tüm ürünler <ArrowRight className="size-3.5" /></Link>}
        />
        <div className="mt-3">
          <ProductBoard lines={board} options={options} defaultDate={defaultDate} month={month} categories={categories} />
        </div>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader
            icon={<IconChip icon={History} tone="warning" />}
            title="Son satışlar"
            subtitle={`${monthLabel(month)} · ${fmtNum(ds.deliveries.filter((d) => monthOf(d.date) === month).length)} kayıt`}
            action={<Link href={`/satislar?ay=${month}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">Tümü <ArrowRight className="size-3.5" /></Link>}
          />
          <div className="mt-3">
            <RecentActivity ds={ds} rows={recent} />
          </div>
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Kâr, kesinti ve günlük sevkiyat ayrıntıları <Link href={`/raporlar?ay=${month}`} className="font-medium text-ink underline">Raporlar</Link>&apos;da.
      </p>
    </>
  );
}

function SectionCard({ href, icon, tone, bar, title, main, lines, share }: {
  href: string; icon: LucideIcon; tone: ChipTone; bar: string; title: string; main: string; lines: string[]; share: number;
}) {
  const soft = tone === "ecrin" ? "from-ecrin-soft" : tone === "guzel" ? "from-guzel-soft" : "from-halis-soft";
  return (
    <Link href={href} className={cn("group relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-br to-surface to-70% p-4 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,30,61,0.35)]", soft)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconChip icon={icon} tone={tone} className="bg-surface/80" />
          <span className="text-[14px] font-semibold text-ink">{title}</span>
        </div>
        <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
      <div className="num mt-3 text-[26px] font-semibold tracking-tight text-ink">{main}</div>
      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">{lines.map((l, i) => <span key={l}>{i > 0 && "· "}{l}</span>)}</div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface/90" role="meter" aria-label="Bu ayki satışlardaki payı" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full", bar)} style={{ width: `${share * 100}%` }} />
        </div>
        <span className="num text-xs text-body">{fmtPct(share)}</span>
      </div>
    </Link>
  );
}
