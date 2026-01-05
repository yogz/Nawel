import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SnowOverlay } from "@/components/snow-overlay";
import { CookieConsent } from "@/components/common/cookie-consent";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const appTitle = "CoList - Organisateur de fêtes";

export const metadata: Metadata = {
  title: {
    template: "%s | CoList",
    default: "CoList",
  },
  description:
    "Coordonnez vos repas de fêtes simplement. Partagez le lien avec votre famille pour que chacun puisse choisir ce qu'il apporte !",
  metadataBase: new URL("https://colist.fr"),
  openGraph: {
    title: appTitle,
    description: "Coordonnez vos repas de fêtes simplement.",
    type: "website",
    locale: "fr_FR",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: "Coordonnez vos repas de fêtes simplement.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/LogoIcon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CoList",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = 'aurora';
                  var stored = localStorage.getItem('colist-theme');
                  if (stored) {
                    var parsed = JSON.parse(stored);
                    theme = parsed.id || 'aurora';
                  }
                  if (theme !== 'none') {
                    document.body.classList.add('theme-' + theme);
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <SnowOverlay />
            <CookieConsent />
          </ThemeProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-F0RFQNG8SP"} />
      </body>
    </html>
  );
}
