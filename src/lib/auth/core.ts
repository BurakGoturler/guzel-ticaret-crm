import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readDoc, updateDoc } from "@/lib/data/store";

/**
 * Kullanıcılar ve oturum imzası. Veri belgesinden ayrı "auth" belgesinde tutulur
 * (üretimde Postgres, yerelde `.data/auth.json`): "verileri sıfırla" kullanıcıları silmez.
 *
 * Tüm kullanıcılar aynı yetkidedir (süper yönetici): her işlemi yapabilir,
 * kullanıcı ekleyip silebilir. Bu dosya proxy'den de kullanıldığı için
 * "server-only" içe aktarmaz; yalnız sunucuda çalışır (node:crypto).
 */
const KEY = "auth";

export const SESSION_COOKIE = "gt_session";
export const SESSION_DAYS = 30;

export interface User {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  /** Şifre değişince artar; eski oturumlar geçersiz olur. */
  sessionVersion: number;
  createdAt: string;
  createdBy: string | null;
}

/** Ekrana giden, şifre içermeyen hâl. */
export type PublicUser = Pick<User, "id" | "name" | "username" | "createdAt" | "createdBy">;
export const publicUser = ({ id, name, username, createdAt, createdBy }: User): PublicUser => ({ id, name, username, createdAt, createdBy });

interface AuthStore {
  secret: string;
  users: User[];
}

const newStore = (): AuthStore => ({ secret: randomBytes(32).toString("base64url"), users: [] });

/** Belge yoksa (ilk açılış) rastgele imza anahtarıyla oluşturulur. */
async function readAuth(): Promise<AuthStore> {
  return (await readDoc<AuthStore>(KEY)) ?? updateDoc(KEY, newStore, (cur) => ({ data: cur, result: cur }));
}

export const listUsers = async () => (await readAuth()).users;
export const findUser = async (id: string) => (await listUsers()).find((u) => u.id === id) ?? null;
export const findUserByUsername = async (username: string) =>
  (await listUsers()).find((u) => u.username === normalizeUsername(username)) ?? null;

/** Kullanıcı listesini değiştirir; `fn` dönüşü sonuç olarak gelir. Çakışmada güncel listeyle yeniden dener. */
export function mutateUsers<T>(fn: (users: User[]) => T): Promise<T> {
  return updateDoc(KEY, newStore, (store) => {
    const result = fn(store.users);
    return { data: store, result };
  });
}

export const normalizeUsername = (s: string) => s.trim().toLocaleLowerCase("tr-TR");
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD = 8;

/* Şifre: scrypt + rastgele tuz. Biçim: scrypt$tuz$özet */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

/* Oturum çerezi: base64url(id.sürüm.bitiş) + "." + HMAC-SHA256.
   İmza anahtarı: AUTH_SECRET ortam değişkeni, yoksa auth belgesindeki rastgele anahtar. */
let cachedSecret: string | null = null;
async function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  cachedSecret ??= (await readAuth()).secret;
  return cachedSecret;
}
const sign = async (payload: string) => createHmac("sha256", await secret()).update(payload).digest("base64url");

export async function createSessionToken(user: User) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(`${user.id}.${user.sessionVersion}.${exp}`).toString("base64url");
  return { token: `${payload}.${await sign(payload)}`, expires: new Date(exp) };
}

/** Yalnız imza ve süre (veritabanına gitmez) — proxy'deki hızlı kapı için. */
export async function verifyToken(token: string | undefined | null): Promise<{ id: string; version: number } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(await sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, version, exp] = Buffer.from(payload, "base64url").toString().split(".");
  if (!id || !(Number(exp) > Date.now())) return null;
  return { id, version: Number(version) };
}

/** Geçerli oturumun kullanıcısı: imza ve süreye ek olarak kullanıcının hâlâ var olması ve şifre sürümü denetlenir. */
export async function userFromToken(token: string | undefined | null): Promise<User | null> {
  const claims = await verifyToken(token);
  if (!claims) return null;
  const user = await findUser(claims.id);
  return user && user.sessionVersion === claims.version ? user : null;
}
