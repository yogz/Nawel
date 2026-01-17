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
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, getMessages, setRequestLocale } from "next-intl/server";
import { toOpenGraphLocale, getAlternateOpenGraphLocales } from "@/lib/locale-utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });
  const appTitle = t("title") || "CoList";
  const appDescription = t("heroDescription") || "Coordonnez vos repas de fêtes simplement.";

  return {
    title: {
      template: "%s | CoList",
      default: appTitle,
    },
    description: appDescription,
    metadataBase: new URL("https://www.colist.fr"),
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: appTitle,
      description: appDescription,
      url: `https://www.colist.fr/${locale}`,
      type: "website",
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
      siteName: "CoList",
      images: [
        {
          url: "https://www.colist.fr/og-image.png",
          width: 800,
          height: 800,
          alt: appTitle,
          type: "image/png",
        },
      ],
    },
    other: {
      "og:logo": "https://www.colist.fr/LogoIcon.png",
    },
    twitter: {
      card: "summary_large_image",
      title: appTitle,
      description: appDescription,
      images: ["https://www.colist.fr/og-image.png"],
    },
    icons: {
      icon: [
        { url: new URL("/favicon.ico", "https://www.colist.fr"), sizes: "any" },
        {
          url: new URL("/LogoIcon.png", "https://www.colist.fr"),
          type: "image/png",
          sizes: "32x32",
        },
        { url: "/favicon.ico", sizes: "any" },
        { url: "/LogoIcon.png", type: "image/png", sizes: "32x32" },
      ],
      shortcut: [
        { url: new URL("/favicon.ico", "https://www.colist.fr") },
        { url: "/favicon.ico" },
      ],
      apple: [{ url: new URL("/apple-icon.png", "https://www.colist.fr") }, "/apple-icon.png"],
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "CoList",
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: "https://www.colist.fr/fr",
        en: "https://www.colist.fr/en",
        es: "https://www.colist.fr/es",
        pt: "https://www.colist.fr/pt",
        de: "https://www.colist.fr/de",
        el: "https://www.colist.fr/el",
        it: "https://www.colist.fr/it",
        nl: "https://www.colist.fr/nl",
        pl: "https://www.colist.fr/pl",
        sv: "https://www.colist.fr/sv",
        da: "https://www.colist.fr/da",
        "x-default": "https://www.colist.fr/fr",
      },
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1", // Vibrant Indigo to match new header
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
        {/* Favicons - using optimized PNG */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Google Consent Mode v2 - Default State */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              
              // Define default consent state based on localStorage to avoid flashes
              // DEFAULT TO GRANTED: set it to true by default for now
              var consent = 'granted';
              try {
                if (localStorage.getItem('analytics_consent') === 'false') {
                  consent = 'denied';
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
            {/* <CookieConsent /> - Disabled: set it to true by default for now */}
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
