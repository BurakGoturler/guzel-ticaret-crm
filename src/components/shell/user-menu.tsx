"use client";

import { ChevronDown, KeyRound, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import type { ShellUser } from "./sidebar";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toLocaleUpperCase("tr-TR")).join("");

/** Sağ üstteki hesap menüsü: ad, kullanıcılar, şifre ve çıkış. */
export function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const signOut = async () => {
    setLeaving(true);
    await logout();
    window.location.replace("/giris"); // tam yenileme: önceki ekranlar bellekte kalmasın
  };

  const item = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-body hover:bg-surface-alt hover:text-ink";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-ink transition-colors hover:bg-surface-alt"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-medium">{user.name}</span>
          <span className="block text-[11px] text-muted">Süper yönetici</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div role="menu" className="absolute top-[calc(100%+6px)] right-0 z-50 w-60 rounded-xl border border-hairline bg-surface p-1.5 shadow-xl">
          <div className="px-2.5 pt-1.5 pb-2.5">
            <div className="truncate text-[13px] font-semibold text-ink">{user.name}</div>
            <div className="truncate text-[12px] text-muted">@{user.username} · Süper yönetici</div>
          </div>
          <div className="my-1 h-px bg-hairline" />
          <Link role="menuitem" href="/kullanicilar" onClick={() => setOpen(false)} className={item}>
            <Users className="size-4 text-muted" aria-hidden /> Kullanıcılar
          </Link>
          <Link role="menuitem" href="/kullanicilar" onClick={() => setOpen(false)} className={item}>
            <KeyRound className="size-4 text-muted" aria-hidden /> Şifremi değiştir
          </Link>
          <div className="my-1 h-px bg-hairline" />
          <button role="menuitem" type="button" onClick={signOut} disabled={leaving} className={cn(item, "text-danger hover:bg-danger-soft hover:text-danger")}>
            <LogOut className="size-4" aria-hidden /> {leaving ? "Çıkılıyor…" : "Çıkış yap"}
          </button>
        </div>
      )}
    </div>
  );
}
