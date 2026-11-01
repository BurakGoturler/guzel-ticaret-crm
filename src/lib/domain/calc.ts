import type { Dataset, FirmId } from "./types";

/** Para hesaplarında kuruş kayması olmasın diye 2 haneye yuvarlar. */
const r2 = (n: number) => Math.round(n * 100) / 100;

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function monthsWithData(ds: Dataset): string[] {
  return [...new Set(ds.deliveries.map((d) => monthOf(d.date)))].sort();
}

export function seasonOfMonth(ds: Dataset, month: string) {
  const day = `${month}-15`;
  return ds.seasons.find((s) => s.start <= day && day <= s.end) ?? null;
}

export function firmOf(ds: Dataset, month: string, productId: string): FirmId | null {
  return ds.assignments.find((a) => a.month === month && a.productId === productId)?.firmId ?? null;
}

function purchasePriceOf(ds: Dataset, month: string, productId: string): number | null {
  return ds.purchasePrices.find((p) => p.month === month && p.productId === productId)?.purchasePrice ?? null;
}

function salePriceOf(ds: Dataset, d: Dataset["deliveries"][number]) {
  return d.salePrice ?? ds.contracts.find((c) => c.id === d.contractId)?.salePrice ?? 0;
}

export interface ProductLine {
  productId: string;
  productName: string;
  contractId: string;
  firmId: FirmId | null;
  kg: number;
  salePrice: number;
  revenue: number;
  purchasePrice: number | null;
  cost: number;
  profit: number;
  marginPerKg: number | null;
  contractKg: number;
  /** Bu ay dahil, sözleşmeye bugüne kadar teslim edilen toplam. */
  deliveredToDate: number;
  /** Ay başında devreden kalan (Excel'de B8'in bir önceki aydan gelmesi gereken değer). */
  openingRemaining: number;
  remaining: number;
  deliveryDays: number;
}

