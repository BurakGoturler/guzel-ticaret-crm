/**
 * Güzel Ticaret alan modeli.
 *
 * Excel karşılıkları (ay sayfası, ör. "ekim 2026"):
 *   Sözleşme (Contract)      → satır 5 (sözleşme kg) + satır 6 (satış fiyatı / kg)
 *   Sevkiyat (Delivery)      → satır 9–22 (tarih A kolonunda, kg ürün kolonunda)
 *   Alış fiyatı              → satır 26 (o ay üreticiden alınan fiyat / kg)
 *   Fire / kasa-dara         → satır 30–31 ("100*20 fire" = 100 kg × 20 ₺)
 *   Masraf                   → satır 34–41 (Halis, elemanlar, ceza …)
 *   Firma ataması            → satır 33+ (ECRİN / GÜZEL tabloları; ürün aya göre firma değiştirir)
 */

export type FirmId = "ecrin" | "guzel";

export interface Firm {
  id: FirmId;
  name: string;
  short: string;
}

export interface Season {
  id: string;
  name: string;
  start: string; // ISO tarih
  end: string;
}

export interface Product {
  id: string;
  name: string;
  category: "sebze" | "meyve";
  unit: "kg";
  active: boolean;
}

export interface Contract {
  id: string;
  productId: string;
  seasonId: string;
  contractKg: number;
  salePrice: number;
}

/** Bir ürünün belirli bir ayda hangi firma üzerinden satıldığı. */
export interface Assignment {
  month: string; // "2026-10"
  productId: string;
  firmId: FirmId;
}

/** Satışı kim yaptı: sözleşmeli kuruma teslim (firma faturası) ya da Halis'in kendi satışı. */
export type Seller = "kurum" | "halis";

export interface Customer {
  id: string;
  name: string;
  kind: "kurum" | "esnaf" | "bireysel";
  il: string | null;
  ilce: string | null;
  phone: string | null;
  note: string | null;
}

export interface Delivery {
  id: string;
  date: string;
  seller: Seller;
  customerId: string | null;
  productId: string;
  contractId: string;
  kg: number;
  /** Teslim anındaki satış fiyatı (sözleşme fiyatı değişirse geçmiş bozulmaz). */
  salePrice: number | null;
  note: string | null;
}

export interface PurchasePrice {
  month: string;
  productId: string;
  purchasePrice: number;
}

export interface Fire {
  id: string;
  month: string;
  productId: string;
  kg: number;
  price: number;
  reason: "fire" | "kasa-dara" | "iade" | "bozuk";
  note: string | null;
}

export interface Expense {
  id: string;
  month: string;
  label: string;
  amount: number;
}

export interface Settings {
  stopajRate: number;
  advanceTaxRate: number;
  kdvRate: number;
}

export interface Dataset {
  source: string;
  generatedAt: string;
  firms: Firm[];
  seasons: Season[];
  products: Product[];
  customers: Customer[];
  contracts: Contract[];
  assignments: Assignment[];
  deliveries: Delivery[];
  purchasePrices: PurchasePrice[];
  fires: Fire[];
  expenses: Expense[];
  settings: Settings;
}
