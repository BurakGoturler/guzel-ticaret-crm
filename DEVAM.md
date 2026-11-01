# DEVAM — nerede kaldık

> Yeni oturuma başlarken İLK İŞ bu dosyayı oku. Kullanıcı "devam" dediğinde
> buradaki "Sıradaki adım" bölümünden başla.

**Son güncelleme:** 1 Kasım 2026

## Proje özeti

**Güzel Ticaret CRM** — iki şahıs firmasının (Ecrin Yaş Sebze Meyve + Güzel Ticaret)
ortak ürün havuzuyla bir kuruma sözleşmeli sebze-meyve teslimini takip eder.
Bir ürün bir ayda yalnız bir firmadan satılır; ertesi ay firma değişebilir.
Kaynak Excel: `C:\Users\burak\Desktop\2026 yaz dönemi.xlsx` (satır düzeni → `docs/EXCEL-ANALIZ.md`).

Çalışma biçimi: **adım adım**. Kullanıcı her adımı yerelde (`pnpm dev --port 3100`)
görerek ilerlemek istiyor. Excel renklerinin birden çok anlamı var — tahmin etme, sor.

Referans projeler (altyapı + arayüz):
- `C:\Users\burak\Desktop\Börü Medya\web-site\crm-genel` (ana referans: renkler, lacivert kabuk)
- `C:\Users\burak\Desktop\Börü Medya\web-site\web-site-crm-borumedya`
- `C:\Users\burak\Desktop\Burak\Projeler\duzenbi`

## Yapılanlar

### Adım 1 — Panel + Raporlar (1 Kasım 2026) ✅
- Next.js 16 + TypeScript + Tailwind 4 + Recharts projesi kuruldu.
- `scripts/excel-aktar.py`: Excel → `src/data/seed.json` (25 sözleşme, 402 sevkiyat,
  75 alış fiyatı, 30 fire, 23 masraf, 30 ürün). Aylık toplamlar Excel ve
  "TAHMİNİ İCMA KRR" sayfasıyla birebir doğrulandı.
- `src/lib/domain/calc.ts`: tüm hesaplar (ürün satırları, ay özeti, firma toplamları,
  devreden kalan, kâr köprüsü, sözleşme gerçekleşme, firma matrisi).
- **Panel** (`/`): ay seçimi, birleşik KPI, Ecrin | Güzel yan yana kartlar,
  firma değişimi uyarısı, ürün durumu tablosu, günlük sevkiyat grafiği, kârdan net kâra.
- **Raporlar** (`/raporlar`): 13 görünüm (aylık satış/alış/kâr, firmaya göre ciro,
  firma payı, masraf dağılımı, net kâr, marj, ürün cirosu, sözleşme gerçekleşme,
  kümülatif gerçekleşme, fiyatlar, günlük sevkiyat, fire, ay×ürün firma matrisi).
  Her grafikte Grafik/Tablo düğmesi.
- Diğer menüler (Sevkiyatlar, Sözleşmeler, Fire & İade, Masraflar, Ürünler, Firmalar,
  Ayarlar) "yakında" sayfası — her birinde Excel karşılığı yazılı.
- `pnpm build`, `tsc`, `eslint` temiz.
- Arkadaş incelemesi için tek dosyalık statik HTML çıktısı alındı
  (`scripts/statik-html.mjs` → `guzel-ticaret-arayuz.html`, repoya dahil değil).

### Excel'den farklı hesaplananlar (bilinçli)
- Kalan kg önceki aydan devreder (Excel her ay B5'e 300.000 yazıyordu).
- Ağustos/Eylül karpuz G22 tarihsiz ara toplamı ikinci kez sayılmaz.
- Ekim fire `100*20` = 2.000 ₺ (Excel'de 1.000 girilmiş) → net kâr 1.000 ₺ fark.
- Stopaj %2,2 ve peşin vergi %2 oranla hesaplanır (Mayıs–Haziran Excel'de elle yuvarlanmış).

## Kullanıcıya sorulan, cevap bekleyen sorular
1. Sevkiyat hücrelerindeki **kırmızı / sarı zemin** ne demek? (fatura / ödeme / teslim?)
2. **Koyu kırmızı başlıklar** (taze fasulye, kayısı, kiraz, çilek): dönemi biten ürün mü?
3. Mayıs patates 33 ₺ / soğan 27,9 ₺ **önceki sözleşme** mi? (şimdilik öyle: `onceki-*` sözleşmeleri)
4. Kış sayfalarında iki tablo da "GÜZEL TİCARET" — biri Ecrin mi?
5. %1 KDV faturaya mı ekleniyor, damga kesintisi mi?
6. Halis'in ayrı satışları ("belirlenen fiyattan farklı") nasıl izlenecek?
7. Mayıs fire satırında yalnız tutar var (kg×fiyat yok) — nasıl girilsin?

## Sıradaki adım (önerilen)
**Adım 2 — Sevkiyatlar ekranı:** listeleme (ay / ürün / firma filtresi) + yeni giriş
(tarih, ürün, kg; firma aya göre otomatik). Önce yukarıdaki renk sorusu (1–2) netleşmeli,
çünkü sevkiyatın "durum" alanı ona bağlı.

Ardından: veritabanı (Prisma + PostgreSQL, crm-genel ile aynı) → Sözleşmeler →
Fire & İade (bozuk, kötü mal, geri gelen) → Masraflar + Halis → Ürünler/Firmalar
(aylık ürün ataması) → Ayarlar (oranlar) → giriş/yetki.

## Teknik notlar / tuzaklar
- `next.config.ts` → `cacheComponents: true`. `searchParams` okuyan sayfalarda
  `export const instant = false;` gerekli, yoksa build "blocking prerender" hatası verir.
- Firma renkleri dataviz doğrulayıcısından geçti: Ecrin `#2a78d6`, Güzel `#eb6834`.
  Metrik serileri (satış/alış/kâr) düşük kontrastlı → her grafikte tablo görünümü zorunlu.
- Windows'ta Python çıktısı için `PYTHONIOENCODING=utf-8` gerekli.
- Excel'i yeniden aktarmak: `python scripts/excel-aktar.py "C:/Users/burak/Desktop/2026 yaz dönemi.xlsx"`
- GitHub: https://github.com/BurakGoturler/guzel-ticaret-crm (özel repo)
