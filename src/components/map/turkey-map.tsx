"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import geo from "@/data/turkiye-iller.json";

/**
 * 3B kabartma Türkiye il haritası (ary-teklif'teki TurkeyMap3D'nin uyarlaması).
 * Harita verisi: geoBoundaries TUR ADM1 (OSM, ODbL) — yalnız il sınırları.
 */
type Geo = { w: number; h: number; kaynak: string; ulke: string; iller: { ad: string; kod: string; d: string }[] };
const G = geo as Geo;
export const MAP_SOURCE = G.kaynak;

/** 0 → boş, en yüksek → koyu lacivert (karekök ölçek: az veri de görünür olsun). */
function shade(v: number, max: number) {
  if (!v || !max) return "var(--map-empty)";
  const t = Math.sqrt(v / max);
  const a = [205, 218, 240], b = [29, 50, 96];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * t)).join(",")})`;
}

export interface MapTip {
  title: string;
  lines: string[];
}

export function TurkeyMap({ values, tips, selected, hrefBase, compact }: {
  /** İl adı → değer (boyama) */
  values: Record<string, number>;
  /** İl adı → üzerine gelince görünen özet */
  tips: Record<string, MapTip>;
  selected?: string | null;
  /** İle tıklanınca gidilecek adresin öneki; sonuna il adı eklenir (ör. "/harita?il=") */
  hrefBase: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const max = useMemo(() => Math.max(0, ...Object.values(values)), [values]);
  const lifted = hover?.name ?? selected ?? null;
  const depth = 14;
  const layers = Array.from({ length: 12 }, (_, i) => (i + 1) * (depth / 12));

  const onMove = (e: React.MouseEvent, name: string) => {
    const r = wrap.current!.getBoundingClientRect();
    setHover({ name, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const tip = hover ? tips[hover.name] : undefined;

  return (
    <div className={compact ? "map-stage map-compact" : "map-stage"} ref={wrap} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`-14 -14 ${G.w + 28} ${G.h + 46}`} className="map3d" role="img" aria-label="Türkiye il haritası">
        <defs>
          <linearGradient id="map-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--map-side-top)" />
            <stop offset="1" stopColor="var(--map-side-bottom)" />
          </linearGradient>
          <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="140%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        {/* gölge ve kabartmanın yan yüzü (ülke sınırının aşağı kaydırılmış kopyaları) */}
        <path d={G.ulke} transform={`translate(4,${depth + 10})`} fill="rgba(16,32,48,.28)" filter="url(#map-shadow)" />
        {layers.map((dy, i) => (
          <path key={i} d={G.ulke} transform={`translate(0,${dy})`} fill={i === layers.length - 1 ? "var(--map-side-bottom)" : "url(#map-side)"} stroke="var(--map-side-bottom)" strokeWidth={0.6} />
        ))}
        <g>
          {G.iller.map((x) => (
            <path
              key={x.kod}
              d={x.d}
              className={"map-il" + (lifted === x.ad ? " on" : "")}
              fill={shade(values[x.ad] ?? 0, max)}
              onMouseMove={(e) => onMove(e, x.ad)}
              onClick={() => { setHover(null); router.push(hrefBase + encodeURIComponent(x.ad)); }}
            >
              <title>{x.ad}</title>
            </path>
          ))}
          {G.iller.filter((x) => x.ad === lifted).map((x) => (
            <g key="lift" pointerEvents="none">
              {[1, 2, 3, 4, 5].map((k) => <path key={k} d={x.d} transform={`translate(0,${-6 + k})`} fill="var(--brand)" />)}
              <path d={x.d} transform="translate(0,-6)" fill={shade(values[x.ad] ?? 0, max)} stroke="#fff" strokeWidth={1.4} />
            </g>
          ))}
        </g>
      </svg>
      {hover && (
        <div className="map-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{hover.name}</b>
          {(tip?.lines ?? ["Kayıtlı müşteri yok"]).map((l) => <div key={l}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted">
      <span>az</span>
      <i className="inline-block h-2 w-16" style={{ background: "linear-gradient(90deg, rgb(205,218,240), rgb(29,50,96))" }} />
      <span>çok</span>
      <i className="ml-2 inline-block size-3 border border-hairline-strong" style={{ background: "var(--map-empty)" }} />
      <span>satış yok</span>
    </div>
  );
}
