import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth/session";

// Tüm ekranlar güncel veriyi istek anında okur (.data/db.json); önceden derlenmez.
export const instant = false;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, username: user.username }}>{children}</AppShell>;
}
