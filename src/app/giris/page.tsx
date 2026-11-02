import type { Metadata } from "next";
import { connection } from "next/server";
import { VideoBackdrop } from "@/components/shell/video-backdrop";
import { listUsers } from "@/lib/auth/core";
import { LoginForm, SetupForm } from "./forms";

export const metadata: Metadata = { title: "Giriş · Güzel Ticaret" };

// Kullanıcı listesi istek anında okunur (.data/auth.json).
export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const setup = listUsers().length === 0;
  const { next } = await searchParams;

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-shell text-white">
      <VideoBackdrop className="-z-10" />

      <header className="absolute top-0 left-0 flex items-center gap-3 px-4 py-6 sm:px-8">
        <div className="grid size-11 place-items-center rounded-xl bg-white/12 text-xl font-semibold ring-1 ring-white/20 backdrop-blur">G</div>
        <div className="leading-tight [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">
          <div className="text-lg font-semibold">Güzel Ticaret</div>
          <div className="text-xs text-white/80">Ecrin Yaş Sebze Meyve · Güzel Ticaret · Halis</div>
        </div>
      </header>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 pt-24 pb-14 sm:px-8 lg:pt-10">
        <div className="w-full max-w-[400px] rounded-2xl border border-white/15 bg-surface/95 p-7 text-ink shadow-2xl backdrop-blur-md">
          <h2 className="text-[18px] font-semibold text-ink">{setup ? "İlk yönetici hesabı" : "Hesabınıza giriş yapın"}</h2>
          {setup ? (
            <p className="mt-1 mb-6 text-[13px] text-muted">
              Sistemde henüz kullanıcı yok. Tüm yetkilere sahip yönetici hesabını oluşturun; diğer kullanıcıları içeriden eklersiniz.
            </p>
          ) : (
            <div className="mb-5" />
          )}
          {setup ? <SetupForm /> : <LoginForm next={next ?? ""} />}
        </div>
      </div>

      <p className="absolute bottom-5 left-4 text-[11px] text-white/45 sm:left-8">© {new Date().getFullYear()} Güzel Ticaret · Görüntüler: Mixkit</p>
    </main>
  );
}
