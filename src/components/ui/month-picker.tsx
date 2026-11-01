import Link from "next/link";
import { cn } from "@/lib/cn";
import { monthShort } from "@/lib/format";

export function MonthPicker({ months, current, basePath = "/" }: { months: string[]; current: string; basePath?: string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-hairline bg-surface p-1" role="tablist" aria-label="Ay seçimi">
      {months.map((m) => (
        <Link
          key={m}
          role="tab"
          aria-selected={m === current}
          href={`${basePath}?ay=${m}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] transition-colors",
            m === current ? "bg-brand font-medium text-white" : "text-body hover:bg-surface-alt",
          )}
        >
          {monthShort(m)} <span className="opacity-60">{m.slice(2, 4)}</span>
        </Link>
      ))}
    </div>
  );
}
