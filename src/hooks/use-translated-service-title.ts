import { useTranslations } from "next-intl";
import { translateServiceTitle } from "@/lib/service-utils";

/**
 * Hook to get translated service title.
 * If the title matches a known service type key (apero, entree, plat, etc.),
 * returns the translated value. Otherwise returns the original title.
 */
export function useTranslatedServiceTitle(title: string): string {
  const t = useTranslations();
  return translateServiceTitle(title, (key) => t(key));
}
