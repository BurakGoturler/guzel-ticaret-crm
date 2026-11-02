import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Belge deposu: her belge bir anahtar altında JSON olarak durur ("dataset", "auth").
 *
 * - Vercel'de (veya USE_DATABASE=1) `DATABASE_URL`/`POSTGRES_URL` ile → Postgres (Neon) `app_docs` tablosu.
 *   Her yazmada sürüm denetlenir; aynı anda iki kayıt gelirse ikincisi güncel veriyle
 *   yeniden denenir, hiçbir kayıt kaybolmaz.
 * - Yoksa → yerelde `.data/<anahtar>.json` dosyası (geliştirme).
 *
 * Proxy'den de kullanıldığı için "server-only" içe aktarmaz.
 */
// Yerelde `.env.local`'de üretim adresi olsa bile dosya kullanılır; Postgres yalnız Vercel'de
// (VERCEL=1) ya da bilerek istenirse (USE_DATABASE=1) devreye girer.
const useDb = process.env.VERCEL === "1" || process.env.USE_DATABASE === "1";
const DB_URL = useDb ? process.env.DATABASE_URL || process.env.POSTGRES_URL : undefined;
const KEY_FILES: Record<string, string> = { dataset: "db.json", auth: "auth.json" };

export class ConflictError extends Error {}

interface Backend {
  get<T>(key: string): Promise<{ data: T; version: number } | null>;
  /** expected = null → yalnız yoksa ekle. Sürüm tutmazsa false. */
  put<T>(key: string, data: T, expected: number | null): Promise<boolean>;
}

/* ---------------- Postgres (Neon) ---------------- */
function pgBackend(url: string): Backend {
  const sql: NeonQueryFunction<false, false> = neon(url);
  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ??= sql`create table if not exists app_docs (
      key text primary key,
      data jsonb not null,
      version integer not null default 1,
      updated_at timestamptz not null default now()
    )`.catch((e) => { ready = null; throw e; }));

  return {
    async get<T>(key: string) {
      await init();
      const rows = (await sql`select data, version from app_docs where key = ${key}`) as { data: T; version: number }[];
      return rows[0] ?? null;
    },
    async put<T>(key: string, data: T, expected: number | null) {
      await init();
      const json = JSON.stringify(data);
      const rows = expected === null
        ? await sql`insert into app_docs (key, data) values (${key}, ${json}::jsonb) on conflict (key) do nothing returning version`
        : await sql`update app_docs set data = ${json}::jsonb, version = version + 1, updated_at = now()
                    where key = ${key} and version = ${expected} returning version`;
      return rows.length > 0;
    },
  };
}

/* ---------------- Yerel dosya ---------------- */
function fileBackend(): Backend {
  const dir = path.join(process.cwd(), ".data");
  const file = (key: string) => path.join(dir, KEY_FILES[key] ?? `${key}.json`);
  return {
    async get<T>(key: string) {
      const f = file(key);
      return existsSync(f) ? { data: JSON.parse(readFileSync(f, "utf8")) as T, version: 0 } : null;
    },
    async put<T>(key: string, data: T) {
      mkdirSync(dir, { recursive: true });
      const f = file(key), tmp = `${f}.tmp`;
      writeFileSync(tmp, JSON.stringify(data, null, 1), { encoding: "utf8", mode: 0o600 });
      renameSync(tmp, f);
      return true;
    },
  };
}

const backend: Backend = DB_URL ? pgBackend(DB_URL) : fileBackend();
export const storageKind = DB_URL ? "postgres" : "file";

export async function readDoc<T>(key: string): Promise<T | null> {
  return (await backend.get<T>(key))?.data ?? null;
}

/**
 * Belgeyi oku → değiştir → yaz. Arada başkası yazdıysa güncel veriyle baştan dener.
 * `fn` hata fırlatırsa hiçbir şey yazılmaz.
 */
export async function updateDoc<T, R>(key: string, initial: () => T, fn: (current: T) => { data: T; result: R }): Promise<R> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await backend.get<T>(key);
    const { data, result } = fn(cur ? cur.data : initial());
    if (await backend.put(key, data, cur ? cur.version : null)) return result;
  }
  throw new ConflictError("Kayıt aynı anda değişti; lütfen tekrar deneyin.");
}
