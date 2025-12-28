import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en", "el", "de", "es", "pt"],
  defaultLocale: "fr",
});

export type Locale = (typeof routing.locales)[number];
