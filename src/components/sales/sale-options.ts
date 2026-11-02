import type { Dataset, FirmId } from "@/lib/domain/types";

/**
 * Satış formunun istemcide ihtiyaç duyduğu özet: ürünler, her ürünün dönem
 * sözleşme fiyatı ve ay bazlı firma ataması. Sunucuda hesaplanıp forma verilir.
 */
export interface SaleOptions {
  products: { id: string; name: string }[];
  customers: { id: string; name: string; il: string | null }[];
  seasons: { id: string; start: string; end: string }[];
  /** "seasonId|productId" → sözleşme ₺/kg */
  prices: Record<string, number>;
  /** "YYYY-MM|productId" → firma */
  firms: Record<string, FirmId>;
}

export function saleOptions(ds: Dataset): SaleOptions {
  const prices: Record<string, number> = {};
  for (const c of ds.contracts) {
    const key = `${c.seasonId}|${c.productId}`;
    if (!(key in prices) || !c.id.startsWith("onceki")) prices[key] = c.salePrice;
  }
  const firms: Record<string, FirmId> = {};
  for (const a of ds.assignments) firms[`${a.month}|${a.productId}`] = a.firmId;
  const withContract = new Set(ds.contracts.map((c) => c.productId));
  return {
    products: ds.products.filter((p) => p.active && withContract.has(p.id)).map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name, "tr")),
    customers: ds.customers.filter((c) => c.kind !== "kurum").map((c) => ({ id: c.id, name: c.name, il: c.il })),
    seasons: ds.seasons.map(({ id, start, end }) => ({ id, start, end })),
    prices,
    firms,
  };
}
