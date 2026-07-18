import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Зал — планировка помещений",
  description: "Расстановка столов, стульев и рассадка гостей",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Зал",
  },
};

export const viewport: Viewport = {
  themeColor: "#e6eaf2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans pb-[env(safe-area-inset-bottom)]">{children}</body>
    </html>
  );
}
