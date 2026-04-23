import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "../sortie.css";

const interTight = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter-tight",
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
  description: "Organise tes sorties entre amis.",
  metadataBase: new URL("https://sortie.colist.fr"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function SortieRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${interTight.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="theme-sortie font-sans antialiased">{children}</body>
    </html>
  );
}
