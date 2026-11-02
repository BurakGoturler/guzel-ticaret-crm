"use client";

import { CheckCircle2, CircleAlert, Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { buttonClass } from "./button-class";
import { useDialogClose } from "./edit-dialog";

type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const INITIAL: ActionState = { ok: true, message: "" };

/**
 * Server action'a bağlı form. Başarılı kayıttan sonra form temizlenir
 * (`keep` ile belirtilen alanlar — ör. tarih — korunur) ve kısa bir mesaj görünür.
 */
export function ActionForm({ action, children, className, keep = [], resetOnSuccess = true, onSuccess }: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  keep?: string[];
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const ref = useRef<HTMLFormElement>(null);
  const lastAt = useRef<number | undefined>(undefined);
  const closeDialog = useDialogClose(); // düzenleme penceresindeyse kayıttan sonra kapanır

  useEffect(() => {
    if (!state.at || state.at === lastAt.current) return;
    lastAt.current = state.at;
    if (!state.ok || !ref.current) return;
    if (resetOnSuccess) {
      const saved = keep.map((n) => [n, (ref.current!.elements.namedItem(n) as HTMLInputElement | null)?.value] as const);
      ref.current.reset();
      for (const [n, v] of saved) {
        const el = ref.current.elements.namedItem(n) as HTMLInputElement | null;
        if (el && v !== undefined) el.value = v;
      }
      (ref.current.querySelector("[data-autofocus]") as HTMLElement | null)?.focus();
    }
    onSuccess?.();
    closeDialog?.();
  }, [state, keep, resetOnSuccess, onSuccess, closeDialog]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={cn("flex items-center gap-1.5 text-[13px]", state.ok ? "text-success" : "text-danger")} style={{ gridColumn: "1 / -1" }}>
      {state.ok ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <CircleAlert className="size-4 shrink-0" aria-hidden />}
      {state.message}
    </p>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

const control = "h-9 w-full min-w-0 rounded-md border border-hairline-strong bg-surface px-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15";

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...p} />;
}

export function NumberInput({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input inputMode="decimal" autoComplete="off" className={cn(control, "num text-right", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "pr-7", className)} {...p}>{children}</select>;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "h-auto min-h-16 py-2", className)} {...p} />;
}

export function SubmitButton({ children, className, variant = "primary" }: { children: React.ReactNode; className?: string; variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(buttonClass(variant), className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** İki adımlı silme: ilk tıkta onay sorar, tarayıcı diyaloğu açmaz. */
export function DeleteButton({ action, label = "Sil", confirmLabel = "Emin misiniz?" }: {
  action: () => Promise<ActionState>;
  label?: string;
  confirmLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!asking)
    return (
      <button type="button" onClick={() => { setAsking(true); setError(null); }} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted hover:bg-danger-soft hover:text-danger" aria-label={label} title={label}>
        <Trash2 className="size-3.5" aria-hidden />
        {error && <span className="text-danger">{error}</span>}
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
      <span className="text-muted">{confirmLabel}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await action();
          setAsking(false);
          if (!r.ok) setError(r.message);
        })}
        className="rounded bg-danger px-2 py-0.5 font-medium text-white"
      >
        {pending ? "…" : "Evet, sil"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="rounded px-1.5 py-0.5 text-muted hover:bg-surface-alt">Vazgeç</button>
    </span>
  );
}

/** Seçilince hemen kaydeden açılır liste (ör. firma ataması). */
export function AutoSaveSelect({ value, options, onSave, className, ariaLabel }: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => Promise<ActionState>;
  className?: string;
  ariaLabel: string;
}) {
  const [pending, start] = useTransition();
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); } // sunucudan yeni değer gelince eşitle
  return (
    <select
      aria-label={ariaLabel}
      value={v}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        start(async () => { await onSave(next); });
      }}
      className={cn("h-7 rounded-md border border-hairline-strong bg-surface px-1.5 text-xs text-ink", pending && "opacity-60", className)}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