/** Bir aydaki ürün satırları — Excel ay sayfasının sütun başına özeti. */
export function productLines(ds: Dataset, month: string): ProductLine[] {
  const inMonth = ds.deliveries.filter((d) => monthOf(d.date) === month);
  const contractIds = [...new Set(inMonth.map((d) => d.contractId))];

  return contractIds
    .map((cid): ProductLine => {
      const rows = inMonth.filter((d) => d.contractId === cid);
      const first = rows[0]!;
      const productId = first.productId;
      const contract = ds.contracts.find((c) => c.id === cid);
      const kg = rows.reduce((s, d) => s + d.kg, 0);
      const revenue = r2(rows.reduce((s, d) => s + d.kg * salePriceOf(ds, d), 0));
      const pp = purchasePriceOf(ds, month, productId);
      const cost = pp === null ? 0 : r2(kg * pp);
      const before = ds.deliveries
        .filter((d) => d.contractId === cid && monthOf(d.date) < month)
        .reduce((s, d) => s + d.kg, 0);
      const contractKg = contract?.contractKg ?? 0;
      const salePrice = kg ? revenue / kg : (contract?.salePrice ?? 0);
      return {
        productId,
        productName: ds.products.find((p) => p.id === productId)?.name ?? productId,
        contractId: cid,
        firmId: firmOf(ds, month, productId),
        kg,
        salePrice,
        revenue,
        purchasePrice: pp,
        cost,
        profit: r2(revenue - cost),
        marginPerKg: pp === null ? null : salePrice - pp,
        contractKg,
        deliveredToDate: before + kg,
        openingRemaining: contractKg - before,
        remaining: contractKg - before - kg,
        deliveryDays: new Set(rows.map((d) => d.date)).size,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export interface FirmTotals {
  firmId: FirmId;
  kg: number;
  revenue: number;
  cost: number;
  profit: number;
  kdv: number;
  /** Fatura toplamı (KDV dahil) — Excel'de "YATMASI GEREKEN" bloğunun tabanı. */
  invoiceTotal: number;
  products: ProductLine[];
}

export interface MonthSummary {
  month: string;
  kg: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  fireLoss: number;
  fireKg: number;
  stopaj: number;
  advanceTax: number;
  expenses: { label: string; amount: number }[];
  expenseTotal: number;
  deductions: number;
  netProfit: number;
  netMargin: number;
  kdv: number;
  firms: FirmTotals[];
  unassignedRevenue: number;
}

export function monthSummary(ds: Dataset, month: string): MonthSummary {
  const lines = productLines(ds, month);
  const { stopajRate, advanceTaxRate, kdvRate } = ds.settings;
  const sum = (f: (l: ProductLine) => number, ls = lines) => r2(ls.reduce((s, l) => s + f(l), 0));

  const revenue = sum((l) => l.revenue);
  const cost = sum((l) => l.cost);
  const fires = ds.fires.filter((f) => f.month === month);
  const fireLoss = r2(fires.reduce((s, f) => s + f.kg * f.price, 0));
  const expenses = ds.expenses.filter((e) => e.month === month).map(({ label, amount }) => ({ label, amount }));
  const expenseTotal = r2(expenses.reduce((s, e) => s + e.amount, 0));
  const stopaj = r2(revenue * stopajRate);
  const advanceTax = r2(revenue * advanceTaxRate);
  const grossProfit = r2(revenue - cost);
  const deductions = r2(fireLoss + stopaj + advanceTax + expenseTotal);
  const netProfit = r2(grossProfit - deductions);

  const firms: FirmTotals[] = ds.firms.map((f) => {
    const ls = lines.filter((l) => l.firmId === f.id);
    const rev = sum((l) => l.revenue, ls);
    const kdv = r2(rev * kdvRate);
    return {
      firmId: f.id,
      kg: sum((l) => l.kg, ls),
      revenue: rev,
      cost: sum((l) => l.cost, ls),
      profit: sum((l) => l.profit, ls),
      kdv,
      invoiceTotal: r2(rev + kdv),
      products: ls,
    };
  });

  return {
    month,
    kg: sum((l) => l.kg),
    revenue,
    cost,
    grossProfit,
    fireLoss,
    fireKg: fires.reduce((s, f) => s + f.kg, 0),
    stopaj,
    advanceTax,
    expenses,
    expenseTotal,
    deductions,
    netProfit,
    netMargin: revenue ? netProfit / revenue : 0,
    kdv: r2(revenue * kdvRate),
    firms,
    unassignedRevenue: sum((l) => l.revenue, lines.filter((l) => l.firmId === null)),
  };
}

/** Bir aydaki günlük sevkiyat, firmaya göre kg. */
export function dailyByFirm(ds: Dataset, month: string) {
  const map = new Map<string, { date: string; ecrin: number; guzel: number; diger: number }>();
  for (const d of ds.deliveries) {
    if (monthOf(d.date) !== month) continue;
    const row = map.get(d.date) ?? { date: d.date, ecrin: 0, guzel: 0, diger: 0 };
    const firm = firmOf(ds, month, d.productId);
    row[firm ?? "diger"] += d.kg;
    map.set(d.date, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ContractProgress {
  contractId: string;
  productId: string;
  productName: string;
  seasonId: string;
  contractKg: number;
  salePrice: number;
  delivered: number;
  remaining: number;
  ratio: number;
  revenue: number;
}

export function contractProgress(ds: Dataset, seasonId?: string): ContractProgress[] {
  return ds.contracts
    .filter((c) => !seasonId || c.seasonId === seasonId)
    .map((c) => {
      const rows = ds.deliveries.filter((d) => d.contractId === c.id);
      const delivered = rows.reduce((s, d) => s + d.kg, 0);
      return {
        contractId: c.id,
        productId: c.productId,
        productName: ds.products.find((p) => p.id === c.productId)?.name ?? c.productId,
        seasonId: c.seasonId,
        contractKg: c.contractKg,
        salePrice: c.salePrice,
        delivered,
        remaining: c.contractKg - delivered,
        ratio: c.contractKg ? delivered / c.contractKg : 0,
        revenue: r2(rows.reduce((s, d) => s + d.kg * salePriceOf(ds, d), 0)),
      };
    })
    .sort((a, b) => b.contractKg * b.salePrice - a.contractKg * a.salePrice);
}

/** Ay × ürün firma matrisi: "hangi ay hangi ürünü kim sattı". */
export function firmMatrix(ds: Dataset, months: string[]) {
  const productIds = [
    ...new Set(ds.assignments.filter((a) => months.includes(a.month)).map((a) => a.productId)),
  ];
  return productIds.map((pid) => ({
    productId: pid,
    productName: ds.products.find((p) => p.id === pid)?.name ?? pid,
    cells: months.map((m) => {
      const kg = ds.deliveries
        .filter((d) => d.productId === pid && monthOf(d.date) === m)
        .reduce((s, d) => s + d.kg, 0);
      return { month: m, firmId: firmOf(ds, m, pid), kg };
    }),
  }));
}
