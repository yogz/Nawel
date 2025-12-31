"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function UmamiAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Configuration Umami
    // Remplacez par votre URL Umami et Website ID
    const UMAMI_URL = "https://VOTRE-INSTANCE.vercel.app"; // ou cloud.umami.is
    const UMAMI_WEBSITE_ID = "VOTRE-WEBSITE-ID";

    // Charger le script Umami
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `${UMAMI_URL}/script.js`;
    script.setAttribute("data-website-id", UMAMI_WEBSITE_ID);
    document.head.appendChild(script);
  }, []);

  // Track les changements de page
  useEffect(() => {
    if ((window as any).umami) {
      (window as any).umami.track(pathname);
    }
  }, [pathname, searchParams]);

  return null;
}
