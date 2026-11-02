"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { NAV } from "./nav";

/**
 * Sol menü. Açıkken simge + ad; daraltılınca yalnız simgeler kalır ve
 * duzenbi'deki gibi Dock benzeri çalışır: imlecin hizasındaki simge büyür,
 * yanında adıyla bir hap kayarak açılır, komşuları uzaklığa göre daha az.
 */
export interface ShellUser {
  name: string;
  username: string;
}

export function Sidebar({ collapsed = false, onToggle, onNavigate }: {
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  useDockMagnify(listRef, collapsed);

  return (
    <nav aria-label="Ana menü" className={cn("flex h-full flex-col bg-shell py-5 text-shell-ink", collapsed ? "px-2.5" : "px-3")}>
      <div className={cn("flex items-center gap-3", collapsed ? "flex-col px-0" : "px-2")}>
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3" aria-label="Güzel Ticaret ana sayfa">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 text-lg font-semibold text-white">G</div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-semibold text-white">Güzel Ticaret</div>
              <div className="truncate text-xs text-shell-ink/70">Ecrin · Güzel · Halis</div>
            </div>
          )}
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn("grid size-8 shrink-0 place-items-center rounded-md text-shell-ink/70 transition-colors hover:bg-white/10 hover:text-white", !collapsed && "ml-auto")}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            title={`${collapsed ? "Menüyü genişlet" : "Menüyü daralt"} (Ctrl+B)`}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
        )}
      </div>

      <div ref={listRef} className={cn("mt-6 flex flex-col", collapsed ? "gap-0" : "gap-6")}>
        {NAV.map((group, gi) => (
          <div key={group.title} className={cn("flex flex-col gap-0.5", collapsed && gi > 0 && "mt-2 border-t border-white/10 pt-2")}>
            {!collapsed && <div className="px-2 pb-1 text-[11px] font-medium tracking-wider text-shell-ink/50 uppercase">{group.title}</div>}
            {group.items.map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              const Icon = item.icon;
              return (
                <div key={item.href} data-dock-item className="relative">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "peer flex items-center rounded-md text-sm transition-colors",
                      collapsed ? "mx-auto size-10 justify-center" : "gap-3 px-2.5 py-2",
                      active ? "bg-shell-active font-medium text-white" : "hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", collapsed && "size-[18px] transition-transform duration-150 ease-out [transform:scale(calc(1+var(--dock,0)*0.45))]")}
                      aria-hidden
                    />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                  </Link>
                  {/* Daraltılmış menüde adlı hap: imlece yakınlığa göre (--dock 0…1) belirir; klavye odağında tam görünür */}
                  {collapsed && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-50 flex items-center rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap shadow-lg",
                        "origin-left opacity-(--dock,0) transition-[opacity,transform] duration-150 ease-out [transform:translate(calc((1-var(--dock,0))*-12px),-50%)_scale(calc(0.8+var(--dock,0)*0.2))]",
                        "peer-focus-visible:opacity-100 peer-focus-visible:[transform:translate(0,-50%)]",
                        active ? "bg-brand text-white ring-1 ring-white/20" : "bg-surface text-ink ring-1 ring-hairline",
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

    </nav>
  );
}

/* Dock benzeri açılım: imlecin hizasındaki öğe en çok, DOCK_RANGE uzaklıkta hiç büyümez.
   Yakınlık (0…1) --dock değişkeniyle öğeye yazılır; görünüm CSS'te. */
const DOCK_RANGE = 80;

function useDockMagnify(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let y: number | null = null;
    const items = () => [...root.querySelectorAll<HTMLElement>("[data-dock-item]")];
    const apply = () => {
      frame = 0;
      for (const item of items()) {
        const r = item.getBoundingClientRect();
        const d = y === null ? Infinity : Math.abs(r.top + r.height / 2 - y);
        // Kosinüs düşüşü: imlecin hizasında 1, DOCK_RANGE uzaklıkta 0
        const k = d >= DOCK_RANGE ? 0 : (Math.cos((d / DOCK_RANGE) * Math.PI) + 1) / 2;
        item.style.setProperty("--dock", k.toFixed(3));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
    const move = (e: MouseEvent) => { y = e.clientY; schedule(); };
    const leave = () => { y = null; schedule(); };
    root.addEventListener("mousemove", move);
    root.addEventListener("mouseleave", leave);
    return () => {
      root.removeEventListener("mousemove", move);
      root.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(frame);
      for (const item of items()) item.style.removeProperty("--dock");
    };
  }, [ref, enabled]);
}
