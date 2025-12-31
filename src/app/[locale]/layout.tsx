import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SnowOverlay } from "@/components/snow-overlay";
import { UmamiAnalytics } from "@/components/umami-analytics";
import { GoogleAnalytics } from "@/components/google-analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    template: "%s | Nawel",
    default: "Nawel - Organisateur de fêtes",
  },
  description:
    "Coordonnez vos repas de fêtes simplement. Partagez le lien avec votre famille pour que chacun puisse choisir ce qu'il apporte !",
  metadataBase: new URL("https://nawel.app"),
  openGraph: {
    title: "Nawel - Organisateur de fêtes",
    description: "Coordonnez vos repas de fêtes simplement.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nawel - Organisateur de fêtes",
    description: "Coordonnez vos repas de fêtes simplement.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
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
      <body className="bg-gray-50 antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <SnowOverlay />
          </ThemeProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics />
        <UmamiAnalytics />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
