# Excel analizi — `2026 yaz dönemi.xlsx`

Bu belge Excel'deki iş sürecini ve CRM'deki karşılığını kayıt altına alır.
Excel'i yeniden aktarmak için: `python scripts/excel-aktar.py "C:/Users/burak/Desktop/2026 yaz dönemi.xlsx"`

## Sayfalar

| Sayfa | İçerik | CRM'de |
| --- | --- | --- |
| mayıs 2026 1 | Yalnız ay toplamları (günlük döküm yok), eski fiyatlı patates/soğan/maydanoz | Aktarıldı (31.05 tek kayıt) |
| haziran 2026 1 … ekim 2026 | Günlük sevkiyat, alış fiyatı, fire, masraf, firma tabloları | Aktarıldı |
| kasım / aralık 2026 kışlık | Kış sözleşmesi (henüz tek kayıt yok) | Sözleşme + alış fiyatı aktarıldı |
| TAHMİNİ GENEL İCMAL | Dönem tahmini (birkaç `#REF!` hatası var) | Raporlar'da hesaplanıyor |
| TAHMİNİ İCMA KRR | Ay ay teslimat ve gerçek kalan | Doğrulama için kullanıldı — rakamlar tutuyor |
| halis aldıgı | Halis'in ayrı aldığı patates/soğan | Sonraki adım |
| ocak … mayıs 2027 | Boş | — |

## Ay sayfası satır düzeni (ekim 2026 örneği)

| Satır | Anlam | CRM alanı |
| --- | --- | --- |
| 1 | Ürün başlıkları | `products` |
| 2 / 3 | Başlama / bitiş tarihi | `contracts` (tarihler sonraki adım) |
| 5 | Sözleşme kg | `contracts.contractKg` |
| 6 | Satış ₺/kg | `contracts.salePrice`, `deliveries.salePrice` |
| 7 | Sözleşme tutarı (=5×6) | hesaplanır |
| 8 | Kalan (=5−23) | hesaplanır, **önceki aydan devreder** |
| 9–22 | Günlük teslim (A: tarih) | `deliveries` |
| 23 | Ay toplam kg | hesaplanır |
| 24 | Satış cirosu (=23×6) | hesaplanır |
| 26 | Alış ₺/kg (üreticiden) | `purchasePrices` |
| 27 / 28 | Alış tutarı / brüt kâr | hesaplanır |
| 30–31 | Fire, kasa-dara (`40*30 fire`) | `fires` |
| 33+ | ECRİN / GÜZEL tabloları | `assignments` (aya göre ürün → firma) |
| B34–C44 | KAR → stopaj → Halis → elemanlar → ceza → peşin vergi → kalan kâr | `expenses` + `settings` |

## Excel'de düzeltilen noktalar

1. **Kalan devretmiyor.** Her ay B5'e 300.000 yeniden yazılmış; CRM kalanı sözleşmeden
   kümülatif düşüyor (Ekim patates: devreden 190.064 → ay sonu 165.415).
2. **Karpuz ara toplamı.** Ağustos/Eylül G22 hücresi tarihsiz ara toplam; ikinci kez sayılmıyor.
3. **Ekim fire satırı.** `100*20` yazıp 1.000 girilmiş; CRM 2.000 hesaplıyor (net kâr farkı 1.000 ₺).
4. **Stopaj / peşin vergi** Mayıs–Haziran'da elle yuvarlanmış; CRM oranla hesaplıyor (%2,2 / %2).

## Teyit bekleyen sorular

- [ ] **Renkler:** sevkiyat hücrelerindeki kırmızı (FF0000) / sarı zemin ne demek? (fatura kesildi / ödendi / teslim edildi?)
- [ ] **Koyu kırmızı başlıklar** (taze fasulye, kayısı, kiraz, çilek — C00000) ve icmaldeki mavi başlıklar: dönemi biten ürün mü?
- [ ] **Mayıs:** patates 33 ₺ / soğan 27,9 ₺ önceki sözleşmeden mi? (KRR sayfası bunları yaz kalanından düşmüyor; CRM de düşmüyor.)
- [ ] **Kış sayfaları:** iki tablonun başlığı da "GÜZEL TİCARET" — biri Ecrin mi olmalı?
- [ ] **Mayıs fire:** satır 32'de yalnız tutar var (−1.000, −800 …), kg×fiyat metni yok — aktarılmadı.
- [ ] **KDV %1:** fatura üstüne eklenen KDV mi, yoksa damga kesintisi mi? (Excel'de "damga kesintisi" notu yanında.)
- [ ] **Halis:** her ay 43.000 ₺ masraf + ayrı satışlar ("belirlenen fiyattan farklı satıyor") — nasıl izlenecek?
