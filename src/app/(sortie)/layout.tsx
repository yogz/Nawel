import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "../sortie.css";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  // Variable font: weight must stay "variable" (not a list) so the opsz axis
  // for optical sizing can be declared. Trade-off: slightly larger font
  // payload than a static cut, but it lets Fraunces scale beautifully from
  // 16px body accents to 96px display titles.
  weight: "variable",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Sortie",
    default: "Sortie",
  },
  description: "Organise tes sorties culturelles entre amis.",
  metadataBase: new URL("https://sortie.colist.fr"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F1E8",
};

export default function SortieRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="theme-sortie font-sans antialiased">{children}</body>
    </html>
  );
}
