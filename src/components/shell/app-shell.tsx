"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { Sidebar, type ShellUser } from "./sidebar";
import { UserMenu } from "./user-menu";

/* Menünün açık/daraltılmış hali tarayıcıda hatırlanır (yalnız bu kullanıcı için). */
const KEY = "gt-sidebar-collapsed";
const listeners = new Set<() => void>();

function readCollapsed() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
function writeCollapsed(v: boolean) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* depolama kapalıysa yalnız bu oturumda */ }
  memory = v;
  listeners.forEach((l) => l());
}
let memory: boolean | null = null;
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => (memory ??= readCollapsed());
const getServerSnapshot = () => false;

export function AppShell({ children, user }: { children: React.ReactNode; user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => writeCollapsed(!getSnapshot()), []);

  // Ctrl/⌘ + B ile aç-kapa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div
      className={cn(
        "min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out motion-reduce:transition-none",
        collapsed ? "lg:grid-cols-[68px_1fr]" : "lg:grid-cols-[240px_1fr]",
      )}
    >
      <aside className="sticky top-0 z-40 hidden h-dvh lg:block">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button aria-label="Menüyü aç" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-ink hover:bg-surface-alt lg:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <span className="font-semibold text-ink lg:hidden">Güzel Ticaret</span>
          <div className="ml-auto"><UserMenu user={user} /></div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
