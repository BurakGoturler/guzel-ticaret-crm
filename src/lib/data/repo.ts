import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import seed from "@/data/seed.json";
import type { Dataset } from "@/lib/domain/types";

/**
 * Veri erişim katmanı.
 *
 * İlk açılışta Excel'den aktarılan seed.json → `.data/db.json` kopyalanır;
 * ekrandan girilen her kayıt (satış, fire, masraf, müşteri …) bu dosyaya yazılır.
 * Veritabanı fazında yalnızca bu dosya değişecek, ekranlar aynı kalacak.
 */
const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "db.json");

export const KURUM_ID = "kurum";

type SeedShape = Omit<Dataset, "customers"> & { customers?: Dataset["customers"] };

/** Seed'i güncel şemaya taşır: kimlik, satıcı ve müşteri alanları eklenir. */
function migrate(raw: SeedShape): Dataset {
  const ds = structuredClone(raw) as Dataset;
  ds.customers ??= [];
  if (!ds.customers.some((c) => c.id === KURUM_ID))
    ds.customers.unshift({ id: KURUM_ID, name: "Sözleşmeli kurum", kind: "kurum", il: null, ilce: null, phone: null, note: "Excel'deki tüm teslimler bu kuruma yapılmıştır. Adını ve ilini Müşteriler'den girin." });
  ds.deliveries = ds.deliveries.map((d, i) => ({
    ...d,
    id: d.id ?? `d${i + 1}`,
    seller: d.seller ?? "kurum",
    customerId: d.customerId === undefined ? KURUM_ID : d.customerId,
  }));
  ds.fires = ds.fires.map((f, i) => ({ ...f, id: f.id ?? `f${i + 1}` }));
  ds.expenses = ds.expenses.map((e, i) => ({ ...e, id: e.id ?? `e${i + 1}` }));
  return ds;
}

function readStore(): Dataset {
  if (!existsSync(FILE)) return migrate(seed as unknown as SeedShape);
  return migrate(JSON.parse(readFileSync(FILE, "utf8")) as SeedShape);
}

function writeStore(ds: Dataset) {
  mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(ds, null, 1), "utf8");
  renameSync(tmp, FILE);
}

/** Ekranlar için güncel veri. İstek anında okunur (önceden derlenmez). */
export async function getDataset(): Promise<Dataset> {
  await connection();
  return readStore();
}

/** Server action'lar için: veriyi oku, değiştir, yaz. */
export function mutate<T>(fn: (ds: Dataset) => T): T {
  const ds = readStore();
  const out = fn(ds);
  ds.generatedAt = new Date().toISOString();
  writeStore(ds);
  return out;
}

/** Excel'den gelen ilk hâle döner (Ayarlar → verileri sıfırla). */
export function resetStore() {
  writeStore(migrate(seed as unknown as SeedShape));
}

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
