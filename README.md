# Güzel Ticaret CRM

Ecrin Yaş Sebze Meyve ve Güzel Ticaret için sevkiyat, sözleşme ve kâr takibi.
İki şahıs firması aynı ürün havuzunu paylaşır; bir ürün bir ay yalnız bir firmadan satılır.

## Çalıştırma

```bash
pnpm install
pnpm dev --port 3100   # http://localhost:3100
```

## Yapı

| Yol | Ne |
| --- | --- |
| `src/app/(panel)/page.tsx` | Panel — seçilen ay, iki firma yan yana |
| `src/app/(panel)/raporlar/page.tsx` | Raporlar — dönem grafikleri |
| `src/lib/domain/` | Alan modeli ve tüm hesaplar (saf fonksiyonlar) |
| `src/lib/data/repo.ts` | Veri erişimi (şimdilik `src/data/seed.json`, sonra veritabanı) |
| `scripts/excel-aktar.py` | Excel → seed.json aktarımı |
| `docs/EXCEL-ANALIZ.md` | Excel satır düzeni, düzeltmeler, açık sorular |
| `scripts/statik-html.mjs` | Çalışan uygulamadan tek dosyalık inceleme sayfası (`node scripts/statik-html.mjs cikti.html`) |
| `DEVAM.md` | Nerede kaldık, sıradaki adım |

Yığın: Next.js 16 · TypeScript · Tailwind 4 · Recharts — Börü CRM ile aynı temel.
