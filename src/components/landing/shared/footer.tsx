"use client";

import { useTranslations } from "next-intl";

interface FooterProps {
  namespace: "Landing" | "LandingAlt";
}

export function Footer({ namespace }: FooterProps) {
  const t = useTranslations(namespace);

  return (
    <footer className="border-t border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
      <div className="mb-8 flex justify-center gap-6">
        <a
          href="https://www.instagram.com/colistfr/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-gray-900"
        >
          {t("footerLinks.instagram")}
        </a>
        <a href="mailto:contact@colist.fr" className="transition-colors hover:text-gray-900">
          {t("footerLinks.contact")}
        </a>
      </div>
      <p>
        &copy; {new Date().getFullYear()} CoList. {t("footerText")}
      </p>
    </footer>
  );
}
