# DEVAM — nerede kaldık

> Yeni oturuma başlarken İLK İŞ bu dosyayı oku. Kullanıcı "devam" dediğinde
> buradaki "Sıradaki adım" bölümünden başla.

**Son güncelleme:** 2 Kasım 2026

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

### Adım 2 — Tüm ekranlar + satış girişi + Halis + harita (2 Kasım 2026) ✅
- **Veri yazma:** `repo.ts` artık `seed.json`'ı ilk açılışta `.data/db.json`'a taşıyıp oradan okur/yazar
  (gitignore'da). `getDataset()` async + `connection()`; tüm panel sayfalarında `instant = false`.
  Değişiklikler `src/lib/actions.ts` server action'larıyla (`refresh()`), Ayarlar'dan Excel hâline sıfırlanır.
- **Ürün odaklı yapı (kullanıcı isteği):** Panel'de satış formu + ürün tablosu (her satırdan "Satış");
  `/urunler/[id]` ürün detayı: ay ay geçmiş, firma ataması, alış fiyatı, satışlar, sözleşmeler.
  Satış girince ay toplamı/kalan/ciro/kâr/firma tablosu hesaplanır (Excel `kasım 2026 kışlık` B10 örneği).
- **Panel sadeleşti:** 6 KPI, günlük sevkiyat, kârdan net kâra → Raporlar'ın başındaki "Ay özeti"ne taşındı
  (KPI'ların altında ne olduğu yazıyor). Panel: lacivert gradyanlı başlık + yüzen satış formu,
  Ecrin/Güzel/Halis renkli karoları (pay çubuğu), ürünler, müşteri haritası, son satışlar
  (21st.dev dashboard örnekleri: renkli ikon çipleri, bento karolar, activity feed).
- **Halis** (`/halis`, renk `--halis` camgöbeği): satışı `seller: "halis"`, kendi fiyatıyla.
  Kullanıcı kararı: **kg sözleşme kalanından düşer**; firma faturasına, stopaja, peşin vergiye girmez;
  kârı net kâra ayrı satır olarak eklenir.
- **Müşteriler** (`/musteriler`, `[id]`): kurum (`id: kurum`, adı/ili henüz girilmedi) + Halis'in alıcıları; il/ilçe seçimi.
- **Harita** (`/harita`): ary-teklif `TurkeyMap3D` uyarlaması, yalnız il sınırları (`src/data/turkiye-iller.json`,
  geoBoundaries/OSM ODbL). Ölçü: satış tutarı / kg / müşteri; ile tıkla → müşteriler → müşteri detayı.
- Satışlar, Sözleşmeler (ekle/düzenle), Fire & İade, Masraflar (önceki aydan kopyala), Ürünler (ekle/pasif),
  Firmalar (ay × ürün firma ataması, hücreden değişir), Ayarlar (oranlar, sıfırlama) bitti.
- Rota değişti: `/sevkiyatlar` → `/satislar`.
- **Geri bildirim turu (aynı gün):** Panel'den harita kaldırıldı (Harita menüde duruyor), son satışlar tam genişlik.
  Ürünler ve Müşteriler'de ekleme formu listenin üstünde. Raporlar kategori sekmelerine bölündü
  (`?sekme=` ozet / kar / firmalar / urunler / sozlesmeler / giderler).
- **Düzenleme her yerde:** satış (`updateSale` — ürün/tarih değişirse sözleşme yeniden bulunur), fire/iade,
  masraf, sözleşme → satırdaki kalem simgesi `EditDialog` penceresini açar, kayıttan sonra kendiliğinden kapanır
  (`useDialogClose` bağlamı `ActionForm` içinde). Müşteri, ürün, alış fiyatı, firma ataması, oranlar zaten düzenlenebiliyordu.
- **Daraltılabilir sol menü (duzenbi tarzı):** üstteki düğme veya Ctrl+B ile 240px ↔ 68px. Daraltılınca yalnız simgeler;
  imleç yaklaşınca simge büyür ve yanında adıyla bir hap kayarak açılır (Dock benzeri, `--dock` 0…1 kosinüs düşüşü,
  80px menzil, `prefers-reduced-motion`'da kapalı). Tercih `localStorage` (`gt-sidebar-collapsed`) — `useSyncExternalStore`.
  Mobilde çekmece menü aynen duruyor.
- **Giriş ve kullanıcılar (2 Kasım 2026):** tüm kullanıcılar aynı yetkide "süper yönetici"; her biri her işlemi
  yapar ve yeni kullanıcı ekler/düzenler/siler, şifre belirler. Kullanıcılar `.data/auth.json`'da (git dışı,
  "verileri sıfırla" bunu silmez); şifre scrypt + tuz; oturum HMAC imzalı çerez (`gt_session`, 30 gün),
  şifre değişince o kişinin açık oturumları kapanır. Koruma üç katman: `src/proxy.ts` (oturumsuz → /giris,
  oturumsuz POST → 401), `(panel)/layout.tsx` `requireUser()`, her server action `run()` içinde oturum denetimi.
  Hiç kullanıcı yoksa /giris ilk yönetici kurulum formunu gösterir. Yerelde `admin` hesabı açıldı
  (şifre kullanıcıya iletildi; Kullanıcılar → anahtar simgesinden değiştirilir). Kendi hesabını ve son
  kullanıcıyı silmek engelli. Çıkışta sayfa tam yenilenir (önceki ekranlar bellekte kalmasın).
- **Giriş ekranı videolu:** `public/videos/hal-1…5.mp4` (+ .jpg kapak) — Mixkit hal/pazar klipleri (ticari kullanıma
  açık ücretsiz lisans), 720p, sessiz, ≤12 sn, toplam ~4 MB. `VideoBackdrop` sırayla oynatır, yumuşak geçiş;
  yalnız oynayan + sıradaki yüklenir; "hareketi azalt"ta durağan kare. Örtü hafif (kullanıcı "daha belli olsun" dedi),
  sol taraftaki açıklama metinleri kullanıcı isteğiyle kaldırıldı; kart ortada. Proxy eşleşmesinden mp4/webm hariç.
- **Veri deposu Postgres'e hazır (Vercel için):** `src/lib/data/store.ts` — `DATABASE_URL`/`POSTGRES_URL` varsa
  Neon Postgres `app_docs` tablosu (anahtar → jsonb belge: `dataset`, `auth`), yoksa yerelde `.data/*.json`.
  Her yazma sürüm denetimli (`updateDoc`: çakışırsa güncel veriyle 6 kez yeniden dener) → eşzamanlı kayıt kaybolmaz.
  `repo.mutate`, `resetStore`, `auth/core` fonksiyonları artık async. Proxy yalnız imza+süre bakar (DB'ye gitmez).
  İlk yükleme: `DATABASE_URL=... node scripts/db-seed.mjs` (yalnız yoksa yazar; yerel admin hesabını taşır,
  böylece sitede ilk-yönetici ekranı herkese açık kalmaz). Not: tablolar normalize değil — ileride Prisma ile bölünebilir.
- **Çıkış sağ üstte:** üst çubukta kullanıcı menüsü (`user-menu.tsx`: ad, Kullanıcılar, Şifremi değiştir, Çıkış).
  Sol menünün altındaki kullanıcı alanı kaldırıldı. Şifre alanlarında göz düğmesi (`PasswordInput`).

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
6. ~~Halis'in ayrı satışları~~ → cevaplandı (kalandan düşer, ayrı fiyat). Açık kalan: "halis aldıgı" sayfası
   (164.360 kg patates × 48,4 / 59.247 kg soğan × 46,5 — kış sözleşmesiyle aynı rakamlar) ne anlatıyor?
8. Sözleşmeli kurumun adı ve ili (Müşteriler'den girilecek; girilince haritada görünür).
7. Mayıs fire satırında yalnız tutar var (kg×fiyat yok) — nasıl girilsin?

## Sıradaki adım (önerilen)
Kullanıcı Adım 2'yi yerelde gözden geçirsin; geri bildirime göre düzeltme.
Ardından: veritabanı (Prisma + PostgreSQL, crm-genel ile aynı; yalnız `repo.ts` + `actions.ts` değişir)
→ (giriş ✅) → renk soruları (1–2) netleşince satış "durum" alanı.

## Teknik notlar / tuzaklar
- `next.config.ts` → `cacheComponents: true`. `searchParams` okuyan sayfalarda
  `export const instant = false;` gerekli, yoksa build "blocking prerender" hatası verir.
- Firma renkleri dataviz doğrulayıcısından geçti: Ecrin `#2a78d6`, Güzel `#eb6834`.
  Metrik serileri (satış/alış/kâr) düşük kontrastlı → her grafikte tablo görünümü zorunlu.
- Windows'ta Python çıktısı için `PYTHONIOENCODING=utf-8` gerekli.
- Excel'i yeniden aktarmak: `python scripts/excel-aktar.py "C:/Users/burak/Desktop/2026 yaz dönemi.xlsx"`
- Server component'te "use client" dosyasından **fonksiyon/sabit** import etme (ör. `buttonClass`, `CUSTOMER_KIND`):
  istemci referansına dönüşür, çalışmaz. Ortak olanlar ayrı dosyada (`button-class.ts`, `customers/kinds.ts`).
- `globals.css`'e yeni renk token'ı ekleyince Tailwind/Turbopack dev önbelleği bazen yakalamıyor →
  dev sunucusunu yeniden başlat.
- Git Bash'te Playwright betiğine `/` yolu verirken `MSYS_NO_PATHCONV=1` gerekli.
- Oturum okuyan kodda `Date.now()` öncesi `connection()` gerekli (dev "unstable value" hatası).
- React form eylemi bittiğinde kontrolsüz alanları sıfırlar → giriş formunda kullanıcı adı kontrollü.
- Server component'ten client component'e simge **bileşeni** geçilmez; öğe (`<KeyRound />`) geçilir.
- Yerel dev `.env.local`'de `DATABASE_URL` olsa da dosya kullanır; Postgres yalnız `VERCEL=1` ya da `USE_DATABASE=1` iken. Yerelden üretim DB'ye bilerek bağlanmak: `USE_DATABASE=1 pnpm dev`.
- Üretimde `AUTH_SECRET` ortam değişkeni verilebilir; yoksa `auth.json` içindeki rastgele anahtar kullanılır.
- GitHub: https://github.com/BurakGoturler/guzel-ticaret-crm (özel repo)
