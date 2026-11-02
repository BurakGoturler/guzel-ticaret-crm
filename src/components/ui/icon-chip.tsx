import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ChipTone = "brand" | "ecrin" | "guzel" | "halis" | "success" | "warning" | "danger";

const TONE: Record<ChipTone, string> = {
  brand: "bg-brand-soft text-brand",
  ecrin: "bg-ecrin-soft text-ecrin",
  guzel: "bg-guzel-soft text-guzel",
  halis: "bg-halis-soft text-halis",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Kart başlıklarındaki renkli ikon kutusu — bölümleri renkle ayırır. */
export function IconChip({ icon: Icon, tone = "brand", className }: { icon: LucideIcon; tone?: ChipTone; className?: string }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONE[tone], className)} aria-hidden>
      <Icon className="size-[18px]" />
    </span>
  );
}
