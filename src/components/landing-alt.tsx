"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  ChevronDown,
  Sparkles,
  Share2,
  Users,
  ShoppingBasket,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRef } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { useTranslations } from "next-intl";
import { trackLandingCTA } from "@/lib/track-landing";
import { DemoInteractive } from "./demo-interactive";
import { Faq } from "./faq";
import { StickyCta } from "./sticky-cta";

export function LandingAlt() {
  const t = useTranslations("LandingAlt");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      title: t("feature3Title"),
      description: t("feature3Description"),
      icon: <CheckCircle2 className="h-6 w-6" />,
      image: "/alt_guests.png",
    },
    {
      title: t("feature2Title"),
      description: t("feature2Description"),
      icon: <ShoppingBasket className="h-6 w-6" />,
      image: "/alt_shopping.png",
    },
    {
      title: t("feature1Title"),
      description: t("feature1Description"),
      icon: <Wand2 className="h-6 w-6" />,
      image: "/alt_ai_chef.png",
      tag: t("feature1Tag"),
    },
    {
      title: t("feature4Title"),
      description: t("feature4Description"),
      icon: <Sparkles className="h-6 w-6" />,
      image: "/aura-menu.png",
    },
  ];

  return (
    <div ref={containerRef} className="relative bg-white font-sans text-gray-900">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        <div className="absolute right-6 top-6 z-50">
          <LanguageSwitcher />
        </div>
        <div className="absolute inset-0 -z-10">
          <Image
            src="/alt_hero.png"
            alt="Hero Aura"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-white/60 to-white" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600">
            <Sparkles className="h-4 w-4" />
            {t("badge")}
          </span>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:mb-8 sm:text-7xl">
            {t("heroTitle")} <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl px-4 text-xl leading-relaxed text-gray-600 sm:mb-12 sm:text-2xl">
            {t("heroDescription")}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 px-6 sm:flex-row sm:gap-6">
            <Link
              href="/login?mode=user"
              onClick={trackLandingCTA}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-lg font-bold text-white transition-all hover:scale-105 hover:bg-gray-800 hover:shadow-xl sm:w-auto"
            >
              {t("ctaStart")}
              <Wand2 className="h-5 w-5 transition-transform group-hover:rotate-12" />
            </Link>
            <Link
              href="#discover"
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white/80 px-8 py-4 text-lg font-bold text-gray-900 backdrop-blur-sm transition-all hover:border-gray-300 hover:bg-white sm:w-auto"
            >
              {t("ctaDemo")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10"
        >
          <ChevronDown className="h-6 w-6 text-gray-400" />
        </motion.div>
      </motion.section>

      {/* Features Section - Alternating Layout */}
      <section id="discover" className="relative z-10 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-24 sm:gap-40">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`flex flex-col items-center gap-12 lg:gap-24 ${index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"}`}
              >
                <div className="flex-1 space-y-6 text-center lg:text-left">
                  <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                    {feature.icon}
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    {feature.title}
                    {feature.tag && (
                      <span className="ml-4 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 align-middle text-sm font-medium text-purple-800">
                        {feature.tag}
                      </span>
                    )}
                  </h2>
                  <p className="mx-auto max-w-lg text-lg leading-relaxed text-gray-600 sm:text-xl lg:mx-0">
                    {feature.description}
                  </p>
                </div>

                <div className="relative aspect-[4/3] w-full flex-1 transform overflow-hidden rounded-3xl bg-gray-100 shadow-2xl shadow-gray-200 ring-1 ring-gray-900/5 transition-transform duration-700 hover:scale-[1.02]">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover object-top"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <DemoInteractive />

      {/* Social Cloud / Trust Section (Optional Addition) */}
      <section className="relative z-10 border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h3 className="mb-12 text-2xl font-semibold text-gray-900">{t("socialProofTitle")}</h3>
          {/* Mockup logos or text */}
          <div className="flex-wrapjustify-center flex gap-8 opacity-50 grayscale">
            {/* Add meaningful social proof or leave as clean space */}
          </div>
          <p className="italic text-gray-500">{t("socialProofQuote")}</p>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="relative z-10 overflow-hidden bg-white px-6 py-24 text-center sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white opacity-70"></div>
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:mb-8 sm:text-6xl">
            {t("ctaFooterTitle")}
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600 sm:mb-12">
            {t("ctaFooterDescription")}
          </p>
          <Link
            href="/login?mode=user"
            onClick={trackLandingCTA}
            className="inline-flex w-full items-center justify-center rounded-full bg-gray-900 px-10 py-5 text-xl font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-gray-800 hover:shadow-2xl sm:w-auto"
          >
            {t("ctaFooterButton")}
          </Link>
          <p className="mt-6 text-sm text-gray-500">{t("ctaFooterNotice")}</p>
        </div>
      </section>

      {/* FAQ Section */}
      <Faq />

      <footer className="border-t border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
        <div className="mb-8 flex justify-center gap-6">
          <a href="#" className="hover:text-gray-900">
            {t("footerLinks.instagram")}
          </a>
          <a href="#" className="hover:text-gray-900">
            {t("footerLinks.twitter")}
          </a>
          <a href="#" className="hover:text-gray-900">
            {t("footerLinks.contact")}
          </a>
        </div>
        <p>
          &copy; {new Date().getFullYear()} Nawel. {t("footerText")}
        </p>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyCta />
    </div>
  );
}
