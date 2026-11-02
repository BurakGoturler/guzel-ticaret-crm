import { monthOf, monthsWithData } from "@/lib/domain/calc";
import type { Dataset } from "@/lib/domain/types";
import { todayISO } from "@/lib/format";

/** URL'deki ?ay parametresini doğrular; yoksa içinde bulunulan ay. */
export function resolveMonth(ds: Dataset, ay: string | undefined) {
  const today = todayISO();
  const months = monthsWithData(ds, monthOf(today));
  const month = ay && months.includes(ay) ? ay : months[months.length - 1]!;
  return { today, months, month };
}
