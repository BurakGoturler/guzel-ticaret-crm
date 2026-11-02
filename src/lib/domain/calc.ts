import type { Contract, Dataset, Delivery, FirmId } from "./types";

/** Para hesaplarında kuruş kayması olmasın diye 2 haneye yuvarlar. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const sumBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

/** Verisi olan aylar (sevkiyat ya da firma ataması). `upTo` verilirse o aydan sonrası gösterilmez. */
export function monthsWithData(ds: Dataset, upTo?: string): string[] {
  const set = new Set([...ds.deliveries.map((d) => monthOf(d.date)), ...ds.assignments.map((a) => a.month)]);
  if (upTo) set.add(upTo);
  return [...set].filter((m) => !upTo || m <= upTo).sort();
}

export function seasonOfMonth(ds: Dataset, month: string) {
  const day = `${month}-15`;
  return ds.seasons.find((s) => s.start <= day && day <= s.end) ?? null;
}

export function firmOf(ds: Dataset, month: string, productId: string): FirmId | null {
  return ds.assignments.find((a) => a.month === month && a.productId === productId)?.firmId ?? null;
}

export function purchasePriceOf(ds: Dataset, month: string, productId: string): number | null {
  return ds.purchasePrices.find((p) => p.month === month && p.productId === productId)?.purchasePrice ?? null;
}

export function salePriceOf(ds: Dataset, d: Delivery) {
  return d.salePrice ?? ds.contracts.find((c) => c.id === d.contractId)?.salePrice ?? 0;
}

export const productName = (ds: Dataset, id: string) => ds.products.find((p) => p.id === id)?.name ?? id;

/** Bir ürünün o tarihteki sözleşmesi (tarihin düştüğü dönem; "önceki" devir sözleşmeleri son tercih). */
export function contractFor(ds: Dataset, productId: string, date: string): Contract | null {
  const season = seasonOfMonth(ds, monthOf(date));
  const list = ds.contracts.filter((c) => c.productId === productId && (!season || c.seasonId === season.id));
  return list.find((c) => !c.id.startsWith("onceki")) ?? list[0] ?? null;
}

const isKurum = (d: Delivery) => d.seller !== "halis";

export interface ProductLine {
  productId: string;
  productName: string;
  contractId: string;
  firmId: FirmId | null;
  /** Kuruma teslim edilen kg (firma faturasına giren). */
  kg: number;
  salePrice: number;
  revenue: number;
  purchasePrice: number | null;
  cost: number;
  profit: number;
  marginPerKg: number | null;
  contractKg: number;
  /** Halis'in bu ay aynı sözleşme malından sattığı kg (kalandan düşer). */
  halisKg: number;
  /** Bu ay dahil, sözleşmeden bugüne kadar çıkan toplam (kurum + Halis). */
  deliveredToDate: number;
  /** Ay başında devreden kalan (Excel'de B8'in bir önceki aydan gelmesi gereken değer). */
  openingRemaining: number;
  remaining: number;
  deliveryDays: number;
}

/** Tek bir sözleşmenin bir aydaki satırı — Excel ay sayfasındaki bir ürün sütunu. */
export function lineFor(ds: Dataset, month: string, contractId: string, productId?: string): ProductLine {
  const contract = ds.contracts.find((c) => c.id === contractId);
  const pid = contract?.productId ?? productId ?? contractId;
  const all = ds.deliveries.filter((d) => d.contractId === contractId);
  const inMonth = all.filter((d) => monthOf(d.date) === month);
  const rows = inMonth.filter(isKurum);
  const kg = sumBy(rows, (d) => d.kg);
  const halisKg = sumBy(inMonth.filter((d) => !isKurum(d)), (d) => d.kg);
  const revenue = r2(sumBy(rows, (d) => d.kg * salePriceOf(ds, d)));
  const pp = purchasePriceOf(ds, month, pid);
  const cost = pp === null ? 0 : r2(kg * pp);
  const before = sumBy(all.filter((d) => monthOf(d.date) < month), (d) => d.kg);
  const contractKg = contract?.contractKg ?? 0;
  const salePrice = kg ? revenue / kg : (contract?.salePrice ?? 0);
  return {
    productId: pid,
    productName: productName(ds, pid),
    contractId,
    firmId: firmOf(ds, month, pid),
    kg,
    salePrice,
    revenue,
    purchasePrice: pp,
    cost,
    profit: r2(revenue - cost),
    marginPerKg: pp === null ? null : salePrice - pp,
    contractKg,
    halisKg,
    deliveredToDate: before + kg + halisKg,
    openingRemaining: contractKg - before,
    remaining: contractKg - before - kg - halisKg,
    deliveryDays: new Set(rows.map((d) => d.date)).size,
  };
}

