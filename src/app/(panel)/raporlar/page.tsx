import { Building2, CalendarDays, Carrot, FileText, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { BarsChart, ChartCard, DonutChart, LinesChart, type Series } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/card";
import { FIRM_META, HALIS_META } from "@/components/ui/firm";
import { Kpi } from "@/components/ui/kpi";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { MonthPicker } from "@/components/ui/month-picker";
import { contractProgress, dailyByFirm, firmMatrix, monthOf, monthSummary, monthsWithData, productLines, seasonOfMonth } from "@/lib/domain/calc";
import { dayLabel, fmtCompact, fmtKg, fmtNum, fmtPct, fmtTL, fmtTL2, monthLabel, monthShort, todayISO } from "@/lib/format";

// Kategorik sıra (dataviz referans paleti) — firma renkleri (1: mavi, 2: turuncu) hariç tutulur
const CAT = ["#6250d6", "#eda100", "#1baf7a", "#e87ba4", "#008300", "#e34948"] as const;
const FIRMS: Series[] = [
  { key: "ecrin", label: FIRM_META.ecrin.name, color: FIRM_META.ecrin.color },
  { key: "guzel", label: FIRM_META.guzel.name, color: FIRM_META.guzel.color },
];
const DAILY: Series[] = [...FIRMS, { key: "halis", label: HALIS_META.name, color: HALIS_META.color }];

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

const TABS: { id: string; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "ozet", label: "Ay özeti", icon: CalendarDays, desc: "Seçili ayın cirosu, kârı, kesintileri ve günlük sevkiyatı" },
  { id: "kar", label: "Satış & kâr", icon: TrendingUp, desc: "Dönem boyunca ay ay satış, alış, brüt ve net kâr" },
  { id: "firmalar", label: "Firmalar", icon: Building2, desc: "Ecrin ve Güzel'in cirosu, payı ve hangi ürünü hangi ay sattığı" },
  { id: "urunler", label: "Ürünler & fiyat", icon: Carrot, desc: "Ürün bazlı ciro, satış ve alış fiyatları" },
  { id: "sozlesmeler", label: "Sözleşmeler", icon: FileText, desc: "Sözleşme kilolarının ne kadarı teslim edildi" },
  { id: "giderler", label: "Giderler", icon: Wallet, desc: "Masraf, kesinti ve fire dağılımı" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ donem?: string; ay?: string; sekme?: string }> }) {
  const ds = await getDataset();
  const all = monthsWithData(ds, monthOf(todayISO()));
  const withSales = [...new Set(ds.deliveries.map((d) => monthOf(d.date)))].sort();
  const seasonsWithData = ds.seasons.filter((s) => withSales.some((m) => seasonOfMonth(ds, m)?.id === s.id));
  const { donem, ay, sekme } = await searchParams;
  const tab = TABS.find((t) => t.id === sekme) ?? TABS[0]!;
  const season = seasonsWithData.find((s) => s.id === donem) ?? seasonsWithData[seasonsWithData.length - 1]!;

  /* 0 · ay özeti (ana sayfadan taşındı) */
  const month = ay && all.includes(ay) ? ay : (withSales[withSales.length - 1] ?? all[all.length - 1]!);
  const ms = monthSummary(ds, month);
  const prevMonth = all[all.indexOf(month) - 1];
  const ps = prevMonth ? monthSummary(ds, prevMonth) : null;
  const daily = dailyByFirm(ds, month);
  const delta = (cur: number, old: number | undefined) =>
    old ? <span className={cur >= old ? "text-success" : "text-danger"}>{cur >= old ? "▲" : "▼"} {fmtPct(Math.abs(cur - old) / Math.abs(old))} önceki aya göre</span> : undefined;
  const months = all.filter((m) => seasonOfMonth(ds, m)?.id === season.id);
  const sums = months.map((m) => monthSummary(ds, m));

  const tot = (f: (x: (typeof sums)[number]) => number) => sums.reduce((a, x) => a + f(x), 0);
  const revenue = tot((x) => x.revenue);
  const net = tot((x) => x.netProfit);

  /* 1 · aylık satış / alış / kâr */
  const pnl = sums.map((x) => ({ month: x.month, sale: x.revenue, cost: x.cost, profit: x.grossProfit }));
  /* 2 · firmaya göre aylık ciro */
  const byFirm = sums.map((x) => ({
    month: x.month,
    ecrin: x.firms.find((f) => f.firmId === "ecrin")?.revenue ?? 0,
    guzel: x.firms.find((f) => f.firmId === "guzel")?.revenue ?? 0,
  }));
  const firmTotals = FIRMS.map((f) => ({ key: f.key, label: f.label, color: f.color, value: byFirm.reduce((a, r) => a + (r[f.key as "ecrin"] ?? 0), 0) }));
  /* 3 · net kâr ve marj */
  const netRows = sums.map((x) => ({ month: x.month, net: x.netProfit, margin: x.netMargin }));
  /* 4 · ürün bazlı ciro (firmaya göre yığılı — ürün ay ay firma değiştirebilir) */
  const prodMap = new Map<string, { name: string; ecrin: number; guzel: number }>();
  for (const m of months)
    for (const l of productLines(ds, m)) {
      const r = prodMap.get(l.productId) ?? { name: l.productName, ecrin: 0, guzel: 0 };
      if (l.firmId) r[l.firmId] += l.revenue;
      prodMap.set(l.productId, r);
    }
  const prodRows = [...prodMap.values()].sort((a, b) => b.ecrin + b.guzel - (a.ecrin + a.guzel));
  /* 5 · sözleşme gerçekleşme */
  const progress = contractProgress(ds, season.id).filter((c) => c.contractKg > 0);
  const progRows = progress.map((c) => ({ name: c.productName, delivered: c.delivered, remaining: Math.max(0, c.remaining) }));
  /* 6 · alış / satış fiyatı (dönem ağırlıklı ortalaması) */
  const priceMap = new Map<string, { name: string; kg: number; sale: number; cost: number; costKg: number }>();
  for (const m of months)
    for (const l of productLines(ds, m)) {
      const r = priceMap.get(l.productId) ?? { name: l.productName, kg: 0, sale: 0, cost: 0, costKg: 0 };
      r.kg += l.kg; r.sale += l.revenue;
      if (l.purchasePrice !== null) { r.cost += l.cost; r.costKg += l.kg; }
      priceMap.set(l.productId, r);
    }
  const priceRows = [...priceMap.values()]
    .map((r) => ({ name: r.name, sale: r.kg ? r.sale / r.kg : 0, cost: r.costKg ? r.cost / r.costKg : 0 }))
    .sort((a, b) => b.sale - a.sale);
  /* 7 · masraf & kesinti dağılımı */
  const exp = new Map<string, number>();
  const add = (k: string, v: number) => exp.set(k, (exp.get(k) ?? 0) + v);
  for (const x of sums) {
    add("Stopaj", x.stopaj);
    add("Peşin vergi", x.advanceTax);
    add("Fire / kasa-dara", x.fireLoss);
    for (const e of x.expenses) {
      const k = /halis/i.test(e.label) ? "Halis" : /eleman|saat/i.test(e.label) ? "Elemanlar" : "Ceza, damga & diğer";
      add(k, e.amount);
    }
  }
  const expRows = [...exp.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ key: label, label, value, color: CAT[i % CAT.length]! }));
  /* 8 · kümülatif gerçekleşme — en büyük 5 sözleşme */
  const top = progress.slice(0, 5);
  const cumRows = months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const c of top) {
      const kg = ds.deliveries.filter((d) => d.contractId === c.contractId && monthOf(d.date) <= m).reduce((a, d) => a + d.kg, 0);
      row[c.contractId] = c.contractKg ? kg / c.contractKg : 0;
    }
    return row;
  });
  const cumSeries: Series[] = top.map((c, i) => ({ key: c.contractId, label: c.productName, color: CAT[i]! }));
  /* 9 · dönem boyu günlük sevkiyat */
  const dayMap = new Map<string, { date: string; ecrin: number; guzel: number }>();
  for (const d of ds.deliveries) {
    if (!months.includes(monthOf(d.date)) || d.seller === "halis" || d.note?.startsWith("Mayıs ay toplamı")) continue; // günlük dökümü olmayan ay toplamı grafiği bozmasın
    const firm = ds.assignments.find((a) => a.month === monthOf(d.date) && a.productId === d.productId)?.firmId;
    if (!firm) continue;
    const r = dayMap.get(d.date) ?? { date: d.date, ecrin: 0, guzel: 0 };
    r[firm] += d.kg;
    dayMap.set(d.date, r);
  }
  const dayRows = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  /* 10 · fire */
  const fireMap = new Map<string, { name: string; kg: number; loss: number }>();
  for (const f of ds.fires.filter((x) => months.includes(x.month))) {
    const r = fireMap.get(f.productId) ?? { name: ds.products.find((p) => p.id === f.productId)?.name ?? f.productId, kg: 0, loss: 0 };
    r.kg += f.kg; r.loss += f.kg * f.price;
    fireMap.set(f.productId, r);
  }
  const fireRows = [...fireMap.values()].sort((a, b) => b.loss - a.loss);
  /* 11 · firma matrisi */
  const matrix = firmMatrix(ds, months);

  const href = (o: { sekme?: string; ay?: string; donem?: string }) =>
    `/raporlar?sekme=${o.sekme ?? tab.id}&ay=${o.ay ?? month}&donem=${o.donem ?? season.id}`;
  const empty = !months.length;

  return (
    <>
      <PageHeader title="Raporlar" subtitle="Konuyu seçin; her sekmede yalnız o konunun grafikleri var" />

      {/* Kategori sekmeleri */}
      <nav aria-label="Rapor kategorileri" className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const on = t.id === tab.id;
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              href={href({ sekme: t.id })}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] transition-colors",
                on ? "border-brand bg-brand font-medium text-white" : "border-hairline bg-surface text-body hover:border-hairline-strong hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{tab.id === "ozet" ? `${tab.label} · ${monthLabel(month)}` : `${tab.label} · ${season.name}`}</h2>
          <p className="text-[13px] text-muted">{tab.desc}{tab.id !== "ozet" && !empty ? ` · ${monthLabel(months[0]!)} – ${monthLabel(months[months.length - 1]!)}` : ""}</p>
        </div>
        {tab.id === "ozet" ? (
          <MonthPicker months={all} current={month} basePath="/raporlar" extra={`&sekme=ozet&donem=${season.id}`} />
        ) : (
          seasonsWithData.length > 1 && (
            <div className="flex gap-1 rounded-lg border border-hairline bg-surface p-1">
              {seasonsWithData.map((s) => (
                <Link key={s.id} href={href({ donem: s.id })} className={cn("rounded-md px-3 py-1.5 text-[13px]", s.id === season.id ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt")}>
                  {s.name}
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      {tab.id === "ozet" && (
        <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Satış cirosu" value={fmtTL(ms.revenue)} hint={<>Kuruma kesilen fatura, KDV hariç{ps ? <><br />{delta(ms.revenue, ps.revenue)}</> : null}</>} />
          <Kpi label="Alış maliyeti" value={fmtTL(ms.cost)} hint="Üreticiye ödenen: kg × alış fiyatı" />
          <Kpi label="Brüt kâr" value={fmtTL(ms.grossProfit)} hint="Satış − alış, kesintilerden önce" />
          <Kpi label="Kesinti & masraf" value={fmtTL(ms.deductions)} hint="Stopaj, peşin vergi, fire, Halis, elemanlar…" />
          <Kpi label="Net kâr" value={fmtTL(ms.netProfit)} tone={ms.netProfit < 0 ? "negative" : "default"} hint={<>Cebe kalan · Halis kârı dahil{ps ? <><br />{delta(ms.netProfit, ps.netProfit)}</> : null}</>} />
          <Kpi label="Teslim edilen" value={fmtKg(ms.kg)} hint={`${daily.length} sevkiyat günü${ms.halis.kg ? ` · Halis ${fmtKg(ms.halis.kg)}` : ""}`} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader title="Kârdan net kâra" subtitle="Excel'deki kesinti sütununun hesaplanmış hâli" />
            <ul className="mt-3 px-5 pb-4 text-[13px]">
              <BridgeRow label="Brüt kâr (kuruma teslim)" value={ms.grossProfit} strong />
              {ms.halis.kg > 0 && <BridgeRow label={`Halis satış kârı (${fmtKg(ms.halis.kg)})`} value={ms.halisProfit} />}
              <BridgeRow label={`Fire / kasa-dara (${fmtKg(ms.fireKg)})`} value={-ms.fireLoss} />
              <BridgeRow label={`Stopaj (%${(ds.settings.stopajRate * 100).toLocaleString("tr-TR")})`} value={-ms.stopaj} />
              <BridgeRow label={`Peşin kesilen vergi (%${(ds.settings.advanceTaxRate * 100).toLocaleString("tr-TR")})`} value={-ms.advanceTax} />
              {ms.expenses.map((e, i) => <BridgeRow key={`${e.label}-${i}`} label={e.label} value={-e.amount} />)}
              <BridgeRow label="Net kâr" value={ms.netProfit} strong total />
            </ul>
            <p className="border-t border-hairline px-5 py-3 text-xs text-muted">
              KDV (%{(ds.settings.kdvRate * 100).toLocaleString("tr-TR")}) faturaya eklenir, kârdan düşülmez: {fmtTL(ms.kdv)}. Oranlar <Link href="/ayarlar" className="underline">Ayarlar</Link>&apos;dan değişir.
            </p>
          </Card>

          <ChartCard
            title="Günlük sevkiyat"
            subtitle={`${monthLabel(month)} · firmaya göre kg`}
            series={DAILY}
            table={{
              columns: ["Tarih", "Ecrin (kg)", "Güzel (kg)", "Halis (kg)", "Toplam"],
              rows: daily.map((d) => [dayLabel(d.date), fmtNum(d.ecrin), fmtNum(d.guzel), fmtNum(d.halis), fmtNum(d.ecrin + d.guzel + d.halis + d.diger)]),
            }}
          >
            <BarsChart data={daily} xKey="date" axis="day" format="kg" stacked series={DAILY} />
          </ChartCard>
        </div>
        </>
      )}

      {tab.id === "kar" && (
        <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Dönem cirosu" value={fmtTL(revenue)} />
        <Kpi label="Alış maliyeti" value={fmtTL(tot((x) => x.cost))} />
        <Kpi label="Brüt kâr" value={fmtTL(tot((x) => x.grossProfit))} />
        <Kpi label="Kesinti & masraf" value={fmtTL(tot((x) => x.deductions))} />
        <Kpi label="Net kâr" value={fmtTL(net)} hint={`Net marj ${fmtPct(revenue ? net / revenue : 0)}`} />
        <Kpi label="Teslim edilen" value={fmtKg(tot((x) => x.kg))} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="xl:col-span-2"><ChartCard
          title="Aylık satış, alış ve brüt kâr"
          subtitle="İki firma toplamı"
          series={[{ key: "sale", label: "Satış", color: "var(--series-sale)" }, { key: "cost", label: "Alış", color: "var(--series-cost)" }, { key: "profit", label: "Brüt kâr", color: "var(--series-profit)" }]}
          table={{ columns: ["Ay", "Satış", "Alış", "Brüt kâr"], rows: pnl.map((r) => [monthLabel(r.month), fmtTL(r.sale), fmtTL(r.cost), fmtTL(r.profit)]) }}
        >
          <BarsChart data={pnl} xKey="month" series={[{ key: "sale", label: "Satış", color: "var(--series-sale)" }, { key: "cost", label: "Alış", color: "var(--series-cost)" }, { key: "profit", label: "Brüt kâr", color: "var(--series-profit)" }]} />
        </ChartCard></div>
        <ChartCard
          title="Aylık net kâr"
          subtitle="Kesintiler ve masraflar düşüldükten sonra"
          table={{ columns: ["Ay", "Net kâr", "Net marj"], rows: netRows.map((r) => [monthLabel(r.month), fmtTL(r.net), fmtPct(r.margin)]) }}
          height={240}
        >
          <BarsChart data={netRows} xKey="month" series={[{ key: "net", label: "Net kâr", color: "var(--series-profit)" }]} />
        </ChartCard>
        <ChartCard
          title="Net kâr marjı"
          subtitle="Net kâr ÷ satış cirosu"
          table={{ columns: ["Ay", "Net marj"], rows: netRows.map((r) => [monthLabel(r.month), fmtPct(r.margin)]) }}
          height={240}
        >
          <LinesChart data={netRows} xKey="month" format="pct" series={[{ key: "margin", label: "Net marj", color: "var(--series-sale)" }]} />
        </ChartCard>
      </div>
        </>
      )}

      {tab.id === "firmalar" && (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Firmaya göre aylık ciro"
          subtitle="Ürünler ay ay firma değiştirdiği için pay da değişir"
          series={FIRMS}
          table={{ columns: ["Ay", "Ecrin", "Güzel", "Toplam"], rows: byFirm.map((r) => [monthLabel(r.month), fmtTL(r.ecrin), fmtTL(r.guzel), fmtTL(r.ecrin + r.guzel)]) }}
        >
          <BarsChart data={byFirm} xKey="month" series={FIRMS} stacked />
        </ChartCard>
        <ChartCard
          title="Firma ciro payı"
          subtitle="Dönem toplamı"
          table={{ columns: ["Firma", "Ciro", "Pay"], rows: firmTotals.map((f) => [f.label, fmtTL(f.value), fmtPct(revenue ? f.value / revenue : 0)]) }}
          height={240}
        >
          <DonutChart data={firmTotals} centerLabel="₺ ciro" />
        </ChartCard>
        <div className="xl:col-span-2"><Card className="flex flex-col">
          <CardHeader title="Hangi ay hangi ürünü kim sattı" subtitle="Hücre rengi firma, değer o ay teslim edilen kg" />
          <div className="mt-3 overflow-x-auto px-5 pb-4">
            <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="pb-1 text-left font-medium">Ürün</th>
                  {months.map((m) => <th key={m} className="pb-1 font-medium">{monthShort(m)}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.productId}>
                    <td className="pr-2 text-[13px] text-ink">{row.productName}</td>
                    {row.cells.map((c) => (
                      <td key={c.month}
                        title={`${row.productName} · ${monthLabel(c.month)} · ${c.firmId ? FIRM_META[c.firmId].name : "atanmamış"} · ${fmtKg(c.kg)}`}
                        className={cn("num h-8 rounded text-center", c.firmId ? FIRM_META[c.firmId].soft : "bg-surface-alt", c.firmId && "text-ink")}
                      >
                        {c.firmId ? (
                          <span className="inline-flex items-center gap-1">
                            <span className={cn("size-1.5 rounded-full", FIRM_META[c.firmId].dot)} aria-hidden />
                            {c.kg ? fmtCompact(c.kg) : "—"}
                          </span>
                        ) : <span className="text-faint">·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex gap-4 text-xs text-body">
              {FIRMS.map((f) => (
                <span key={f.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: f.color }} />{f.label}</span>
              ))}
            </div>
          </div>
        </Card></div>
        <div className="xl:col-span-2"><ChartCard
          title="Günlük sevkiyat"
          subtitle="Dönem boyunca, firmaya göre kg · Mayıs hariç (Excel'de günlük döküm yok)"
          series={FIRMS}
         
          table={{ columns: ["Tarih", "Ecrin", "Güzel", "Toplam"], rows: dayRows.map((r) => [`${dayLabel(r.date)}.${r.date.slice(0, 4)}`, fmtNum(r.ecrin), fmtNum(r.guzel), fmtNum(r.ecrin + r.guzel)]) }}
        >
          <LinesChart data={dayRows} xKey="date" axis="day" format="kg" area series={FIRMS} />
        </ChartCard></div>
      </div>
      )}

      {tab.id === "urunler" && (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Ürün bazlı ciro"
          subtitle="Dönem toplamı, satan firmaya göre"
          series={FIRMS}
          table={{ columns: ["Ürün", "Ecrin", "Güzel", "Toplam"], rows: prodRows.map((r) => [r.name, fmtTL(r.ecrin), fmtTL(r.guzel), fmtTL(r.ecrin + r.guzel)]) }}
          height={Math.max(240, prodRows.length * 30)}
        >
          <BarsChart data={prodRows} xKey="name" axis="text" series={FIRMS} stacked horizontal />
        </ChartCard>
        <ChartCard
          title="Satış ve alış fiyatı"
          subtitle="Dönem ağırlıklı ortalaması, ₺/kg"
          series={[{ key: "sale", label: "Satış ₺/kg", color: "var(--series-sale)" }, { key: "cost", label: "Alış ₺/kg", color: "var(--series-cost)" }]}
          table={{ columns: ["Ürün", "Satış ₺/kg", "Alış ₺/kg", "Fark"], rows: priceRows.map((r) => [r.name, fmtTL2(r.sale), fmtTL2(r.cost), fmtTL2(r.sale - r.cost)]) }}
          height={Math.max(260, priceRows.length * 34)}
        >
          <BarsChart data={priceRows} xKey="name" axis="text" horizontal
            series={[{ key: "sale", label: "Satış ₺/kg", color: "var(--series-sale)" }, { key: "cost", label: "Alış ₺/kg", color: "var(--series-cost)" }]} />
        </ChartCard>
      </div>
      )}

      {tab.id === "sozlesmeler" && (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Sözleşme gerçekleşmesi"
          subtitle="Teslim edilen ve kalan kg"
          series={[{ key: "delivered", label: "Teslim edilen", color: "var(--brand)" }, { key: "remaining", label: "Kalan", color: "var(--hairline-strong)" }]}
          table={{ columns: ["Ürün", "Sözleşme", "Teslim", "Kalan", "%"], rows: progress.map((c) => [c.productName, fmtNum(c.contractKg), fmtNum(c.delivered), fmtNum(c.remaining), fmtPct(c.ratio)]) }}
          height={Math.max(240, progRows.length * 30)}
        >
          <BarsChart data={progRows} xKey="name" axis="text" format="kg" stacked horizontal
            series={[{ key: "delivered", label: "Teslim edilen", color: "var(--brand)" }, { key: "remaining", label: "Kalan", color: "var(--hairline-strong)" }]} />
        </ChartCard>
        <ChartCard
          title="Kümülatif gerçekleşme"
          subtitle="En büyük 5 sözleşme · ay sonu itibarıyla teslim oranı"
          series={cumSeries}
          table={{ columns: ["Ay", ...top.map((c) => c.productName)], rows: cumRows.map((r) => [monthLabel(String(r.month)), ...top.map((c) => fmtPct(Number(r[c.contractId])))]) }}
        >
          <LinesChart data={cumRows} xKey="month" format="pct" series={cumSeries} />
        </ChartCard>
      </div>
      )}

      {tab.id === "giderler" && (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Masraf ve kesinti dağılımı"
          subtitle="Brüt kârdan düşülen kalemler"
          table={{ columns: ["Kalem", "Tutar"], rows: expRows.map((e) => [e.label, fmtTL(e.value)]) }}
          height={240}
        >
          <DonutChart data={expRows} centerLabel="₺ kesinti" />
        </ChartCard>
        <ChartCard
          title="Fire ve kasa-dara kaybı"
          subtitle="Ürüne göre, ₺"
          table={{ columns: ["Ürün", "kg", "Kayıp"], rows: fireRows.map((r) => [r.name, fmtNum(r.kg), fmtTL(r.loss)]) }}
          height={Math.max(220, fireRows.length * 30)}
        >
          <BarsChart data={fireRows} xKey="name" axis="text" horizontal series={[{ key: "loss", label: "Kayıp", color: "var(--series-loss)" }]} />
        </ChartCard>
      </div>
      )}
    </>
  );
}

function BridgeRow({ label, value, strong, total }: { label: string; value: number; strong?: boolean; total?: boolean }) {
  return (
    <li className={cn("flex items-center justify-between gap-3 py-1.5", total && "mt-1 border-t border-hairline pt-2.5", strong ? "font-semibold text-ink" : "text-body")}>
      <span>{label}</span>
      <span className={cn("num", value < 0 && !strong && "text-muted", total && value < 0 && "text-danger")}>{fmtTL(value)}</span>
    </li>
  );
}
