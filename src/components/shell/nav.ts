import {
  Building2, Carrot, ChartColumnBig, FileText, LayoutDashboard, PackageX, Settings, Truck, Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
}

export const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Genel",
    items: [
      { href: "/", label: "Panel", icon: LayoutDashboard, ready: true },
      { href: "/raporlar", label: "Raporlar", icon: ChartColumnBig, ready: true },
    ],
  },
  {
    title: "İş süreçleri",
    items: [
      { href: "/sevkiyatlar", label: "Sevkiyatlar", icon: Truck, ready: false },
      { href: "/sozlesmeler", label: "Sözleşmeler", icon: FileText, ready: false },
      { href: "/fire-iade", label: "Fire & İade", icon: PackageX, ready: false },
      { href: "/masraflar", label: "Masraflar", icon: Wallet, ready: false },
    ],
  },
  {
    title: "Tanımlar",
    items: [
      { href: "/urunler", label: "Ürünler", icon: Carrot, ready: false },
      { href: "/firmalar", label: "Firmalar", icon: Building2, ready: false },
      { href: "/ayarlar", label: "Ayarlar", icon: Settings, ready: false },
    ],
  },
];
