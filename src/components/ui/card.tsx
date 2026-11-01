import { cn } from "@/lib/cn";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-hairline bg-surface", className)} {...p} />;
}

export function CardHeader({ title, subtitle, action, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
