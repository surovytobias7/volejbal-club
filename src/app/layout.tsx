import type { Metadata, Viewport } from "next";
import { clubBrand } from "@/lib/club-brand";
import "@fontsource-variable/manrope";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: `${clubBrand.name} · Klubový priestor`,
    template: `%s · ${clubBrand.shortName}`,
  },
  description: "Tréningy, tímy a klubový život na jednom mieste.",
  robots: { index: false, follow: false },
  icons: {
    icon: { url: clubBrand.logo, type: "image/png" },
    apple: clubBrand.logo,
  },
};
export const viewport: Viewport = { themeColor: clubBrand.blue };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
