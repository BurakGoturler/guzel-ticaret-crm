import { PageHeader } from "./page-header";

export function ComingSoon({ title, excel, items }: { title: string; excel: string; items: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle="Bu ekran sıradaki adımlarda yapılacak" />
      <div className="max-w-2xl rounded-xl border border-dashed border-hairline-strong bg-surface p-6 text-[14px] text-body">
        <p className="text-ink"><b className="font-semibold">Excel karşılığı:</b> {excel}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      </div>
    </>
  );
}
