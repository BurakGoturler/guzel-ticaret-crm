"""2026 yaz dönemi.xlsx -> src/data/seed.json

Kullanım: python scripts/excel-aktar.py "C:/Users/burak/Desktop/2026 yaz dönemi.xlsx"
Ay sayfalarındaki satır düzeni Excel'den alınmıştır (bkz. docs/EXCEL-ANALIZ.md).
"""
import json, re, sys, datetime as dt, unicodedata
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\burak\Desktop\2026 yaz dönemi.xlsx"
OUT = "src/data/seed.json"


def tr_lower(s):
    return s.replace("İ", "i").replace("I", "ı").lower()


def tr_cap(s):
    s = tr_lower(s.strip())
    return (s[0].replace("i", "İ").upper() + s[1:]) if s else s


def slug(s):
    s = tr_lower(s.strip()).replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


ALIAS = {"biber": "yesil-biber", "fasulye": "taze-fasulye", "narv": "nar"}


def pid(name):
    s = slug(name)
    return ALIAS.get(s, s)


PRODUCTS = ["kışlık patates", "patates", "kuru soğan", "patlıcan", "yeşil biber", "hıyar", "taze fasulye", "muz",
            "taze üzüm", "yazlık kabak", "limon", "karpuz", "kavun", "şeftali", "kayısı", "kiraz", "armut", "çilek",
            "ayva", "kırmızı biber", "kivi", "karnabahar", "pırasa", "turp", "havuç", "soğan", "kestane kabağı", "nar",
            "portakal", "maydanoz"]
FRUIT = {"muz", "taze üzüm", "limon", "karpuz", "kavun", "şeftali", "kayısı", "kiraz", "armut", "çilek", "ayva",
         "kivi", "nar", "portakal"}

# key, sayfa, teslim satır aralığı, alış fiyatı satırı, fire metin satırı, masraf etiket kolonu, masraf satırları
MONTHS = [
    ("2026-05", "mayıs 2026 1", (9, 25), 29, 32, "C", (35, 41)),
    ("2026-06", "haziran 2026 1", (9, 25), 29, 33, "C", (38, 44)),
    ("2026-07", "temmuz 2026", (9, 22), 26, 30, "B", (35, 41)),
    ("2026-08", "ağustos 2026", (9, 22), 26, 30, "B", (35, 41)),
    ("2026-09", "eylül 2026", (9, 22), 26, 30, "B", (35, 41)),
    ("2026-10", "ekim 2026", (9, 22), 26, 30, "B", (35, 41)),
]
# Excel alt bölümündeki firma tabloları (aya göre ürün -> firma)
ASSIGN = {
    "2026-05": {"ecrin": ["kuru soğan", "taze fasulye", "kayısı"], "guzel": ["patates", "maydanoz", "hıyar", "yeşil biber"]},
    "2026-06": {"ecrin": ["patates", "taze fasulye", "kayısı", "kiraz"], "guzel": ["kuru soğan", "hıyar", "yeşil biber"]},
    "2026-07": {"ecrin": ["patates", "taze fasulye", "karpuz", "kiraz", "şeftali"], "guzel": ["kavun", "kuru soğan", "hıyar", "yeşil biber"]},
    "2026-08": {"ecrin": ["armut", "patates", "karpuz", "şeftali"], "guzel": ["kavun", "kuru soğan", "hıyar", "yeşil biber"]},
    "2026-09": {"ecrin": ["armut", "patates", "karpuz", "şeftali"], "guzel": ["kavun", "kuru soğan", "hıyar", "yeşil biber"]},
    "2026-10": {"ecrin": ["armut", "patates", "karpuz", "şeftali"], "guzel": ["kavun", "kuru soğan", "hıyar", "yeşil biber"]},
    # Kış: Excel'de iki tablo da "GÜZEL TİCARET" başlıklı — teyit bekliyor
    "2026-11": {"ecrin": [], "guzel": ["patates", "portakal", "nar", "kivi", "karnabahar", "kestane kabağı", "kuru soğan", "pırasa", "turp", "havuç"]},
}
OLD_CONTRACT = {"patates", "kuru-sogan", "maydanoz"}  # Mayıs: eski fiyatlı sözleşme (33 / 27,9 / 10,5)
SKIP_EXP = {"kar", "stopaj", "peşin kesilen vergi", "kalan kar", ""}


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    if isinstance(v, str):
        m = re.match(r"\s*(\d{1,2})[,./](\d{1,2})[,./](\d{4})", v)
        if m:
            return f"{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}"
    return None


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


wb = openpyxl.load_workbook(SRC, data_only=True)


def headers(ws):
    h = {}
    for c in ws[1]:
        if isinstance(c.value, str) and c.value.strip() and c.value.strip().lower() != "tarih":
            h[c.column] = pid(c.value)
    return h


