import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "../sortie.css";

const UMAMI_WEBSITE_ID = "383d4d2b-6e94-4215-b02e-39ddc800134b";

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
  // Pages with their own preview (`[slugOrId]`, `profile/[username]`) replace
  // these via their own `generateMetadata` + `opengraph-image.tsx`.
  //
  // The image URL is hand-written (not auto-derived from the route file) on
  // purpose: Next.js would emit `/sortie/opengraph-image-<hash>`, which the
  // hostname proxy in `src/proxy.ts` re-rewrites into `/sortie/sortie/...`
  // and 404s. Pointing crawlers at `/opengraph-image` directly lets the
  // proxy rewrite once into the (sortie)/sortie/opengraph-image.tsx route
  // and serve the PNG. Pages of an outing build their image URL the same
  // way (see [slugOrId]/page.tsx).
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Sortie",
    title: "Sortie",
    description: "Entre amis, ça s'organise.",
    url: "https://sortie.colist.fr",
    images: [
      {
        url: "https://sortie.colist.fr/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Sortie — entre amis, ça s'organise",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sortie",
    description: "Entre amis, ça s'organise.",
    images: ["https://sortie.colist.fr/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        <div className="relative mx-auto min-h-dvh w-full max-w-[520px] bg-[var(--sortie-bg)] md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-clip md:rounded-[2.25rem] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(199,255,60,0.12)] md:ring-1 md:ring-white/5">
          {children}
        </div>
      </body>
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id={UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
      />
    </html>
  );
}
