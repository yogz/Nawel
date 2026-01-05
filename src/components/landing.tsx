"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Share2, Users, Calendar } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "./common/language-selector";
import { DemoInteractive } from "./demo-interactive";
import { Faq } from "./faq";
import { StickyCta } from "./sticky-cta";
import { sendGAEvent } from "@next/third-parties/google";
import { trackDiscoverClick, trackFeatureView } from "@/lib/analytics";
import { useTrackView } from "@/hooks/use-track-view";

export function Landing() {
  const t = useTranslations("Landing");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      id: "collaboration",
      title: t("feature2Title"),
      description: t("feature2Description"),
      icon: <Users className="h-6 w-6" />,
      image: "/aura-collaboration.png",
    },
    {
      id: "sharing",
      title: t("feature4Title"),
      description: t("feature4Description"),
      icon: <Share2 className="h-6 w-6" />,
      image: "/aura-checklist.png",
    },
    {
      id: "ai",
      title: t("feature3Title"),
      description: t("feature3Description"),
      icon: <Sparkles className="h-6 w-6" />,
      image: "/aura-ai.png",
    },
    {
      id: "calendar",
      title: t("feature1Title"),
      description: t("feature1Description"),
      icon: <Calendar className="h-6 w-6" />,
      image: "/aura-menu.png",
    },
  ];

  return (
    <div ref={containerRef} className="relative bg-white text-gray-900">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        <div className="absolute right-6 top-6 z-50">
          <LanguageSelector variant="compact" showSearch={true} />
        </div>
        <div className="absolute inset-0 -z-10">
          <Image
            src="/aura-hero.png"
            alt="Hero Aura"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-white/40 to-white" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600">
            <Sparkles className="h-4 w-4" />
            {t("badge")}
          </span>
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:mb-6 sm:text-7xl">
            {t("title")}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl px-4 text-lg leading-relaxed text-gray-600 sm:mb-10 sm:text-2xl">
            {t("heroDescription")}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 px-6 sm:flex-row sm:gap-4">
            <Link
              href="/login?mode=user"
              onClick={() =>
                sendGAEvent("event", "cta_click", { location: "hero", variant: "landing" })
              }
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-gray-800 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {t("getStarted")}
            </Link>
            <Link
              href="#discover"
              onClick={() => trackDiscoverClick("landing")}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-900 transition-all hover:bg-gray-50 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {t("discover")}
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

      {/* Features Section */}
      <section id="discover" className="relative z-10 bg-gray-50 py-16 sm:py-32">
        <div className="max-xl mx-auto px-6">
          <div className="grid gap-16 sm:gap-32">
            {features.map((feature, index) => (
              <FeatureCard key={feature.id} {...feature} index={index} variant="landing" />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <DemoInteractive />

      {/* Call to Action Footer */}
      <section className="relative z-10 bg-white px-6 py-20 text-center sm:py-32">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-bold sm:mb-8 sm:text-6xl">{t("ctaTitle")}</h2>
          <p className="mb-8 text-lg text-gray-600 sm:mb-12 sm:text-xl">{t("ctaDescription")}</p>
          <Link
            href="/login?mode=user"
            onClick={() =>
              sendGAEvent("event", "cta_click", { location: "footer", variant: "landing" })
            }
            className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-8 py-4 text-lg font-bold text-white transition-all hover:bg-red-700 sm:w-auto sm:px-10 sm:py-5 sm:text-xl"
          >
            {t("getStarted")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12 text-center text-sm text-gray-500">
        <p>{t("footer")}</p>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyCta />
    </div>
  );
}

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  index: number;
  variant: string;
}

function FeatureCard({ id, title, description, icon, image, index, variant }: FeatureCardProps) {
  const ref = useTrackView<HTMLDivElement>({
    onView: useCallback(() => trackFeatureView(id, variant), [id, variant]),
    threshold: 0.3,
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className={`flex flex-col items-center gap-12 sm:flex-row ${index % 2 === 1 ? "sm:flex-row-reverse" : ""}`}
    >
      <div className="flex-1 space-y-4 sm:space-y-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100 sm:h-12 sm:w-12 sm:rounded-2xl">
          {icon}
        </div>
        <h2 className="text-2xl font-bold sm:text-4xl">{title}</h2>
        <p className="text-base leading-relaxed text-gray-600 sm:text-lg">{description}</p>
      </div>
      <div className="relative aspect-[16/10] w-full flex-1 overflow-hidden rounded-2xl bg-gray-200 shadow-xl shadow-gray-200 ring-1 ring-gray-900/5 sm:rounded-3xl sm:shadow-2xl">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-top transition-transform duration-700 hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent" />
      </div>
    </motion.div>
  );
}
