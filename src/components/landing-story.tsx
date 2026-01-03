"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Send, Users, CheckCircle2, Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useRef } from "react";
import { LanguageSelector } from "./common/language-selector";
import { useTranslations } from "next-intl";

export function LandingStory() {
  const t = useTranslations("LandingStory");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  const timelineSteps = [
    {
      day: t("timeline.day1"),
      title: t("timeline.title1"),
      description: t("timeline.description1"),
      icon: <Sparkles className="h-5 w-5" />,
      image: "/story_inspiration.png",
      color: "bg-purple-100 text-purple-600",
    },
    {
      day: t("timeline.day2"),
      title: t("timeline.title2"),
      description: t("timeline.description2"),
      icon: <Send className="h-5 w-5" />,
      image: "/story_guests.png",
      color: "bg-blue-100 text-blue-600",
    },
    {
      day: t("timeline.day3"),
      title: t("timeline.title3"),
      description: t("timeline.description3"),
      icon: <CheckCircle2 className="h-5 w-5" />,
      image: "/story_shopping.png",
      color: "bg-green-100 text-green-600",
    },
    {
      day: t("timeline.day4"),
      title: t("timeline.title4"),
      description: t("timeline.description4"),
      icon: <Heart className="h-5 w-5" />,
      image: "/story_hero.png",
      color: "bg-rose-100 text-rose-600",
      fullWidth: true,
    },
  ];

  return (
    <div ref={containerRef} className="relative bg-stone-50 font-serif text-stone-900">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 z-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        <div className="absolute right-6 top-6 z-50 font-sans">
          <LanguageSelector variant="compact" showSearch={true} />
        </div>

        {/* Soft, elegant background */}
        <div className="absolute inset-0 -z-10 bg-[#FAF9F6]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="mb-6 font-sans text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            {t("heroSubtitle")}
          </p>
          <h1 className="mb-8 text-5xl font-light tracking-tight text-stone-900 sm:text-7xl lg:text-8xl">
            {t("heroTitle")} <br />
            <span className="font-serif italic text-stone-800">{t("heroTitleHighlight")}</span>.
          </h1>
          <p className="mx-auto mb-12 max-w-xl font-sans text-xl font-light leading-relaxed text-stone-600">
            {t("heroDescription")}
          </p>

          <Link
            href="/login?mode=user"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-10 py-4 font-sans text-base font-medium text-white transition-all hover:bg-stone-800 hover:shadow-lg"
          >
            {t("heroButton")}
          </Link>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute bottom-12"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-sans text-xs uppercase tracking-widest text-stone-400">
              {t("scrollText")}
            </span>
            <ChevronDown className="h-4 w-4 text-stone-400" />
          </div>
        </motion.div>
      </motion.section>

      {/* Narrative Timeline */}
      <section className="relative z-10 bg-white px-6 py-32 font-sans">
        <div className="mx-auto max-w-5xl">
          <div className="absolute bottom-32 left-6 top-32 hidden w-px bg-stone-200 md:left-1/2 md:block" />

          {timelineSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8 }}
              className={`relative mb-32 flex flex-col gap-12 md:flex-row ${index % 2 === 1 ? "md:flex-row-reverse" : ""}`}
            >
              {/* Center Marker */}
              <div className="absolute left-6 z-10 flex hidden h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-stone-50 shadow-sm md:left-1/2 md:flex">
                <span className="font-serif text-xs font-bold text-stone-400">{step.day}</span>
              </div>

              {/* Content */}
              <div className="flex-1 px-4 pt-4 md:px-0 md:text-right">
                {index % 2 === 0 ? (
                  <div className="md:pr-16">
                    <span className="mb-4 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 md:hidden">
                      {step.day}
                    </span>
                    <h3 className="mb-4 font-serif text-3xl font-medium">{step.title}</h3>
                    <p className="text-lg leading-relaxed text-stone-600">{step.description}</p>
                  </div>
                ) : (
                  // Image for even steps on left side
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-stone-100 shadow-xl md:mr-16">
                    <Image src={step.image} alt={step.title} fill className="object-cover" />
                  </div>
                )}
              </div>

              {/* Image / Content Opposite */}
              <div className="flex-1 px-4 pt-4 md:px-0">
                {index % 2 === 0 ? (
                  // Image for odd steps on right side
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-stone-100 shadow-xl md:ml-16">
                    <Image src={step.image} alt={step.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="md:pl-16 md:text-left">
                    <span className="mb-4 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 md:hidden">
                      {step.day}
                    </span>
                    <h3 className="mb-4 font-serif text-3xl font-medium">{step.title}</h3>
                    <p className="text-lg leading-relaxed text-stone-600">{step.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="relative z-10 bg-[#FAF9F6] px-6 py-32 text-center">
        <div className="mx-auto max-w-2xl">
          <Sparkles className="mx-auto mb-8 h-8 w-8 text-stone-400" />
          <h2 className="mb-8 font-serif text-4xl text-stone-900 sm:text-5xl">{t("ctaTitle")}</h2>
          <p className="mb-12 font-sans text-lg font-light text-stone-600">{t("ctaDescription")}</p>
          <Link
            href="/login?mode=user"
            className="inline-flex items-center justify-center rounded-full bg-stone-900 px-12 py-5 font-sans text-lg font-medium text-white transition-all hover:bg-stone-800 hover:shadow-xl"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
