import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SortieAnalyticsSessionSync } from "@/features/sortie/components/sortie-analytics-session-sync";
import "../sortie.css";

// Site Umami dédié à Sortie (créé 2026-05-05). Avant cette date, Sortie
// et CoList partageaient l'id `383d4d2b-…`, ce qui polluait les KPIs
// site (visiteurs/pageviews/top paths) du dashboard `/sortie/admin/stat`.
// CoList garde l'ancien id côté `(colist)/[locale]/layout.tsx`.
const UMAMI_WEBSITE_ID = "76add338-a076-4a94-98ba-d78dc7bc212d";

// GenZ design system: Unbounded for display, Space Grotesk for body,
// JetBrains Mono for data/labels. We re-use the historical CSS var names
// (`--font-inter`, `--font-inter-tight`) so the existing `font-sans` /
// `font-serif` className strings keep resolving — they now point at the
// new families without any churn in component code.
const display = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  display: "swap",
  variable: "--font-inter-tight",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-pilot-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Sortie",
    default: "Sortie",
  },
  description: "Entre amis, ça s'organise.",
  metadataBase: new URL("https://sortie.colist.fr"),
  robots: { index: false, follow: false },
  // Default OG/Twitter for routes that don't override (home, /nouvelle, /moi).
  // The image, dimensions, and twitter:image meta tags are populated
  // automatically from `(sortie)/sortie/opengraph-image.tsx` by the
  // Next.js metadata convention. The proxy in `src/proxy.ts` is patched
  // to pass `/opengraph-image` paths through without re-prefixing — see
  // the comment there for why we don't override `images` here.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Sortie",
    title: "Sortie",
    description: "Entre amis, ça s'organise.",
    url: "https://sortie.colist.fr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sortie",
    description: "Entre amis, ça s'organise.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Désactive le pinch-zoom pour aligner Sortie sur le pattern app
  // mobile-first : le contenu est déjà 16px+ (pas de zoom auto iOS sur
  // les inputs), et le pinch créait un décalage visuel sur les éléments
  // `position: fixed` (FAB ScrollToAction) qui restaient ancrés au
  // layout viewport pendant que le contenu rétrécissait. Les utilisateurs
  // qui ont besoin d'agrandir passent par le zoom système iOS/Android
  // (triple-tap accessibilité), qui zoom le rendu sans décaler le DOM.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export default function SortieRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
      style={{ colorScheme: "dark" }}
    >
      <body className="theme-sortie font-sans antialiased md:bg-[radial-gradient(ellipse_at_top_left,rgba(199,255,60,0.08),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(255,61,129,0.06),transparent_55%),#000]">
        <div className="relative mx-auto min-h-dvh w-full max-w-[520px] overflow-x-clip bg-[var(--sortie-bg)] md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-clip md:rounded-[2.25rem] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(199,255,60,0.12)] md:ring-1 md:ring-white/5">
          {children}
        </div>
        <SortieAnalyticsSessionSync />
        {/* Vercel Speed Insights (Core Web Vitals par route) + Analytics
         * (pageviews/visitors Vercel). Les SDK étaient déjà installés
         * mais montés uniquement côté CoList ; aucun signal Sortie n'était
         * remonté avant cette PR. Cf. ANALYTICS_AUDIT.md §10.3 P0 #1. */}
        <SpeedInsights />
        <Analytics />
      </body>
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
      />
    </html>
  );
}
