"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import {
  Sparkles,
  ShoppingBasket,
  Wand2,
  CheckCircle2,
  MessageSquare,
  Smartphone,
  Zap,
} from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { DemoInteractive } from "./demo-interactive";
import { Faq } from "./faq";
import { StickyCta } from "./sticky-cta";
import { HeroSection, FeatureCard, CtaFooter, Footer } from "./shared";
import { Link } from "@/i18n/navigation";

export function LandingVariantC() {
  const t = useTranslations("LandingC");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      id: "ai-chef",
      title: t("feature1Title"),
      description: t("feature1Description"),
      icon: <Wand2 className="h-6 w-6" />,
      image: "/alt_ai_chef.png",
      tag: "Magic",
    },
    {
      id: "guests",
      title: t("feature2Title"),
      description: t("feature2Description"),
      icon: <CheckCircle2 className="h-6 w-6" />,
      image: "/alt_guests.png",
    },
    {
      id: "shopping",
      title: t("feature3Title"),
      description: t("feature3Description"),
      icon: <ShoppingBasket className="h-6 w-6" />,
      image: "/alt_shopping.png",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative bg-white font-sans text-gray-900 selection:bg-orange-100 selection:text-orange-900"
    >
      {/* 1. Hero Section: The Promise */}
      <HeroSection
        heroOpacity={heroOpacity}
        heroScale={heroScale}
        variant="landing-c"
        heroImage="/alt_hero.png" // Reusing distinct hero image
        badge={t("badge")}
        title={
          <>
            {t("heroTitle")} <br />
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
          </>
        }
        description={t("heroDescription")}
        primaryCta={{
          text: t("ctaStart"),
          icon: <Zap className="h-4 w-4 fill-current" />,
        }}
        secondaryCta={{ text: t("ctaDemo") }}
        badgeColor="red" // Using red/orange theme
        gradientStyle="default"
      />

      {/* 2. Social Proof Bar: Trust */}
      <section className="relative z-10 border-b border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              {t("socialProofTitle")}
            </p>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200">
                  <Image
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt="User"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-bold text-gray-600">
                +2k
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Problem Agitation: The Infinite Group Chat */}
      <section className="relative z-10 bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {t("problemTitle")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">{t("problemDescription")}</p>
          </div>

          {/* Visual representation of the chaos - simplified chat UI */}
          <div className="mt-16 flex justify-center">
            <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-4 shadow-xl">
              <div className="absolute -right-4 -top-6 rotate-12 rounded-2xl bg-red-500 px-4 py-2 font-bold text-white shadow-lg">
                STOP! 🛑
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100" />
                  <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-600">
                    Who's bringing the wine? 🍷
                  </div>
                </div>
                <div className="flex flex-row-reverse gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100" />
                  <div className="max-w-[80%] rounded-2xl bg-green-50 px-4 py-2 text-sm text-green-800">
                    I thought Mark was?
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100" />
                  <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-600">
                    Mark is bringing chips. We have 5 bags of chips now. 🥔
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The Solution: Features */}
      <section id="discover" className="relative z-10 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-24 sm:gap-40">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                {...feature}
                index={index}
                variant="landing-c"
                styleVariant={index % 2 === 0 ? "default" : "alt"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive Demo Section */}
      <DemoInteractive />

      {/* 6. Friction Remover / Trust: Grandma Proof */}
      <section className="relative z-10 overflow-hidden bg-orange-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-900/5 sm:p-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Smartphone className="h-8 w-8" />
            </div>
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-gray-900">
              {t("trustTitle")}
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">{t("trustDescription")}</p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> No App Download
              </span>
              <span className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Works on iPhone/Android
              </span>
              <span className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Instant Sync
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action Footer */}
      <CtaFooter
        variant="landing-c"
        title={t("ctaFooterTitle")}
        description={t("ctaFooterNotice")}
        buttonText={t("ctaFooterButton")}
        styleVariant="default"
      />

      {/* FAQ Section */}
      <Faq />

      <Footer namespace="LandingC" />

      {/* Mobile Sticky CTA */}
      <StickyCta />
    </div>
  );
}
