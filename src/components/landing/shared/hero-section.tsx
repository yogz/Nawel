"use client";

import { motion, type MotionValue } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { LanguageSelector } from "@/components/common/language-selector";
import { sendGAEvent } from "@next/third-parties/google";
import { trackDiscoverClick } from "@/lib/analytics";
import { AuthNavButton } from "./auth-nav-button";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";

interface HeroSectionProps {
  heroOpacity: MotionValue<number>;
  heroScale: MotionValue<number>;
  variant: string;
  heroImage: string;
  badge: string;
  title: React.ReactNode;
  description: string;
  primaryCta: {
    text: string;
    icon?: React.ReactNode;
  };
  secondaryCta: {
    text: string;
  };
  /** Badge color scheme */
  badgeColor?: "red" | "indigo";
  /** Gradient overlay style */
  gradientStyle?: "default" | "alt";
  /** Optional rotation variants */
  rotationVariants?: {
    title: React.ReactNode;
    description: string;
    primaryCtaText: string;
  }[];
  rotationInterval?: number;
}

export function HeroSection({
  heroOpacity,
  heroScale,
  variant,
  heroImage,
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  badgeColor = "red",
  gradientStyle = "default",
  rotationVariants,
  rotationInterval = 5000,
}: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!rotationVariants || rotationVariants.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % rotationVariants.length);
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [rotationVariants, rotationInterval]);

  const currentVariant = rotationVariants ? rotationVariants[activeIndex] : null;

  const displayTitle = currentVariant?.title || title;
  const displayDescription = currentVariant?.description || description;
  const displayCtaText = currentVariant?.primaryCtaText || primaryCta.text;

  const badgeClasses =
    badgeColor === "indigo"
      ? "border border-indigo-100 bg-indigo-50 text-indigo-600"
      : "bg-red-50 text-red-600";

  const gradientClasses =
    gradientStyle === "alt"
      ? "bg-gradient-to-b from-purple-900/10 via-white/60 to-white"
      : "bg-gradient-to-b from-purple-900/20 via-white/40 to-white";

  return (
    <motion.section
      style={{ opacity: heroOpacity, scale: heroScale }}
      className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div className="absolute right-6 top-6 z-50 flex items-center gap-3">
        <AuthNavButton />
        {!session && (
          <Link
            href="/login"
            className="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 transition-all hover:bg-gray-50 active:scale-95"
          >
            {useTranslations("Login")("signinButton")}
          </Link>
        )}
        <LanguageSelector variant="compact" showSearch />
      </div>
      <div className="absolute inset-0 -z-10">
        <Image
          src={heroImage}
          alt="Hero Aura"
          fill
          sizes="100vw"
          className="object-cover opacity-60"
          priority
          fetchPriority="high"
        />
        <div className={`absolute inset-0 ${gradientClasses}`} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl"
      >
        <span
          className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium sm:mb-6 ${badgeClasses}`}
        >
          <Sparkles className="h-4 w-4" />
          {badge}
        </span>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:mb-6 sm:text-7xl">
              {displayTitle}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl px-4 text-lg leading-relaxed text-gray-600 sm:mb-10 sm:text-2xl">
              {displayDescription}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 px-6 sm:flex-row sm:gap-4">
              <Link
                href="/login?mode=user"
                onClick={() => sendGAEvent("event", "cta_click", { location: "hero", variant })}
                className="group flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3.5 text-base font-semibold text-white transition-all hover:scale-105 hover:bg-gray-800 hover:shadow-xl sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
              >
                {displayCtaText}
                {primaryCta.icon}
              </Link>
              <Link
                href="#discover"
                onClick={() => trackDiscoverClick(variant)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-900 transition-all hover:bg-gray-50 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
              >
                {secondaryCta.text}
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-10"
      >
        <ChevronDown className="h-6 w-6 text-gray-400" />
      </motion.div>
    </motion.section>
  );
}
