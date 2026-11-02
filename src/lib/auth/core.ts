import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Kullanıcılar ve oturum imzası. Veri tablosundan (db.json) ayrı tutulur:
 * "verileri sıfırla" kullanıcıları silmez. Dosya `.data/auth.json` (git dışı).
 *
 * Tüm kullanıcılar aynı yetkidedir (süper yönetici): her işlemi yapabilir,
 * kullanıcı ekleyip silebilir. Bu dosya proxy'den de kullanıldığı için
 * "server-only" içe aktarmaz; yalnız sunucuda çalışır (node:crypto, node:fs).
 */
const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "auth.json");

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

function writeAuth(store: AuthStore) {
  mkdirSync(DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 1), { encoding: "utf8", mode: 0o600 });
  renameSync(tmp, FILE);
}

function readAuth(): AuthStore {
  if (existsSync(FILE)) return JSON.parse(readFileSync(FILE, "utf8")) as AuthStore;
  const store: AuthStore = { secret: randomBytes(32).toString("base64url"), users: [] };
  writeAuth(store);
  return store;
}

export const listUsers = () => readAuth().users;
export const findUser = (id: string) => readAuth().users.find((u) => u.id === id) ?? null;
export const findUserByUsername = (username: string) =>
  readAuth().users.find((u) => u.username === normalizeUsername(username)) ?? null;

export function mutateUsers<T>(fn: (users: User[]) => T): T {
  const store = readAuth();
  const out = fn(store.users);
  writeAuth(store);
  return out;
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

/* Oturum çerezi: base64url(id.sürüm.bitiş) + "." + HMAC-SHA256 */
const secret = () => process.env.AUTH_SECRET || readAuth().secret;
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(user: User) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = Buffer.from(`${user.id}.${user.sessionVersion}.${exp}`).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expires: new Date(exp) };
}

/** Geçerli oturumun kullanıcısı; imza, süre, sürüm ve kullanıcının hâlâ var olması denetlenir. */
export function userFromToken(token: string | undefined | null): User | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, version, exp] = Buffer.from(payload, "base64url").toString().split(".");
  if (!id || Number(exp) < Date.now()) return null;
  const user = findUser(id);
  return user && user.sessionVersion === Number(version) ? user : null;
}
