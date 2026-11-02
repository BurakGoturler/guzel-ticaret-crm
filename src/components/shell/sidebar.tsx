"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex h-full flex-col gap-6 bg-shell px-3 py-5 text-shell-ink">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-lg bg-white/10 text-lg font-semibold text-white">G</div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-white">Güzel Ticaret</div>
          <div className="text-xs text-shell-ink/70">Ecrin · Güzel · Halis</div>
        </div>
      </div>
      {NAV.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-shell-ink/50">{group.title}</div>
          {group.items.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-shell-active font-medium text-white" : "hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      <div className="mt-auto px-2 text-[11px] leading-relaxed text-shell-ink/50">
        İlk veri: 2026 yaz dönemi.xlsx
        <br />
        Ekrandan girilenler kaydedilir.
      </div>
    </nav>
  );
}
