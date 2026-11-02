import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth/core";

/**
 * Giriş kapısı: geçerli oturum yoksa her sayfa /giris'e yönlenir.
 * Server action'lar ayrıca kendi içinde oturumu denetler (bkz. lib/actions.ts).
 */
export function proxy(req: NextRequest) {
  const user = userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;

  if (pathname === "/giris") {
    return user ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (user) return NextResponse.next();

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new NextResponse("Oturum gerekli", { status: 401 });
  }
  const url = new URL("/giris", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|mp4|webm)$).*)"],
};
