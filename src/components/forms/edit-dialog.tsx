"use client";

import { Pencil, X } from "lucide-react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Pencere içindeki form başarıyla kaydedince pencereyi kapatmak için. */
const DialogClose = createContext<(() => void) | null>(null);
export const useDialogClose = () => useContext(DialogClose);

/**
 * Satır düzenleme penceresi: kalem düğmesi + ortada açılan form.
 * Tarayıcı diyaloğu kullanmaz; Esc ve dış alana tıklama kapatır.
 */
export function EditDialog({ title, subtitle, children, label = "Düzenle", icon }: {
  /** Düğme simgesi (varsayılan kalem). Sunucudan geldiği için öğe olarak verilir. */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const first = panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
    first?.focus();
    const btn = opener.current;
    return () => { document.removeEventListener("keydown", onKey); btn?.focus(); };
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded px-1.5 py-1 text-xs text-muted hover:bg-brand-soft hover:text-brand"
        aria-label={label}
        title={label}
      >
        {icon ?? <Pencil className="size-3.5" aria-hidden />}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-16" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-xl rounded-xl border border-hairline bg-surface text-left shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
              <div>
                <h2 id={titleId} className="text-[15px] font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-surface-alt hover:text-ink" aria-label="Kapat">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <DialogClose.Provider value={() => setOpen(false)}>{children}</DialogClose.Provider>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
