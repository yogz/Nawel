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
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎄</text></svg>",
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
          <div className="flex justify-end p-4">
            <UserNav />
          </div>
          {children}
          <SnowOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
