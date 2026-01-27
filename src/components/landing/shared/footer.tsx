"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppBranding } from "../../common/app-branding";

interface FooterProps {
  namespace: "Landing" | "LandingAlt" | "LandingC";
}

export function Footer({ namespace }: FooterProps) {
  const t = useTranslations(namespace);

  return (
    <footer className="relative z-20 border-t border-gray-200 bg-gray-50 py-12 pb-28 text-center text-sm text-gray-500 sm:pb-12">
      <div className="mb-6 flex justify-center">
        <AppBranding logoSize={24} variant="icon-text" noLink />
      </div>
      <div className="mb-8 flex justify-center gap-6">
        <a
          href="https://www.instagram.com/colistfr/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-gray-900"
        >
          {t("footerLinks.instagram")}
        </a>
        <Link href="/contact" className="transition-colors hover:text-gray-900">
          {t("footerLinks.contact")}
        </Link>
        <Link href="/behind-the-scenes" className="transition-colors hover:text-gray-900">
          {t("footerLinks.behindTheScenes")}
        </Link>
      </div>
      <p>
        &copy; {new Date().getFullYear()} CoList. {t("footerText")}
      </p>
    </footer>
  );
}
