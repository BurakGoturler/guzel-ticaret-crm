import "server-only";
import seed from "@/data/seed.json";
import type { Dataset } from "@/lib/domain/types";

/**
 * Veri erişim katmanı. Şimdilik Excel'den aktarılan seed.json'dan okur;
 * veritabanı fazında yalnızca bu dosya değişecek, ekranlar aynı kalacak.
 */
export function getDataset(): Dataset {
  return seed as Dataset;
}
