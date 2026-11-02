import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { CUSTOMER_KIND } from "@/components/customers/kinds";
import { mapData, type MapMetric } from "@/components/map/map-data";
import { MAP_SOURCE, MapLegend, TurkeyMap } from "@/components/map/turkey-map";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getDataset } from "@/lib/data/repo";
import { dateLabel, fmtKg, fmtNum, fmtTL } from "@/lib/format";

const METRICS: { v: MapMetric; label: string }[] = [
  { v: "ciro", label: "Satış tutarı" },
  { v: "kg", label: "Satılan kg" },
  { v: "musteri", label: "Müşteri sayısı" },
];

// Güncel veri istek anında okunur (.data/db.json).
export const instant = false;

export default async function MapPage({ searchParams }: { searchParams: Promise<{ il?: string; olcu?: string }> }) {
  const ds = await getDataset();
  const sp = await searchParams;
  const metric = (METRICS.find((m) => m.v === sp.olcu)?.v ?? "ciro") as MapMetric;
  const { byIl, values, tips, unknown, ranking } = mapData(ds, metric);
  const il = sp.il && byIl.has(sp.il) ? sp.il : sp.il ?? null;
  const sel = il ? byIl.get(il) : undefined;
  const max = Math.max(0, ...Object.values(values));
  const fmt = (v: number) => (metric === "ciro" ? fmtTL(v) : metric === "kg" ? fmtKg(v) : `${v} müşteri`);
  const q = (o: { il?: string | null; olcu?: string }) => {
    const p = new URLSearchParams();
    if (o.olcu ?? metric) p.set("olcu", o.olcu ?? metric);
    if (o.il) p.set("il", o.il);
    return `/harita?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Harita"
        subtitle="Müşterilerin bulunduğu iller · ile tıklayınca o ildeki müşteriler, müşteriye tıklayınca detayı açılır"
        action={
          <div className="flex gap-1 rounded-lg border border-hairline bg-surface p-1">
            {METRICS.map((m) => (
              <Link key={m.v} href={q({ il, olcu: m.v })} className={cn("rounded-md px-3 py-1.5 text-[13px]", m.v === metric ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt")}>
                {m.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <CardHeader
            title={il ? <span className="flex items-center gap-2"><Link href={q({ il: null })} aria-label="Türkiye'ye dön" className="rounded p-1 text-muted hover:bg-surface-alt hover:text-ink"><ArrowLeft className="size-4" /></Link>{il}</span> : "Türkiye · iller"}
            subtitle={`${METRICS.find((m) => m.v === metric)!.label} · ile göre`}
            action={<MapLegend />}
          />
          <div className="mt-2">
            <TurkeyMap values={values} tips={tips} selected={il} hrefBase={`/harita?olcu=${metric}&il=`} />
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-hairline px-5 py-2.5 text-xs text-muted">
            {unknown > 0 ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden /> {unknown} müşterinin ili girilmemiş; haritada gösterilmiyor. <Link href="/musteriler" className="font-medium text-ink underline">İl ekleyin</Link>
              </span>
            ) : <span />}
            <span className="text-[11px]">{MAP_SOURCE}</span>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {il ? (
            <>
              <Card>
                <CardHeader title={il} subtitle={`${sel?.customers.length ?? 0} müşteri`} />
                <dl className="grid grid-cols-2 gap-3 px-5 pt-3 pb-4">
                  <div><dt className="text-xs text-muted">Satış tutarı</dt><dd className="num text-[17px] font-semibold text-ink">{fmtTL(sel?.revenue ?? 0)}</dd></div>
                  <div><dt className="text-xs text-muted">Satılan</dt><dd className="num text-[17px] font-semibold text-ink">{fmtKg(sel?.kg ?? 0)}</dd></div>
                </dl>
              </Card>
              <Card>
                <CardHeader title="Müşteriler" subtitle="Tıklayınca müşteri detayı açılır" />
                <ul className="mt-3 border-t border-hairline">
                  {(sel?.customers ?? []).map((c) => (
                    <li key={c.id}>
                      <Link href={`/musteriler/${c.id}`} className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-hairline/70 px-5 py-2.5 text-[13px] hover:bg-surface-alt">
                        <span className="truncate font-medium text-ink">{c.name}</span>
                        <span className="num row-span-2 self-center font-semibold text-ink">{fmtTL(c.revenue)}</span>
                        <span className="truncate text-xs text-muted">{CUSTOMER_KIND[c.kind]}{c.ilce ? ` · ${c.ilce}` : ""} · {c.lastDate ? `son ${dateLabel(c.lastDate)}` : "satış yok"}</span>
                      </Link>
                    </li>
                  ))}
                  {!sel?.customers.length && <li className="px-5 py-4 text-[13px] text-muted">Bu ilde kayıtlı müşteri yok. <Link href="/musteriler" className="underline">Müşteri ekleyin</Link>.</li>}
                </ul>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader title="İller" subtitle="Tıklayınca ilin müşterileri açılır" />
              <div className="py-2">
                {ranking.map((r) => {
                  const v = values[r.il] ?? 0;
                  return (
                    <Link key={r.il} href={q({ il: r.il })} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-1.5 text-[13px] hover:bg-surface-alt">
                      <span className="truncate font-medium text-ink">{r.il}</span>
                      <i className="block h-2 min-w-[3px] rounded-sm bg-brand" style={{ width: `${max ? (v / max) * 100 : 0}%` }} />
                      <b className="num text-xs font-semibold text-ink">{fmt(v)}</b>
                    </Link>
                  );
                })}
                {!ranking.length && (
                  <p className="px-5 py-4 text-[13px] text-muted">
                    Henüz ili girilmiş müşteri yok. Sözleşmeli kurumun ve Halis&apos;in alıcılarının ilini <Link href="/musteriler" className="font-medium text-ink underline">Müşteriler</Link>&apos;den girin.
                  </p>
                )}
              </div>
              <p className="border-t border-hairline px-5 py-2.5 text-xs text-muted">{fmtNum(ds.customers.length)} müşteri kayıtlı</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
