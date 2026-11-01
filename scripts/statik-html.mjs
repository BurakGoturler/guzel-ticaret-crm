/**
 * Çalışan uygulamadan tek dosyalık, internetsiz açılan bir inceleme sayfası üretir.
 *
 * Kullanım:  pnpm dev --port 3100   (ayrı terminalde)
 *            node scripts/statik-html.mjs [çıktı.html]
 *
 * Her ayın Panel'i, Raporlar ve "yakında" sayfaları yakalanır; menü, ay seçimi ve
 * Grafik/Tablo düğmeleri küçük bir betikle çalışır. Grafik üzerindeki hover
 * ipuçları statik kopyada yoktur (React çalışmaz).
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = process.argv[2] ?? "guzel-ticaret-arayuz.html";
const OTHER = ["sevkiyatlar", "sozlesmeler", "fire-iade", "masraflar", "urunler", "firmalar", "ayarlar"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function open(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
}

/** main içeriğini al; ChartCard'ların tablo görünümünü de gizli olarak göm. */
async function captureMain() {
  const chartHtml = await page.evaluate(() => document.querySelector("main").innerHTML);
  const buttons = page.locator('button[aria-label="Tablo görünümü"]');
  const n = await buttons.count();
  if (n === 0) return chartHtml;
  for (let i = 0; i < n; i++) await buttons.nth(i).click();
  await page.waitForTimeout(300);
  return page.evaluate((chartHtml) => {
    const tableSections = [...document.querySelectorAll("main section")].filter((s) => s.querySelector('button[aria-label="Tablo görünümü"]'));
    const holder = document.createElement("div");
    holder.innerHTML = chartHtml;
    const chartSections = [...holder.querySelectorAll("section")].filter((s) => s.querySelector('button[aria-label="Tablo görünümü"]'));
    chartSections.forEach((sec, i) => {
      const body = sec.children[2];
      const table = tableSections[i]?.children[2]?.firstElementChild;
      if (!body || !table) return;
      body.firstElementChild?.setAttribute("data-sv", "chart");
      const t = table.cloneNode(true);
      t.setAttribute("data-sv", "table");
      t.style.display = "none";
      body.appendChild(t);
    });
    return holder.innerHTML;
  }, chartHtml);
}

await open("/");
const months = await page.evaluate(() =>
  [...document.querySelectorAll('[role="tablist"] a')].map((a) => new URL(a.href).searchParams.get("ay")),
);
const sidebar = await page.evaluate(() => document.querySelector("aside nav").outerHTML);
const css = await page.evaluate(async () => {
  const parts = [];
  for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
    const text = await (await fetch(l.href)).text();
    // "../media/x.woff2" gibi göreli yolları stil dosyasının adresine göre mutlak yola çevir
    parts.push(text.replace(/url\(\s*["']?(?!data:|https?:|\/)([^"')]+)["']?\s*\)/g, (_, rel) => `url(${new URL(rel, l.href).pathname})`));
  }
  for (const s of document.querySelectorAll("style")) parts.push(s.textContent);
  return parts.join("\n");
});
const fontVar = await page.evaluate(() => document.documentElement.className);

