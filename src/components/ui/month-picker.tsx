import Link from "next/link";
import { cn } from "@/lib/cn";
import { monthShort } from "@/lib/format";

export function MonthPicker({ months, current, basePath = "/", extra = "", tone = "light" }: { months: string[]; current: string; basePath?: string; extra?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-lg p-1", tone === "dark" ? "bg-white/10" : "border border-hairline bg-surface")} role="tablist" aria-label="Ay seçimi">
      {months.map((m) => (
        <Link
          key={m}
          role="tab"
          aria-selected={m === current}
          href={`${basePath}?ay=${m}${extra}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] transition-colors",
            tone === "dark"
              ? m === current ? "bg-white font-medium text-shell" : "text-white/75 hover:bg-white/10 hover:text-white"
              : m === current ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt",
          )}
        >
          {monthShort(m)} <span className="opacity-60">{m.slice(2, 4)}</span>
        </Link>
      ))}
    </div>
  );
}