contracts, deliveries, prices, fires, expenses = {}, [], [], [], []
for key, sheet, (r0, r1), prow, firerow, ecol, (e0, e1) in MONTHS:
    ws = wb[sheet]
    h = headers(ws)
    for col, p in h.items():
        kg, price = ws.cell(5, col).value, ws.cell(6, col).value
        if p not in contracts and num(kg) and num(price) and key >= "2026-06":
            contracts[p] = {"id": f"yaz-{p}", "productId": p, "seasonId": "yaz-2026", "contractKg": kg, "salePrice": price}
        pp = ws.cell(prow, col).value
        if num(pp) and pp > 0:
            prices.append({"month": key, "productId": p, "purchasePrice": pp})
    def add(date, p, col, kg, note):
        sp = ws.cell(6, col).value
        cid = f"onceki-{p}" if key == "2026-05" and p in OLD_CONTRACT else f"yaz-{p}"
        deliveries.append({"date": date, "productId": p, "contractId": cid, "kg": kg,
                           "salePrice": sp if num(sp) else None, "note": note})

    if key == "2026-05":  # Mayıs sayfasında günlük döküm yok, yalnız ay toplamı (satır 25)
        for col, p in h.items():
            v = ws.cell(25, col).value
            if num(v) and v != 0:
                add("2026-05-31", p, col, v, "Mayıs ay toplamı (Excel'de günlük döküm yok)")
    else:
        last, dated = None, {}
        for r in range(r0, r1 + 1):
            d = to_date(ws.cell(r, 1).value)
            if d:
                last = d
            for col, p in h.items():
                v = ws.cell(r, col).value
                if not (num(v) and v != 0 and (d or last)):
                    continue
                if not d and v == dated.get(col):  # tarihsiz ara toplam satırı (ör. karpuz G22)
                    continue
                add(d or last, p, col, v, None if d else "Düzeltme satırı (tarihsiz)")
                dated[col] = dated.get(col, 0) + v
    for col, p in h.items():
        t = ws.cell(firerow, col).value
        if isinstance(t, str):
            m = re.match(r"\s*(\d+)\s*\*\s*(\d+(?:[.,]\d+)?)", t)
            if m:
                fires.append({"month": key, "productId": p, "kg": int(m[1]), "price": float(m[2].replace(",", ".")),
                              "reason": "fire" if "fire" in t else "kasa-dara", "note": t.strip()})
    lc = openpyxl.utils.column_index_from_string(ecol)
    for r in range(e0, e1 + 1):
        lab, val = ws.cell(r, lc).value, ws.cell(r, lc + 1).value
        if isinstance(lab, str) and lab.strip().lower() not in SKIP_EXP and num(val) and val < 0:
            expenses.append({"month": key, "label": re.sub(r"\s+", " ", tr_cap(lab)), "amount": -val})

# Mayıs: patates / kuru soğan / maydanoz önceki dönem sözleşmesinden (TAHMİNİ İCMA KRR sayfası bunları yaz kalanından düşmüyor)
wm = wb["mayıs 2026 1"]
for col, p in headers(wm).items():
    if p in OLD_CONTRACT:
        kg, price = wm.cell(25, col).value, wm.cell(6, col).value
        contracts[f"onceki-{p}"] = {"id": f"onceki-{p}", "productId": p, "seasonId": "kis-2025", "contractKg": kg, "salePrice": price}
# Kış dönemi sözleşmeleri
wk = wb["kasım 2026 kışlık"]
for col, p in headers(wk).items():
    kg, price, pp = wk.cell(5, col).value, wk.cell(6, col).value, wk.cell(26, col).value
    if num(kg) and num(price):
        contracts[f"kis-{p}"] = {"id": f"kis-{p}", "productId": p, "seasonId": "kis-2026", "contractKg": kg, "salePrice": price}
        if num(pp):
            prices.append({"month": "2026-11", "productId": p, "purchasePrice": pp})

assign = [{"month": m, "productId": pid(n), "firmId": f} for m, fs in ASSIGN.items() for f, ns in fs.items() for n in ns]
products = [{"id": pid(n), "name": tr_cap(n),
             "category": "meyve" if n in FRUIT else "sebze", "unit": "kg", "active": True} for n in PRODUCTS]
ids = {p["id"] for p in products}
for x in list(contracts.values()) + deliveries + prices + assign:
    if x["productId"] not in ids:
        print("bilinmeyen ürün:", x["productId"])

data = {
    "source": "2026 yaz dönemi.xlsx",
    "generatedAt": dt.datetime.now().isoformat(timespec="seconds"),
    "firms": [{"id": "ecrin", "name": "Ecrin Yaş Sebze Meyve", "short": "Ecrin"},
              {"id": "guzel", "name": "Güzel Ticaret", "short": "Güzel"}],
    "seasons": [{"id": "kis-2025", "name": "2025-26 Kış Dönemi (devreden)", "start": "2025-11-01", "end": "2026-04-30"},
                {"id": "yaz-2026", "name": "2026 Yaz Dönemi", "start": "2026-05-01", "end": "2026-10-31"},
                {"id": "kis-2026", "name": "2026-27 Kış Dönemi", "start": "2026-11-01", "end": "2027-05-31"}],
    "products": products, "contracts": list(contracts.values()), "assignments": assign,
    "deliveries": deliveries, "purchasePrices": prices, "fires": fires, "expenses": expenses,
    "settings": {"stopajRate": 0.022, "advanceTaxRate": 0.02, "kdvRate": 0.01},
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print("sözleşme", len(contracts), "sevkiyat", len(deliveries), "fiyat", len(prices), "fire", len(fires), "masraf", len(expenses))
