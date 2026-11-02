import type { Customer } from "@/lib/domain/types";

export const CUSTOMER_KIND: Record<Customer["kind"], string> = {
  kurum: "Sözleşmeli kurum",
  esnaf: "Esnaf / manav",
  bireysel: "Kişi",
};
