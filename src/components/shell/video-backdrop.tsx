"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/** Hal / pazar görüntüleri (Mixkit, ticari kullanıma açık ücretsiz lisans). Her biri ≤12 sn, sessiz. */
export const HAL_CLIPS = [
  { src: "/videos/hal-1.mp4", poster: "/videos/hal-1.jpg", label: "Pazar tezgâhı" },
  { src: "/videos/hal-2.mp4", poster: "/videos/hal-2.jpg", label: "Brokoli ve domates" },
  { src: "/videos/hal-3.mp4", poster: "/videos/hal-3.jpg", label: "Kasadan seçim" },
  { src: "/videos/hal-4.mp4", poster: "/videos/hal-4.jpg", label: "Taze ürün" },
  { src: "/videos/hal-5.mp4", poster: "/videos/hal-5.jpg", label: "Manav" },
] as const;

/**
 * Tam ekran döngülü video arka planı: klip bitince sıradakine yumuşak geçer,
 * hepsi bitince başa döner. Yalnız oynayan ve sıradaki klip yüklenir.
 * "Hareketi azalt" açıksa video oynatılmaz, ilk klibin karesi durağan kalır.
 */
export function VideoBackdrop({ className }: { className?: string }) {
  const [active, setActive] = useState(0);
  const still = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    refs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active && !still) {
        v.currentTime = 0;
        v.play().catch(() => { /* otomatik oynatma engellenirse kare görünür */ });
      } else {
        v.pause();
      }
    });
  }, [active, still]);

  const next = () => setActive((i) => (i + 1) % HAL_CLIPS.length);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-shell", className)} aria-hidden>
      {HAL_CLIPS.map((c, i) => {
        const near = i === active || i === (active + 1) % HAL_CLIPS.length;
        return (
          <video
            key={c.src}
            ref={(el) => { refs.current[i] = el; }}
            src={still && i !== 0 ? undefined : c.src}
            poster={c.poster}
            muted
            playsInline
            preload={near ? "auto" : "none"}
            onEnded={next}
            className={cn(
              "absolute inset-0 size-full scale-105 object-cover transition-[opacity,transform] duration-[1400ms] ease-out",
              i === active ? "scale-100 opacity-100" : "opacity-0",
            )}
          />
        );
      })}
      {/* Hafif lacivert örtü: görüntü belirgin kalır, sol üstteki logo okunur */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,rgb(15_30_61/0.6)_0%,rgb(15_30_61/0.2)_35%,rgb(15_30_61/0.15)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgb(15_30_61/0.35),transparent_55%)]" />
      <ClipDots count={HAL_CLIPS.length} active={active} />
    </div>
  );
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const reducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function ClipDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="absolute right-6 bottom-6 flex gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cn("h-1 rounded-full bg-white/30 transition-all duration-500", i === active ? "w-6 bg-white/80" : "w-1.5")} />
      ))}
    </div>
  );
}
