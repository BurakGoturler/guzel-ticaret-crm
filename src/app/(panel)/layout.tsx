import { AppShell } from "@/components/shell/app-shell";

// Tüm ekranlar güncel veriyi istek anında okur (.data/db.json); önceden derlenmez.
export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
