import { cn } from "@/lib/cn";

/** Düğme sınıfları — sunucu ve istemci bileşenlerinde ortak. */
export function buttonClass(variant: "primary" | "secondary" | "danger" | "ghost" = "primary", size: "md" | "sm" = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-60",
    size === "md" ? "h-9 px-3.5 text-[14px]" : "h-7 px-2.5 text-[13px]",
    variant === "primary" && "bg-brand text-white hover:bg-brand-hover",
    variant === "secondary" && "border border-hairline-strong bg-surface text-ink hover:bg-surface-alt",
    variant === "danger" && "bg-danger text-white hover:opacity-90",
    variant === "ghost" && "text-body hover:bg-surface-alt",
  );
}
