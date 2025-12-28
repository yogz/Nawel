import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SnowOverlay } from "@/components/snow-overlay";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    template: "%s | Nawel",
    default: "Nawel - Organisateur de fêtes",
  },
  description:
    "Coordonnez vos repas de fêtes simplement. Partagez le lien avec votre famille pour que chacun puisse choisir ce qu'il apporte !",
  metadataBase: new URL("https://nawel.app"), // Replace with actual domain if known, or localhost for now
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

import { UserNav } from "@/components/auth/user-nav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 antialiased">
        <ThemeProvider>
          {children}
          <SnowOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
