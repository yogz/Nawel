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
import { AnalyticsSessionSync } from "@/components/analytics/analytics-session-sync";
import { AnalyticsMonitor } from "@/components/analytics/analytics-monitor";
import { Toaster } from "sonner";

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
    url: "https://colist.fr",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "https://colist.fr/og-image.png",
        width: 1024,
        height: 1024,
        alt: appTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: "Coordonnez vos repas de fêtes simplement.",
    images: ["https://colist.fr/og-image.png"],
  },
  icons: {
    icon: [
      // URLs absolues pour éviter les problèmes de proxy/cache
      { url: new URL("/favicon.ico", "https://colist.fr"), sizes: "any" },
      { url: new URL("/LogoIcon.png", "https://colist.fr"), type: "image/png", sizes: "32x32" },
      // Fallback avec chemins relatifs
      { url: "/favicon.ico", sizes: "any" },
      { url: "/LogoIcon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: [{ url: new URL("/favicon.ico", "https://colist.fr") }, { url: "/favicon.ico" }],
    apple: [{ url: new URL("/apple-icon.png", "https://colist.fr") }, "/apple-icon.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CoList",
  },
  alternates: {
    canonical: "https://colist.fr",
    languages: {
      fr: "https://colist.fr/fr",
      en: "https://colist.fr/en",
      es: "https://colist.fr/es",
      pt: "https://colist.fr/pt",
      de: "https://colist.fr/de",
      el: "https://colist.fr/el",
      it: "https://colist.fr/it",
      nl: "https://colist.fr/nl",
      pl: "https://colist.fr/pl",
      sv: "https://colist.fr/sv",
      da: "https://colist.fr/da",
      "x-default": "https://colist.fr/fr",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

import { BugReportButton } from "@/components/feedback/bug-report-button";
import { VerificationBanner } from "@/components/auth/verification-banner";
import { JsonLd } from "@/components/seo/json-ld";
import { PWAPrompt } from "@/components/pwa-prompt";

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
        {/* Favicons explicites pour forcer le chargement */}
        <link rel="icon" type="image/x-icon" href="https://colist.fr/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="https://colist.fr/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="https://colist.fr/LogoIcon.png" />
        <link rel="apple-touch-icon" href="https://colist.fr/apple-icon.png" />

        {/* Google Consent Mode v2 - Default State */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              
              // Define default consent state based on localStorage to avoid flashes
              var consent = 'denied';
              try {
                if (localStorage.getItem('analytics_consent') === 'true') {
                  consent = 'granted';
                }
              } catch (e) {}

              gtag('consent', 'default', {
                'analytics_storage': consent,
                'ad_storage': consent,
                'ad_user_data': consent,
                'ad_personalization': consent,
                'wait_for_update': 500
              });
              
              // Enable GA4 Debug Mode if requested
              try {
                if (localStorage.getItem('ga_debug') === 'true') {
                  window['ga-disable-${process.env.NEXT_PUBLIC_GA_ID || "G-F0RFQNG8SP"}'] = false;
                }
              } catch (e) {}
            `,
          }}
        />

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
                  document.body.classList.add('theme-' + theme);
                } catch (e) {}
              })()
            `,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <JsonLd locale={locale} />
            <VerificationBanner />
            {children}
            <BugReportButton />
            <SnowOverlay />
            <CookieConsent />
            <AnalyticsSessionSync />
            <AnalyticsMonitor />
            <PWAPrompt />
            <Toaster position="top-center" richColors duration={2000} />
          </ThemeProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-F0RFQNG8SP"} />
      </body>
    </html>
  );
}