/** Bir aydaki kuruma teslim satırları (yalnız teslim olan sözleşmeler). */
export function productLines(ds: Dataset, month: string): ProductLine[] {
  const ids = [...new Set(ds.deliveries.filter((d) => monthOf(d.date) === month && isKurum(d)).map((d) => d.contractId))];
  return ids.map((cid) => lineFor(ds, month, cid)).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Ürün panosu: o ayın dönemindeki tüm sözleşmeler (henüz teslim olmayanlar dahil)
 * + o ay teslim olan diğer sözleşmeler. Ana sayfadaki ürün listesi bundan çizilir.
 */
export function productBoard(ds: Dataset, month: string): ProductLine[] {
  const season = seasonOfMonth(ds, month);
  const ids = new Set([
    ...ds.contracts.filter((c) => c.seasonId === season?.id).map((c) => c.id),
    ...ds.deliveries.filter((d) => monthOf(d.date) === month).map((d) => d.contractId),
  ]);
  return [...ids]
    .map((cid) => lineFor(ds, month, cid))
    .sort((a, b) => b.revenue - a.revenue || b.contractKg * b.salePrice - a.contractKg * a.salePrice);
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

export interface HalisLine {
  productId: string;
  productName: string;
  kg: number;
  revenue: number;
  avgPrice: number;
  /** Sözleşme fiyatıyla kuruma satılsaydı elde edilecek ciro — fiyat farkını gösterir. */
  contractRevenue: number;
  purchasePrice: number | null;
  cost: number;
  profit: number;
  sales: number;
}

export interface HalisTotals {
  kg: number;
  revenue: number;
  cost: number;
  profit: number;
  priceDiff: number;
  lines: HalisLine[];
}

export function halisSummary(ds: Dataset, month: string): HalisTotals {
  const rows = ds.deliveries.filter((d) => d.seller === "halis" && monthOf(d.date) === month);
  const pids = [...new Set(rows.map((d) => d.productId))];
  const lines = pids
    .map((pid): HalisLine => {
      const rs = rows.filter((d) => d.productId === pid);
      const kg = sumBy(rs, (d) => d.kg);
      const revenue = r2(sumBy(rs, (d) => d.kg * salePriceOf(ds, d)));
      const contractRevenue = r2(sumBy(rs, (d) => d.kg * (ds.contracts.find((c) => c.id === d.contractId)?.salePrice ?? 0)));
      const pp = purchasePriceOf(ds, month, pid);
      const cost = pp === null ? 0 : r2(kg * pp);
      return { productId: pid, productName: productName(ds, pid), kg, revenue, avgPrice: kg ? revenue / kg : 0, contractRevenue, purchasePrice: pp, cost, profit: r2(revenue - cost), sales: rs.length };
    })
    .sort((a, b) => b.revenue - a.revenue);
  return {
    kg: sumBy(lines, (l) => l.kg),
    revenue: r2(sumBy(lines, (l) => l.revenue)),
    cost: r2(sumBy(lines, (l) => l.cost)),
    profit: r2(sumBy(lines, (l) => l.profit)),
    priceDiff: r2(sumBy(lines, (l) => l.revenue - l.contractRevenue)),
    lines,
  };
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
  /** Halis'in kendi satışlarından brüt kâr (net kâra eklenir). */
  halisProfit: number;
  netProfit: number;
  netMargin: number;
  kdv: number;
  firms: FirmTotals[];
  halis: HalisTotals;
  unassignedRevenue: number;
}

export function monthSummary(ds: Dataset, month: string): MonthSummary {
  const lines = productLines(ds, month);
  const { stopajRate, advanceTaxRate, kdvRate } = ds.settings;
  const sum = (f: (l: ProductLine) => number, ls = lines) => r2(sumBy(ls, f));

  const revenue = sum((l) => l.revenue);
  const cost = sum((l) => l.cost);
  const fires = ds.fires.filter((f) => f.month === month);
  const fireLoss = r2(sumBy(fires, (f) => f.kg * f.price));
  const expenses = ds.expenses.filter((e) => e.month === month).map(({ label, amount }) => ({ label, amount }));
  const expenseTotal = r2(sumBy(expenses, (e) => e.amount));
  // Stopaj ve peşin vergi kurumun ödediği faturadan kesilir → yalnız kurum cirosu üzerinden
  const stopaj = r2(revenue * stopajRate);
  const advanceTax = r2(revenue * advanceTaxRate);
  const grossProfit = r2(revenue - cost);
  const deductions = r2(fireLoss + stopaj + advanceTax + expenseTotal);
  const halis = halisSummary(ds, month);
  const netProfit = r2(grossProfit + halis.profit - deductions);

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
    fireKg: sumBy(fires, (f) => f.kg),
    stopaj,
    advanceTax,
    expenses,
    expenseTotal,
    deductions,
    halisProfit: halis.profit,
    netProfit,
    netMargin: revenue + halis.revenue ? netProfit / (revenue + halis.revenue) : 0,
    kdv: r2(revenue * kdvRate),
    firms,
    halis,
    unassignedRevenue: sum((l) => l.revenue, lines.filter((l) => l.firmId === null)),
  };
}

/** Bir aydaki günlük sevkiyat, firmaya göre kg (Halis ayrı). */
export function dailyByFirm(ds: Dataset, month: string) {
  const map = new Map<string, { date: string; ecrin: number; guzel: number; halis: number; diger: number }>();
  for (const d of ds.deliveries) {
    if (monthOf(d.date) !== month) continue;
    const row = map.get(d.date) ?? { date: d.date, ecrin: 0, guzel: 0, halis: 0, diger: 0 };
    if (d.seller === "halis") row.halis += d.kg;
    else row[firmOf(ds, month, d.productId) ?? "diger"] += d.kg;
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
  halisKg: number;
  remaining: number;
  ratio: number;
  revenue: number;
  deliveryCount: number;
}

export function contractProgress(ds: Dataset, seasonId?: string): ContractProgress[] {
  return ds.contracts
    .filter((c) => !seasonId || c.seasonId === seasonId)
    .map((c) => {
      const rows = ds.deliveries.filter((d) => d.contractId === c.id);
      const delivered = sumBy(rows, (d) => d.kg);
      return {
        contractId: c.id,
        productId: c.productId,
        productName: productName(ds, c.productId),
        seasonId: c.seasonId,
        contractKg: c.contractKg,
        salePrice: c.salePrice,
        delivered,
        halisKg: sumBy(rows.filter((d) => d.seller === "halis"), (d) => d.kg),
        remaining: c.contractKg - delivered,
        ratio: c.contractKg ? delivered / c.contractKg : 0,
        revenue: r2(sumBy(rows, (d) => d.kg * salePriceOf(ds, d))),
        deliveryCount: rows.length,
      };
    })
    .sort((a, b) => b.contractKg * b.salePrice - a.contractKg * a.salePrice);
}

/** Ay × ürün firma matrisi: "hangi ay hangi ürünü kim sattı". */
export function firmMatrix(ds: Dataset, months: string[]) {
  const productIds = [...new Set(ds.assignments.filter((a) => months.includes(a.month)).map((a) => a.productId))];
  return productIds.map((pid) => ({
    productId: pid,
    productName: productName(ds, pid),
    cells: months.map((m) => {
      const kg = sumBy(ds.deliveries.filter((d) => d.productId === pid && monthOf(d.date) === m), (d) => d.kg);
      return { month: m, firmId: firmOf(ds, m, pid), kg };
    }),
  }));
}

/** Ürünün ay ay geçmişi — ürün detay sayfası. */
export function productHistory(ds: Dataset, productId: string) {
  const months = [...new Set([
    ...ds.deliveries.filter((d) => d.productId === productId).map((d) => monthOf(d.date)),
    ...ds.assignments.filter((a) => a.productId === productId).map((a) => a.month),
    ...ds.purchasePrices.filter((p) => p.productId === productId).map((p) => p.month),
  ])].sort();
  return months.map((m) => {
    const rows = ds.deliveries.filter((d) => d.productId === productId && monthOf(d.date) === m);
    const kurum = rows.filter(isKurum);
    const halis = rows.filter((d) => !isKurum(d));
    const pp = purchasePriceOf(ds, m, productId);
    const kg = sumBy(kurum, (d) => d.kg);
    const hkg = sumBy(halis, (d) => d.kg);
    const revenue = r2(sumBy(kurum, (d) => d.kg * salePriceOf(ds, d)));
    const halisRevenue = r2(sumBy(halis, (d) => d.kg * salePriceOf(ds, d)));
    const cost = pp === null ? 0 : r2((kg + hkg) * pp);
    const fire = r2(sumBy(ds.fires.filter((f) => f.month === m && f.productId === productId), (f) => f.kg * f.price));
    return { month: m, firmId: firmOf(ds, m, productId), kg, halisKg: hkg, revenue, halisRevenue, purchasePrice: pp, cost, profit: r2(revenue + halisRevenue - cost), fire };
  });
}

export interface CustomerStat {
  customerId: string;
  kg: number;
  revenue: number;
  count: number;
  lastDate: string | null;
}

/** Müşteri bazlı satış özeti. `from` (YYYY-MM-DD) verilirse o tarihten sonrası. */
export function customerStats(ds: Dataset, from = ""): Map<string, CustomerStat> {
  const map = new Map<string, CustomerStat>();
  for (const d of ds.deliveries) {
    if (!d.customerId || (from && d.date < from)) continue;
    const s = map.get(d.customerId) ?? { customerId: d.customerId, kg: 0, revenue: 0, count: 0, lastDate: null };
    s.kg += d.kg;
    s.revenue = r2(s.revenue + d.kg * salePriceOf(ds, d));
    s.count++;
    if (!s.lastDate || d.date > s.lastDate) s.lastDate = d.date;
    map.set(d.customerId, s);
  }
  return map;
}
