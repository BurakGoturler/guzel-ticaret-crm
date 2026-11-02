import "server-only";
import { connection } from "next/server";
import seed from "@/data/seed.json";
import type { Dataset } from "@/lib/domain/types";
import { readDoc, updateDoc } from "./store";

/**
 * Veri erişim katmanı.
 *
 * Veri tek belge ("dataset") olarak depoda durur: üretimde Postgres, yerelde `.data/db.json`
 * (bkz. store.ts). İlk açılışta Excel'den aktarılan seed.json kullanılır; ekrandan girilen
 * her kayıt (satış, fire, masraf, müşteri …) bu belgeye yazılır.
 */
const KEY = "dataset";

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

const initial = () => seed as unknown as SeedShape;

/** Ekranlar için güncel veri. İstek anında okunur (önceden derlenmez). */
export async function getDataset(): Promise<Dataset> {
  await connection();
  return migrate((await readDoc<SeedShape>(KEY)) ?? initial());
}

/** Server action'lar için: veriyi oku, değiştir, yaz. `fn` hata fırlatırsa yazılmaz. */
export async function mutate<T>(fn: (ds: Dataset) => T): Promise<T> {
  return updateDoc<SeedShape, T>(KEY, initial, (raw) => {
    const ds = migrate(raw);
    const result = fn(ds);
    ds.generatedAt = new Date().toISOString();
    return { data: ds, result };
  });
}

/** Excel'den gelen ilk hâle döner (Ayarlar → verileri sıfırla). */
export async function resetStore() {
  await updateDoc<SeedShape, void>(KEY, initial, () => ({ data: migrate(initial()), result: undefined }));
}

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
