"use client";

import { useScroll, useTransform } from "framer-motion";
import { Sparkles, Share2, Users, Calendar } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { DemoInteractive } from "./demo-interactive";
import { Faq } from "./faq";
import { StickyCta } from "./sticky-cta";
import { HeroSection, FeatureCard, CtaFooter, Footer } from "./shared";

export function LandingDefault() {
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
      <HeroSection
        heroOpacity={heroOpacity}
        heroScale={heroScale}
        variant="landing"
        heroImage="/aura-hero.png"
        badge={t("badge")}
        title={t("title")}
        description={t("heroDescription")}
        primaryCta={{ text: t("getStarted") }}
        secondaryCta={{ text: t("discover") }}
        badgeColor="red"
        gradientStyle="default"
      />

      {/* Features Section */}
      <section id="discover" className="relative z-10 bg-gray-50 py-16 sm:py-32">
        <div className="max-xl mx-auto px-6">
          <div className="grid gap-16 sm:gap-32">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                {...feature}
                index={index}
                variant="landing"
                styleVariant="default"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <DemoInteractive />

      {/* Call to Action Footer */}
      <CtaFooter
        variant="landing"
        title={t("ctaTitle")}
        description={t("ctaDescription")}
        buttonText={t("getStarted")}
        styleVariant="default"
      />

      {/* FAQ Section */}
      <Faq />

      <Footer namespace="Landing" />

      {/* Mobile Sticky CTA */}
      <StickyCta text={t("ctaFooterButton")} variant="landing" />
    </div>
  );
}
