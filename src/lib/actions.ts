"use server";

import { refresh } from "next/cache";
import { KURUM_ID, mutate, newId, resetStore } from "@/lib/data/repo";
import { contractFor, monthOf, seasonOfMonth } from "@/lib/domain/calc";
import type { Customer, Dataset, Fire, FirmId, Product } from "@/lib/domain/types";
import { fmtKg } from "@/lib/format";

export interface ActionState {
  ok: boolean;
  message: string;
  /** Her gönderimde değişir; istemci formu bununla sıfırlar. */
  at?: number;
}

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionState => ({ ok: false, message, at: Date.now() });

/** "1.250,5" · "1250.5" · "1250" → sayı. Boş/geçersiz → null. */
function num(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  let s = String(v).trim().replace(/\s|₺|kg/gi, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
const str = (v: FormDataEntryValue | null) => {
  const s = v === null ? "" : String(v).trim();
  return s || null;
};
const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMonth = (s: string | null): s is string => !!s && /^\d{4}-\d{2}$/.test(s);
const slug = (s: string) =>
  s.toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function run(fn: (ds: Dataset) => ActionState): ActionState {
  try {
    let result: ActionState = fail("İşlem yapılmadı");
    mutate((ds) => {
      result = fn(ds);
      if (!result.ok) throw new Abort(result);
    });
    refresh();
    return result;
  } catch (e) {
    if (e instanceof Abort) return e.state;
    console.error(e);
    return fail("Kayıt sırasında bir hata oluştu.");
  }
}
class Abort extends Error {
  constructor(public state: ActionState) { super(state.message); }
}

/* ------------------------------------------------------------------ */
/* Satış (sevkiyat) — Excel'de ay sayfasındaki ürün kolonuna kg yazmak */

export async function addSale(_: ActionState, fd: FormData): Promise<ActionState> {
  const date = str(fd.get("date"));
  const productId = str(fd.get("productId"));
  const kg = num(fd.get("kg"));
  const seller = fd.get("seller") === "halis" ? "halis" : "kurum";
  const price = num(fd.get("salePrice"));
  const firm = str(fd.get("firmId")) as FirmId | null;
  if (!isDate(date)) return fail("Tarih seçin.");
  if (!productId) return fail("Ürün seçin.");
  if (!kg || kg <= 0) return fail("Kilo 0'dan büyük olmalı.");
  if (price !== null && price <= 0) return fail("Fiyat 0'dan büyük olmalı.");
  if (seller === "halis" && price === null) return fail("Halis'in satış fiyatını girin.");

  return run((ds) => {
    const contract = contractFor(ds, productId, date);
    const product = ds.products.find((p) => p.id === productId);
    if (!product) return fail("Ürün bulunamadı.");
    if (!contract) {
      const season = seasonOfMonth(ds, monthOf(date));
      return fail(`${product.name} için ${season?.name ?? "bu tarihte"} sözleşme yok. Önce Sözleşmeler'den ekleyin.`);
    }
    const month = monthOf(date);
    const assigned = ds.assignments.find((a) => a.month === month && a.productId === productId);
    if (!assigned && seller === "kurum") {
      if (firm !== "ecrin" && firm !== "guzel") return fail(`${product.name} bu ay hiçbir firmaya atanmamış — firmayı seçin.`);
      ds.assignments.push({ month, productId, firmId: firm });
    }
    const customerId = seller === "kurum" ? KURUM_ID : str(fd.get("customerId"));
    ds.deliveries.push({
      id: newId("d"),
      date,
      seller,
      customerId,
      productId,
      contractId: contract.id,
      kg,
      salePrice: price ?? contract.salePrice,
      note: str(fd.get("note")),
    });
    return ok(`${product.name} · ${fmtKg(kg)} kaydedildi${seller === "halis" ? " (Halis)" : ""}.`);
  });
}

/**
 * Satış düzeltme. Ürün ya da tarih değişirse doğru sözleşme yeniden bulunur;
 * kalan, ciro, kâr ve firma tabloları hesaplandığı için kendiliğinden düzelir.
 */
export async function updateSale(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const date = str(fd.get("date"));
  const productId = str(fd.get("productId"));
  const kg = num(fd.get("kg"));
  const seller = fd.get("seller") === "halis" ? "halis" : "kurum";
  const price = num(fd.get("salePrice"));
  if (!id) return fail("Kayıt bulunamadı.");
  if (!isDate(date)) return fail("Tarih seçin.");
  if (!productId) return fail("Ürün seçin.");
  if (!kg || kg <= 0) return fail("Kilo 0'dan büyük olmalı.");
  if (price === null || price <= 0) return fail("Fiyatı girin.");

  return run((ds) => {
    const d = ds.deliveries.find((x) => x.id === id);
    if (!d) return fail("Kayıt bulunamadı.");
    const product = ds.products.find((p) => p.id === productId);
    if (!product) return fail("Ürün bulunamadı.");
    // Aynı ürün ve aynı dönemde kalıyorsa mevcut sözleşme korunur (devir sözleşmeleri bozulmasın)
    const sameSeason = seasonOfMonth(ds, monthOf(d.date))?.id === seasonOfMonth(ds, monthOf(date))?.id;
    const contract = d.productId === productId && sameSeason
      ? ds.contracts.find((c) => c.id === d.contractId) ?? contractFor(ds, productId, date)
      : contractFor(ds, productId, date);
    if (!contract) return fail(`${product.name} için bu tarihte sözleşme yok. Önce Sözleşmeler'den ekleyin.`);
    const month = monthOf(date);
    if (seller === "kurum" && !ds.assignments.some((a) => a.month === month && a.productId === productId)) {
      const firm = str(fd.get("firmId"));
      if (firm !== "ecrin" && firm !== "guzel") return fail(`${product.name} bu ay hiçbir firmaya atanmamış — firmayı seçin.`);
      ds.assignments.push({ month, productId, firmId: firm });
    }
    Object.assign(d, {
      date,
      productId,
      contractId: contract.id,
      kg,
      seller,
      salePrice: price,
      customerId: seller === "kurum" ? KURUM_ID : str(fd.get("customerId")),
      note: str(fd.get("note")),
    });
    return ok(`${product.name} · ${fmtKg(kg)} güncellendi.`);
  });
}

export async function deleteSale(id: string): Promise<ActionState> {
  return run((ds) => {
    const i = ds.deliveries.findIndex((d) => d.id === id);
    if (i < 0) return fail("Kayıt bulunamadı.");
    ds.deliveries.splice(i, 1);
    return ok("Satış silindi.");
  });
}

/* ------------------------------------------------------------------ */
/* Fire & iade */

export async function addFire(_: ActionState, fd: FormData): Promise<ActionState> {
  const month = str(fd.get("month"));
  const productId = str(fd.get("productId"));
  const kg = num(fd.get("kg"));
  const price = num(fd.get("price"));
  const reason = (str(fd.get("reason")) ?? "fire") as Fire["reason"];
  if (!isMonth(month)) return fail("Ay seçin.");
  if (!productId) return fail("Ürün seçin.");
  if (!kg || kg <= 0) return fail("Kilo 0'dan büyük olmalı.");
  if (price === null || price < 0) return fail("₺/kg girin.");
  return run((ds) => {
    ds.fires.push({ id: newId("f"), month, productId, kg, price, reason, note: str(fd.get("note")) ?? `${kg}*${price}` });
    return ok("Kayıt eklendi.");
  });
}

export async function updateFire(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const month = str(fd.get("month"));
  const productId = str(fd.get("productId"));
  const kg = num(fd.get("kg"));
  const price = num(fd.get("price"));
  const reason = (str(fd.get("reason")) ?? "fire") as Fire["reason"];
  if (!id) return fail("Kayıt bulunamadı.");
  if (!isMonth(month)) return fail("Ay seçin.");
  if (!productId) return fail("Ürün seçin.");
  if (!kg || kg <= 0) return fail("Kilo 0'dan büyük olmalı.");
  if (price === null || price < 0) return fail("₺/kg girin.");
  return run((ds) => {
    const f = ds.fires.find((x) => x.id === id);
    if (!f) return fail("Kayıt bulunamadı.");
    Object.assign(f, { month, productId, kg, price, reason, note: str(fd.get("note")) });
    return ok("Kayıt güncellendi.");
  });
}

export async function deleteFire(id: string): Promise<ActionState> {
  return run((ds) => {
    const i = ds.fires.findIndex((f) => f.id === id);
    if (i < 0) return fail("Kayıt bulunamadı.");
    ds.fires.splice(i, 1);
    return ok("Kayıt silindi.");
  });
}

/* ------------------------------------------------------------------ */
/* Masraflar */

export async function addExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const month = str(fd.get("month"));
  const label = str(fd.get("label"));
  const amount = num(fd.get("amount"));
  if (!isMonth(month)) return fail("Ay seçin.");
  if (!label) return fail("Masraf adını yazın.");
  if (!amount || amount <= 0) return fail("Tutar 0'dan büyük olmalı.");
  return run((ds) => {
    ds.expenses.push({ id: newId("e"), month, label, amount });
    return ok(`${label} eklendi.`);
  });
}

export async function updateExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const month = str(fd.get("month"));
  const label = str(fd.get("label"));
  const amount = num(fd.get("amount"));
  if (!id) return fail("Kayıt bulunamadı.");
  if (!isMonth(month)) return fail("Ay seçin.");
  if (!label) return fail("Masraf adını yazın.");
  if (!amount || amount <= 0) return fail("Tutar 0'dan büyük olmalı.");
  return run((ds) => {
    const e = ds.expenses.find((x) => x.id === id);
    if (!e) return fail("Kayıt bulunamadı.");
    Object.assign(e, { month, label, amount });
    return ok(`${label} güncellendi.`);
  });
}

