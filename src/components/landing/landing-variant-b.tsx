"use client";

import { useScroll, useTransform } from "framer-motion";
import { Sparkles, ShoppingBasket, Wand2, CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { DemoInteractive } from "./demo-interactive";
import { Faq } from "./faq";
import { StickyCta } from "./sticky-cta";
import { HeroSection, FeatureCard, CtaFooter } from "./shared";

export function LandingVariantB() {
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
      id: "guests",
      title: t("feature3Title"),
      description: t("feature3Description"),
      icon: <CheckCircle2 className="h-6 w-6" />,
      image: "/alt_guests.png",
    },
    {
      id: "shopping",
      title: t("feature2Title"),
      description: t("feature2Description"),
      icon: <ShoppingBasket className="h-6 w-6" />,
      image: "/alt_shopping.png",
    },
    {
      id: "ai-chef",
      title: t("feature1Title"),
      description: t("feature1Description"),
      icon: <Wand2 className="h-6 w-6" />,
      image: "/alt_ai_chef.png",
      tag: t("feature1Tag"),
    },
    {
      id: "menu",
      title: t("feature4Title"),
      description: t("feature4Description"),
      icon: <Sparkles className="h-6 w-6" />,
      image: "/aura-menu.png",
    },
  ];

  return (
    <div ref={containerRef} className="relative bg-white font-sans text-gray-900">
      <HeroSection
        heroOpacity={heroOpacity}
        heroScale={heroScale}
        variant="landing-alt"
        heroImage="/alt_hero.png"
        badge={t("badge")}
        title={
          <>
            {t("heroTitle")} <br />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {t("heroTitleHighlight")}
            </span>
          </>
        }
        description={t("heroDescription")}
        primaryCta={{
          text: t("ctaStart"),
          icon: <Wand2 className="h-5 w-5 transition-transform group-hover:rotate-12" />,
        }}
        secondaryCta={{ text: t("ctaDemo") }}
        badgeColor="indigo"
        gradientStyle="alt"
      />

      {/* Features Section - Alternating Layout */}
      <section id="discover" className="relative z-10 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-24 sm:gap-40">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.id}
                {...feature}
                index={index}
                variant="landing-alt"
                styleVariant="alt"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <DemoInteractive />

      {/* Social Cloud / Trust Section */}
      <section className="relative z-10 border-y border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h3 className="mb-12 text-2xl font-semibold text-gray-900">{t("socialProofTitle")}</h3>
          <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale" />
          <p className="italic text-gray-500">{t("socialProofQuote")}</p>
        </div>
      </section>

      {/* Call to Action Footer */}
      <CtaFooter
        variant="landing-alt"
        title={t("ctaFooterTitle")}
        description={t("ctaFooterDescription")}
        buttonText={t("ctaFooterButton")}
        notice={t("ctaFooterNotice")}
        styleVariant="alt"
      />

      {/* FAQ Section */}
      <Faq />

      <footer className="border-t border-gray-100 bg-white py-12 text-center text-sm text-gray-500">
        <div className="mb-8 flex justify-center gap-6">
          <a
            href="https://www.instagram.com/colistfr/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900"
          >
            {t("footerLinks.instagram")}
          </a>
          <a href="mailto:contact@colist.fr" className="hover:text-gray-900">
            {t("footerLinks.contact")}
          </a>
        </div>
        <p>
          &copy; {new Date().getFullYear()} CoList. {t("footerText")}
        </p>
      </footer>

      {/* Mobile Sticky CTA */}
      <StickyCta />
    </div>
  );
}
