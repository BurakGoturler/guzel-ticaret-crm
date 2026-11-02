// Postgres'e ilk belgeleri yükler (yalnız yoksa; var olanın üzerine YAZMAZ).
//   auth    ← .data/auth.json   (yerel kullanıcılar; yoksa atlanır → sitede ilk-yönetici ekranı açılır)
//   dataset ← .data/db.json, yoksa src/data/seed.json (Excel'den aktarılan ilk veri)
//
// Kullanım: DATABASE_URL=... node scripts/db-seed.mjs
import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("DATABASE_URL yok.");
  process.exit(1);
}
const sql = neon(url);
await sql`create table if not exists app_docs (
  key text primary key,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
)`;

const docs = [
  ["auth", ".data/auth.json"],
  ["dataset", existsSync(".data/db.json") ? ".data/db.json" : "src/data/seed.json"],
];
for (const [key, file] of docs) {
  if (!existsSync(file)) { console.log(`${key}: ${file} yok, atlandı`); continue; }
  const json = readFileSync(file, "utf8");
  const rows = await sql`insert into app_docs (key, data) values (${key}, ${json}::jsonb) on conflict (key) do nothing returning key`;
  console.log(`${key}: ${rows.length ? `${file} yüklendi` : "zaten var, dokunulmadı"}`);
}
