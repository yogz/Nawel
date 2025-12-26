"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Share2, Users, Calendar } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

export function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    {
      title: "Organisation sans effort",
      description:
        "Coordonnez vos repas de fêtes simplement. Plus besoin de jongler avec des messages interminables.",
      icon: <Calendar className="h-6 w-6" />,
      image: "/feature.png",
    },
    {
      title: "Partage Collaboratif",
      description:
        "Partagez un lien unique avec vos proches. Chacun peut choisir ce qu'il apporte en un clic.",
      icon: <Share2 className="h-6 w-6" />,
      image: "/feature.png",
    },
    {
      title: "Gérez vos Invités",
      description: "Gardez un œil sur qui vient et ce qui manque. L'hôte parfait, sans le stress.",
      icon: <Users className="h-6 w-6" />,
      image: "/feature.png",
    },
  ];

  return (
    <div ref={containerRef} className="relative bg-white text-gray-900">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      >
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero.png"
            alt="Hero Christmas"
            fill
            className="object-cover opacity-20 blur-sm"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/50 to-white" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600">
            <Sparkles className="h-4 w-4" />
            La nouvelle façon de festoyer
          </span>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl">Nawel</h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600 sm:text-2xl">
            L&apos;organisateur d&apos;événements qui rend les préparatifs aussi magiques que la
            fête elle-même.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group flex items-center justify-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-gray-800 hover:ring-4 hover:ring-gray-100"
            >
              Commencer maintenant
            </Link>
            <Link
              href="#discover"
              className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-4 text-lg font-semibold text-gray-900 transition-all hover:bg-gray-50"
            >
              Découvrir
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
      <section id="discover" className="relative z-10 bg-gray-50 py-32">
        <div className="max-xl mx-auto px-6">
          <div className="grid gap-24 sm:gap-32">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`flex flex-col items-center gap-12 sm:flex-row ${index % 2 === 1 ? "sm:flex-row-reverse" : ""}`}
              >
                <div className="flex-1 space-y-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                    {feature.icon}
                  </div>
                  <h2 className="text-3xl font-bold sm:text-4xl">{feature.title}</h2>
                  <p className="text-lg leading-relaxed text-gray-600">{feature.description}</p>
                </div>
                <div className="relative aspect-[4/3] flex-1 overflow-hidden rounded-3xl bg-gray-200 shadow-2xl shadow-gray-200">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-110"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="bg-white py-32 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-8 text-4xl font-bold sm:text-6xl">Prêt à simplifier vos fêtes ?</h2>
          <p className="mb-12 text-xl text-gray-600">
            Rejoignez des milliers de familles qui utilisent déjà Nawel.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-10 py-5 text-xl font-bold text-white transition-all hover:scale-105 hover:bg-red-700"
          >
            S&apos;identifier / Créer un compte
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-12 text-center text-sm text-gray-500">
        <p>© 2025 Nawel. Fait avec ✨ pour vos plus beaux moments.</p>
      </footer>
    </div>
  );
}
