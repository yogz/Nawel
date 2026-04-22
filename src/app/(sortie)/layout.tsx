import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Sortie",
  description: "Organise tes sorties culturelles entre amis.",
  metadataBase: new URL("https://sortie.colist.fr"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F1E8",
};

export default function SortieRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="theme-sortie antialiased">{children}</body>
    </html>
  );
}
