import { cn } from "@/lib/cn";

export function Kpi({ label, value, hint, tone = "default", className }: {
  label: string; value: string; hint?: React.ReactNode; tone?: "default" | "positive" | "negative"; className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-surface px-4 py-3.5", className)}>
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cn("num mt-1 text-[22px] font-semibold tracking-tight text-ink", tone === "negative" && "text-danger")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
