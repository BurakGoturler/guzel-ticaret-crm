"use client";

import { Copy } from "lucide-react";
import { useTransition } from "react";
import { buttonClass } from "@/components/forms/button-class";
import { copyExpenses } from "@/lib/actions";

/** Halis, elemanlar gibi her ay tekrarlayan kalemleri önceki aydan getirir. */
export function CopyExpensesButton({ month, from, label }: { month: string; from: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await copyExpenses(month, from); })} className={buttonClass("secondary", "sm")}>
      <Copy className="size-3.5" aria-hidden />
      {pending ? "Kopyalanıyor…" : label}
    </button>
  );
}
