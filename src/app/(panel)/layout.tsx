import { AppShell } from "@/components/shell/app-shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