export async function deleteExpense(id: string): Promise<ActionState> {
  return run((ds) => {
    const i = ds.expenses.findIndex((e) => e.id === id);
    if (i < 0) return fail("Kayıt bulunamadı.");
    ds.expenses.splice(i, 1);
    return ok("Masraf silindi.");
  });
}

/** Önceki ayın masraf kalemlerini (Halis, elemanlar …) bu aya kopyalar. */
export async function copyExpenses(month: string, fromMonth: string): Promise<ActionState> {
  return run((ds) => {
    const src = ds.expenses.filter((e) => e.month === fromMonth);
    if (!src.length) return fail("Kopyalanacak masraf yok.");
    for (const e of src) ds.expenses.push({ id: newId("e"), month, label: e.label, amount: e.amount });
    return ok(`${src.length} kalem kopyalandı.`);
  });
}

/* ------------------------------------------------------------------ */
/* Müşteriler */

export async function saveCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  if (!name) return fail("Müşteri adını yazın.");
  const data: Omit<Customer, "id"> = {
    name,
    kind: (str(fd.get("kind")) ?? "esnaf") as Customer["kind"],
    il: str(fd.get("il")),
    ilce: str(fd.get("ilce")),
    phone: str(fd.get("phone")),
    note: str(fd.get("note")),
  };
  return run((ds) => {
    if (id) {
      const c = ds.customers.find((x) => x.id === id);
      if (!c) return fail("Müşteri bulunamadı.");
      Object.assign(c, data);
      return ok("Müşteri güncellendi.");
    }
    ds.customers.push({ id: newId("c"), ...data });
    return ok(`${name} eklendi.`);
  });
}