// Yazı tiplerini gömerek dosyayı tamamen çevrimdışı yap
let inlinedCss = css;
for (const url of new Set(css.match(/\/_next\/static\/media\/[^)"']+/g) ?? [])) {
  const buf = Buffer.from(await (await fetch(BASE + url)).arrayBuffer());
  inlinedCss = inlinedCss.split(url).join(`data:font/woff2;base64,${buf.toString("base64")}`);
}

const views = {};
for (const m of months) {
  await open(`/?ay=${m}`);
  views[`panel-${m}`] = await captureMain();
}
await open("/raporlar");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
views.raporlar = await captureMain();
for (const p of OTHER) {
  await open(`/${p}`);
  views[p] = await captureMain();
}
await browser.close();

const lastMonth = months[months.length - 1];
const sections = Object.entries(views)
  .map(([k, html]) => `<section data-view="${k}"${k === `panel-${lastMonth}` ? "" : " hidden"}>${html}</section>`)
  .join("\n");

const script = `
(() => {
  const LAST = ${JSON.stringify(lastMonth)};
  const ACTIVE = ["bg-shell-active", "font-medium", "text-white"];
  const IDLE = ["hover:bg-white/5", "hover:text-white"];
  function show(href) {
    const u = new URL(href, "http://x");
    const path = u.pathname.replace(/^\\//, "");
    const key = path === "" ? "panel-" + (u.searchParams.get("ay") || LAST) : path;
    if (!document.querySelector('[data-view="' + key + '"]')) return;
    document.querySelectorAll("[data-view]").forEach((s) => (s.hidden = s.dataset.view !== key));
    document.querySelectorAll("aside nav a").forEach((a) => {
      const p = new URL(a.getAttribute("href"), "http://x").pathname.replace(/^\\//, "");
      const on = path === "" ? p === "" : p === path;
      ACTIVE.forEach((c) => a.classList.toggle(c, on));
      IDLE.forEach((c) => a.classList.toggle(c, !on));
    });
    location.hash = key;
    window.scrollTo(0, 0);
    document.getElementById("mobile-nav")?.setAttribute("hidden", "");
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='/']");
    if (a) { e.preventDefault(); show(a.getAttribute("href")); return; }
    const b = e.target.closest("button[aria-label='Tablo görünümü'], button[aria-label='Grafik görünümü']");
    if (b) {
      const sec = b.closest("section");
      const table = b.getAttribute("aria-label") === "Tablo görünümü";
      sec.querySelectorAll("[data-sv]").forEach((el) => (el.style.display = (el.dataset.sv === "table") === table ? "" : "none"));
      sec.querySelectorAll("button[aria-pressed]").forEach((x) => {
        const on = (x.getAttribute("aria-label") === "Tablo görünümü") === table;
        x.setAttribute("aria-pressed", on);
        x.classList.toggle("bg-surface-alt", on);
        x.classList.toggle("text-ink", on);
      });
    }
    if (e.target.closest("[data-open-nav]")) document.getElementById("mobile-nav").removeAttribute("hidden");
    if (e.target.closest("[data-close-nav]")) document.getElementById("mobile-nav").setAttribute("hidden", "");
  });
  const h = location.hash.slice(1);
  if (h) show(h.startsWith("panel-") ? "/?ay=" + h.slice(6) : "/" + h);
})();`;

const html = `<!doctype html>
<html lang="tr" class="${fontVar}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Güzel Ticaret — arayüz önizleme</title>
<style>${inlinedCss}</style>
<style>.recharts-tooltip-wrapper{display:none!important}</style>
</head>
<body class="font-sans antialiased">
<div class="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
  <aside class="sticky top-0 hidden h-dvh lg:block">${sidebar}</aside>
  <div id="mobile-nav" class="fixed inset-0 z-40 lg:hidden" hidden>
    <button data-close-nav aria-label="Menüyü kapat" class="absolute inset-0 bg-black/40"></button>
    <aside class="absolute inset-y-0 left-0 w-64">${sidebar}</aside>
  </div>
  <div class="min-w-0">
    <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-hairline bg-surface/90 px-4 backdrop-blur lg:hidden">
      <button data-open-nav aria-label="Menüyü aç" class="rounded-md p-1.5 text-ink">☰</button>
      <span class="font-semibold text-ink">Güzel Ticaret</span>
    </header>
    <div class="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-xs text-body">
      Statik önizleme · ${new Date().toLocaleDateString("tr-TR")} · menü, ay seçimi ve Grafik/Tablo düğmeleri çalışır; grafik ipuçları ve veri girişi yoktur
    </div>
    <main class="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
${sections}
    </main>
  </div>
</div>
<script>${script}</script>
</body>
</html>`;

writeFileSync(OUT, html, "utf8");
console.log(`${OUT} yazıldı · ${(html.length / 1024).toFixed(0)} KB · ${Object.keys(views).length} görünüm`);
