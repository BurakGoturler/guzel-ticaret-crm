import type { FirmId } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

export const FIRM_META: Record<FirmId, { name: string; short: string; dot: string; soft: string; text: string; color: string }> = {
  ecrin: { name: "Ecrin Yaş Sebze Meyve", short: "Ecrin", dot: "bg-ecrin", soft: "bg-ecrin-soft", text: "text-ecrin", color: "var(--firm-ecrin)" },
  guzel: { name: "Güzel Ticaret", short: "Güzel", dot: "bg-guzel", soft: "bg-guzel-soft", text: "text-guzel", color: "var(--firm-guzel)" },
};

export function FirmBadge({ firm, className }: { firm: FirmId | null; className?: string }) {
  if (!firm)
    return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted", className)}>Atanmamış</span>;
  const m = FIRM_META[firm];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-ink", m.soft, className)}>
      <span className={cn("size-2 rounded-full", m.dot)} aria-hidden />
      {m.short}
    </span>
  );
}

export const HALIS_META = { name: "Halis", dot: "bg-halis", soft: "bg-halis-soft", text: "text-halis", color: "var(--halis)" };

export function HalisBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-halis-soft px-2 py-0.5 text-xs font-medium text-ink", className)}>
      <span className="size-2 rounded-full bg-halis" aria-hidden />
      Halis
    </span>
  );
}
