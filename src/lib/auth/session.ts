import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSessionToken, SESSION_COOKIE, userFromToken, type User } from "./core";

/** Giriş yapmış kullanıcı (yoksa null). */
export async function getCurrentUser(): Promise<User | null> {
  await connection(); // süre denetimi (Date.now) istek anında yapılsın
  return userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Sayfalar için: giriş yoksa giriş ekranına yönlendirir. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function startSession(user: User) {
  const { token, expires } = await createSessionToken(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
