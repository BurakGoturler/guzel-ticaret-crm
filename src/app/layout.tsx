import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Güzel Ticaret",
  description: "Ecrin Yaş Sebze Meyve ve Güzel Ticaret — sevkiyat, sözleşme ve kâr takibi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
