import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import Script from "next/script";
import "../sortie.css";

// Umami cloud website id for sortie.colist.fr. Script is loaded with
// `strategy="afterInteractive"` (equivalent to the native `defer` hint
// the Umami snippet asks for) so it never blocks the first paint.
const UMAMI_WEBSITE_ID = "383d4d2b-6e94-4215-b02e-39ddc800134b";

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
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
      />
    </html>
  );
}