export async function deleteCustomer(id: string): Promise<ActionState> {
  return run((ds) => {
    if (id === KURUM_ID) return fail("Sözleşmeli kurum silinemez.");
    if (ds.deliveries.some((d) => d.customerId === id)) return fail("Bu müşterinin satışları var; önce satışları silin.");
    ds.customers = ds.customers.filter((c) => c.id !== id);
    return ok("Müşteri silindi.");
  });
}

/* ------------------------------------------------------------------ */
/* Sözleşmeler */

export async function saveContract(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const productId = str(fd.get("productId"));
  const seasonId = str(fd.get("seasonId"));
  const contractKg = num(fd.get("contractKg"));
  const salePrice = num(fd.get("salePrice"));
  if (contractKg === null || contractKg < 0) return fail("Sözleşme kilosunu girin.");
  if (!salePrice || salePrice <= 0) return fail("Satış fiyatını girin.");
  return run((ds) => {
    if (id) {
      const c = ds.contracts.find((x) => x.id === id);
      if (!c) return fail("Sözleşme bulunamadı.");
      c.contractKg = contractKg;
      // Fiyat değişirse geçmiş teslimler kendi fiyatını korur (delivery.salePrice)
      c.salePrice = salePrice;
      return ok("Sözleşme güncellendi. Geçmiş teslimler eski fiyatını korur.");
    }
    if (!productId || !seasonId) return fail("Ürün ve dönem seçin.");
    if (ds.contracts.some((c) => c.productId === productId && c.seasonId === seasonId && !c.id.startsWith("onceki")))
      return fail("Bu ürünün bu dönemde zaten sözleşmesi var.");
    const base = `${seasonId}-${productId}`;
    const cid = ds.contracts.some((c) => c.id === base) ? newId(`${base}-`) : base;
    ds.contracts.push({ id: cid, productId, seasonId, contractKg, salePrice });
    return ok("Sözleşme eklendi.");
  });
}

