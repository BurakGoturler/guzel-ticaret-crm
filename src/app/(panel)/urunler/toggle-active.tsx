"use client";

import { useTransition } from "react";
import { toggleProduct } from "@/lib/actions";
import { cn } from "@/lib/cn";

/** Ürünü kullanımdan kaldırır / geri alır. Pasif ürün satış formunda görünmez, geçmişi kalır. */
export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await toggleProduct(id); })}
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        active ? "bg-success-soft text-success hover:opacity-80" : "bg-surface-alt text-muted hover:text-ink",
      )}
      title={active ? "Pasife almak için tıklayın" : "Yeniden kullanmak için tıklayın"}
    >
      {pending ? "…" : active ? "Kullanımda" : "Pasif"}
    </button>
  );
}
