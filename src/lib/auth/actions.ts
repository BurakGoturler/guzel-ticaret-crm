"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/actions";
import { newId } from "@/lib/data/repo";
import {
  findUserByUsername, hashPassword, MIN_PASSWORD, mutateUsers, normalizeUsername, USERNAME_RE, verifyPassword,
  type User,
} from "./core";
import { endSession, getCurrentUser, startSession } from "./session";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });
const fail = (message: string): ActionState => ({ ok: false, message, at: Date.now() });
const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Yalnız uygulama içi yollara dönülür (açık yönlendirme engeli). */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = str(v);
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/giris") ? s : "/";
};

function checkNew(name: string, username: string, password: string, confirm: string): string | null {
  if (name.length < 2) return "Ad soyad girin.";
  if (!USERNAME_RE.test(username)) return "Kullanıcı adı 3–32 karakter; yalnız küçük harf, rakam, nokta, tire, alt çizgi.";
  if (password.length < MIN_PASSWORD) return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  if (password !== confirm) return "Şifreler aynı değil.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Giriş / çıkış                                                       */

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await findUserByUsername(str(fd.get("username")));
  const password = String(fd.get("password") ?? "");
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await wait(600); // deneme-yanılmayı yavaşlatır
    return fail("Kullanıcı adı veya şifre hatalı.");
  }
  await startSession(user);
  redirect(safeNext(fd.get("next")));
}

/** Hiç kullanıcı yokken ilk yönetici hesabını açar; sonra bu yol kapanır. */
export async function setupFirstAdmin(_: ActionState, fd: FormData): Promise<ActionState> {
  const name = str(fd.get("name"));
  const username = normalizeUsername(str(fd.get("username")));
  const password = String(fd.get("password") ?? "");
  const err = checkNew(name, username, password, String(fd.get("confirm") ?? ""));
  if (err) return fail(err);
  const user = await mutateUsers((users) => {
    if (users.length > 0) return null;
    const u: User = { id: newId("u"), name, username, passwordHash: hashPassword(password), sessionVersion: 1, createdAt: new Date().toISOString(), createdBy: null };
    users.push(u);
    return u;
  });
  if (!user) return fail("Yönetici hesabı zaten var; giriş yapın.");
  await startSession(user);
  redirect("/");
}

/** Çerezi siler. İstemci ardından sayfayı tamamen yeniler ki önceki ekranlar bellekte kalmasın. */
export async function logout() {
  await endSession();
}

/* ------------------------------------------------------------------ */
/* Kullanıcı yönetimi — her kullanıcı aynı yetkide (süper yönetici)     */

async function guard() {
  const me = await getCurrentUser();
  if (!me) throw new Error("Oturum gerekli");
  return me;
}

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await guard();
  const name = str(fd.get("name"));
  const username = normalizeUsername(str(fd.get("username")));
  const password = String(fd.get("password") ?? "");
  const err = checkNew(name, username, password, String(fd.get("confirm") ?? ""));
  if (err) return fail(err);
  const created = await mutateUsers((users) => {
    if (users.some((u) => u.username === username)) return false;
    users.push({ id: newId("u"), name, username, passwordHash: hashPassword(password), sessionVersion: 1, createdAt: new Date().toISOString(), createdBy: me.id });
    return true;
  });
  if (!created) return fail(`"${username}" kullanıcı adı alınmış.`);
  refresh();
  return ok(`${name} eklendi; "${username}" ile giriş yapabilir.`);
}

export async function updateUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await guard();
  const id = str(fd.get("id"));
  const name = str(fd.get("name"));
  const username = normalizeUsername(str(fd.get("username")));
  if (name.length < 2) return fail("Ad soyad girin.");
  if (!USERNAME_RE.test(username)) return fail("Kullanıcı adı 3–32 karakter; yalnız küçük harf, rakam, nokta, tire, alt çizgi.");
  const res = await mutateUsers((users) => {
    const u = users.find((x) => x.id === id);
    if (!u) return "Kullanıcı bulunamadı.";
    if (users.some((x) => x.id !== id && x.username === username)) return `"${username}" kullanıcı adı alınmış.`;
    u.name = name;
    u.username = username;
    return null;
  });
  if (res) return fail(res);
  refresh();
  return ok("Kullanıcı güncellendi.");
}

export async function setUserPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await guard();
  const id = str(fd.get("id"));
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return fail(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
  if (password !== String(fd.get("confirm") ?? "")) return fail("Şifreler aynı değil.");
  const user = await mutateUsers((users) => {
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    u.passwordHash = hashPassword(password);
    u.sessionVersion += 1; // açık oturumları kapatır
    return { ...u };
  });
  if (!user) return fail("Kullanıcı bulunamadı.");
  if (user.id === me.id) await startSession(user); // kendi oturumu açık kalsın
  refresh();
  return ok(user.id === me.id ? "Şifreniz değişti." : `${user.name} kullanıcısının şifresi değişti; açık oturumları kapandı.`);
}

export async function deleteUser(id: string): Promise<ActionState> {
  const me = await guard();
  if (id === me.id) return fail("Kendi hesabınızı silemezsiniz.");
  const res = await mutateUsers((users) => {
    if (users.length <= 1) return "Son kullanıcı silinemez.";
    const i = users.findIndex((u) => u.id === id);
    if (i < 0) return "Kullanıcı bulunamadı.";
    users.splice(i, 1);
    return null;
  });
  if (res) return fail(res);
  refresh();
  return ok("Kullanıcı silindi.");
}