export async function deleteContract(id: string): Promise<ActionState> {
  return run((ds) => {
    if (ds.deliveries.some((d) => d.contractId === id)) return fail("Bu sözleşmeye bağlı teslimler var; silinemez.");
    ds.contracts = ds.contracts.filter((c) => c.id !== id);
    return ok("Sözleşme silindi.");
  });
}

/* ------------------------------------------------------------------ */
/* Ürünler, firma ataması, alış fiyatı */

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  const category = (str(fd.get("category")) ?? "sebze") as Product["category"];
  if (!name) return fail("Ürün adını yazın.");
  return run((ds) => {
    if (id) {
      const p = ds.products.find((x) => x.id === id);
      if (!p) return fail("Ürün bulunamadı.");
      p.name = name;
      p.category = category;
      return ok("Ürün güncellendi.");
    }
    const pid = slug(name);
    if (!pid) return fail("Geçerli bir ad yazın.");
    if (ds.products.some((p) => p.id === pid || p.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR")))
      return fail("Bu ürün zaten var.");
    ds.products.push({ id: pid, name, category, unit: "kg", active: true });
    return ok(`${name} eklendi.`);
  });
}

export async function toggleProduct(id: string): Promise<ActionState> {
  return run((ds) => {
    const p = ds.products.find((x) => x.id === id);
    if (!p) return fail("Ürün bulunamadı.");
    p.active = !p.active;
    return ok(p.active ? `${p.name} yeniden kullanımda.` : `${p.name} pasife alındı.`);
  });
}

export async function setAssignment(month: string, productId: string, firmId: string): Promise<ActionState> {
  if (!isMonth(month)) return fail("Geçersiz ay.");
  if (firmId !== "" && firmId !== "ecrin" && firmId !== "guzel") return fail("Geçersiz firma.");
  return run((ds) => {
    ds.assignments = ds.assignments.filter((a) => !(a.month === month && a.productId === productId));
    if (firmId) ds.assignments.push({ month, productId, firmId: firmId as FirmId });
    return ok("Firma ataması kaydedildi.");
  });
}

export async function setPurchasePrice(_: ActionState, fd: FormData): Promise<ActionState> {
  const month = str(fd.get("month"));
  const productId = str(fd.get("productId"));
  const price = num(fd.get("purchasePrice"));
  if (!isMonth(month) || !productId) return fail("Ay ve ürün gerekli.");
  if (price !== null && price < 0) return fail("Fiyat negatif olamaz.");
  return run((ds) => {
    ds.purchasePrices = ds.purchasePrices.filter((p) => !(p.month === month && p.productId === productId));
    if (price !== null) ds.purchasePrices.push({ month, productId, purchasePrice: price });
    return ok(price === null ? "Alış fiyatı kaldırıldı." : "Alış fiyatı kaydedildi.");
  });
}

/* ------------------------------------------------------------------ */
/* Ayarlar */

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const rate = (k: string) => {
    const n = num(fd.get(k));
    return n === null ? null : n / 100;
  };
  const stopajRate = rate("stopaj"), advanceTaxRate = rate("advanceTax"), kdvRate = rate("kdv");
  if ([stopajRate, advanceTaxRate, kdvRate].some((x) => x === null || x < 0 || x > 1)) return fail("Oranlar 0 ile 100 arasında olmalı.");
  return run((ds) => {
    ds.settings = { stopajRate: stopajRate!, advanceTaxRate: advanceTaxRate!, kdvRate: kdvRate! };
    return ok("Oranlar kaydedildi; tüm hesaplar yeniden yapıldı.");
  });
}

export async function resetData(_: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("confirm") !== "SIFIRLA") return fail("Onay için kutuya SIFIRLA yazın.");
  try {
    resetStore();
  } catch (e) {
    console.error(e);
    return fail("Sıfırlanamadı.");
  }
  refresh();
  return ok("Veriler Excel'deki ilk hâline döndü.");
}
