import {
  Building2, Carrot, ChartColumnBig, FileText, HandCoins, LayoutDashboard, Map, PackageX, Settings, ShoppingBasket, UserCog, Users, Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Genel",
    items: [
      { href: "/", label: "Panel", icon: LayoutDashboard },
      { href: "/harita", label: "Harita", icon: Map },
      { href: "/raporlar", label: "Raporlar", icon: ChartColumnBig },
    ],
  },
  {
    title: "İş süreçleri",
    items: [
      { href: "/satislar", label: "Satışlar", icon: ShoppingBasket },
      { href: "/halis", label: "Halis", icon: HandCoins },
      { href: "/sozlesmeler", label: "Sözleşmeler", icon: FileText },
      { href: "/fire-iade", label: "Fire & İade", icon: PackageX },
      { href: "/masraflar", label: "Masraflar", icon: Wallet },
    ],
  },
  {
    title: "Tanımlar",
    items: [
      { href: "/urunler", label: "Ürünler", icon: Carrot },
      { href: "/musteriler", label: "Müşteriler", icon: Users },
      { href: "/firmalar", label: "Firmalar", icon: Building2 },
      { href: "/ayarlar", label: "Ayarlar", icon: Settings },
      { href: "/kullanicilar", label: "Kullanıcılar", icon: UserCog },
    ],
  },
];
