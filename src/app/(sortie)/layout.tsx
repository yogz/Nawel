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
  // Impact.com site-ownership verification. Token is intentionally
  // public — it's there for Impact's bot to read off the page when
  // confirming we own this domain. Lives on every (sortie) route via
  // the layout so Impact can verify against any URL it crawls.
  verification: {
    other: {
      "impact-site-verification": "96f5c8af-11a0-43f5-900f-9a80069517ef",
    },
  },
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
      <body className="theme-sortie font-sans antialiased">
        {children}
        {/* Impact.com site-ownership verification, on-page mirror of the
            meta tag in `metadata.verification.other`. Impact's docs
            officially read the meta, but some integrations also scan body
            text — a partner-requested redundancy, harmless either way.
            Renders below the fold (after every page's `min-h-[100dvh]`
            main), at a deliberately discreet size so it doesn't compete
            with the page's own footer / FAB. */}
        <p
          aria-hidden="true"
          className="px-6 pb-6 pt-2 text-center text-[10px] tracking-wide text-encre-300"
        >
          Impact-Site-Verification: 96f5c8af-11a0-43f5-900f-9a80069517ef
        </p>
      </body>
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
      />
    </html>
  );
}
