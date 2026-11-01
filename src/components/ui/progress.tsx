import { cn } from "@/lib/cn";

/** Sözleşme gerçekleşme çubuğu. ratio 0–1. */
export function Progress({ ratio, colorClass = "bg-ink/70", className }: { ratio: number; colorClass?: string; className?: string }) {
  const w = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-alt", className)} role="meter" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${w}%` }} />
    </div>
  );
}
