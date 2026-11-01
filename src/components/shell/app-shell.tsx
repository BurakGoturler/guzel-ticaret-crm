"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Menüyü kapat" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button aria-label="Menüyü aç" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-ink hover:bg-surface-alt">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="font-semibold text-ink">Güzel Ticaret</span>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
