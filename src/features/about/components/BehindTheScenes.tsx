"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Heart,
  Euro,
  Coffee,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Cost {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: Date;
}

interface BehindTheScenesProps {
  costs: Cost[];
}

export function BehindTheScenes({ costs }: BehindTheScenesProps) {
  const t = useTranslations("BehindTheScenes");

  // Group costs by month
  const monthlyCosts = costs.reduce(
    (acc, cost) => {
      const date = new Date(cost.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      acc[monthKey] = (acc[monthKey] || 0) + cost.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalSinceStart = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const currentYear = new Date().getFullYear();
  const totalThisYear = costs
    .filter((c) => new Date(c.date).getFullYear() === currentYear)
    .reduce((sum, cost) => sum + cost.amount, 0);

  // Get last 6 months for the chart
  const lastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();

  const maxMonthCost = Math.max(...lastMonths.map((m) => monthlyCosts[m] || 0), 10);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-gray-900 sm:px-6 lg:py-20">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16"
      >
        {/* Header Section */}
        <section className="space-y-4 text-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"
          >
            <Sparkles className="h-4 w-4" />
            {t("subtitle")}
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-black tracking-tight text-text sm:text-6xl"
          >
            {t("title")}
          </motion.h1>
        </section>

        {/* Bio Section */}
        <motion.section variants={itemVariants} className="relative">
          <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/90 p-8 shadow-xl backdrop-blur-md sm:p-12">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
              <div className="flex-1 space-y-6">
                <h2 className="flex items-center gap-3 text-2xl font-bold">
                  <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                  {t("bioTitle")}
                </h2>
                <p className="text-text/80 whitespace-pre-line text-lg font-medium leading-relaxed">
                  {t("bioContent")}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Costs Dashboard */}
        <motion.section variants={itemVariants} className="space-y-8">
          <div className="text-center md:text-left">
            <h2 className="mb-2 text-3xl font-bold text-text">{t("costsTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("costsSubtitle")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Stats Cards */}
            <div className="space-y-6 md:col-span-1">
              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-md backdrop-blur-sm">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("totalSinceStart")}
                </p>
                <div className="flex items-baseline gap-2 text-3xl font-black text-text">
                  {totalSinceStart.toFixed(2)} €
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-md backdrop-blur-sm">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("totalYear")}
                </p>
                <div className="flex items-baseline gap-2 text-3xl font-black text-primary">
                  {totalThisYear.toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-md backdrop-blur-sm md:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t("monthlyView")}
                </h3>
              </div>

              <div className="flex h-48 items-end gap-3 px-2 sm:gap-6">
                {lastMonths.map((month) => {
                  const amount = monthlyCosts[month] || 0;
                  const height = (amount / maxMonthCost) * 100;
                  const [year, m] = month.split("-");
                  const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString(
                    "fr-FR",
                    { month: "short" }
                  );

                  return (
                    <div key={month} className="flex flex-1 flex-col items-center gap-3">
                      <div className="group relative flex h-32 w-full flex-col justify-end">
                        <div
                          className="w-full rounded-t-lg bg-primary/20 transition-all duration-500 hover:bg-primary/40"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-text px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {amount.toFixed(2)} €
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground sm:text-xs">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Categories breakdown if costs exist */}
          {costs.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {["hosting", "domain", "api", "email"].map((cat) => {
                const amount = costs
                  .filter((c) => c.category === cat)
                  .reduce((s, c) => s + c.amount, 0);
                if (amount === 0) return null;
                return (
                  <div key={cat} className="rounded-xl border border-white/20 bg-white/40 p-4">
                    <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">
                      {t(`categories.${cat}`)}
                    </p>
                    <p className="text-xl font-bold text-text">{amount.toFixed(2)} €</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Support Section */}
        <motion.section
          variants={itemVariants}
          className="rounded-3xl border border-primary/10 bg-primary/5 p-8 sm:p-12"
        >
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Coffee className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <h2 className="text-2xl font-bold text-text">{t("supportTitle")}</h2>
              <p className="text-text/70">{t("supportDescription")}</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 md:w-auto">
              <Button
                variant="premium"
                className="group h-12 rounded-2xl px-8 shadow-accent-lg"
                asChild
              >
                <a
                  href="https://www.buymeacoffee.com/colist"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee className="mr-2 h-5 w-5" />
                  {t("buyMeACoffee")}
                  <ArrowUpRight className="ml-2 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl bg-white/50 px-8" asChild>
                <a href="https://revolut.me/yogzgo" target="_blank" rel="noopener noreferrer">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t("revolut")}
                </a>
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Changelog Section */}
        <motion.section variants={itemVariants} className="space-y-8">
          <div className="text-center md:text-left">
            <h2 className="mb-2 text-3xl font-bold text-text">{t("changelogTitle")}</h2>
            <p className="text-lg text-muted-foreground">{t("changelogSubtitle")}</p>
          </div>

          <div className="space-y-4">
            {[
              {
                date: "Jan 2026",
                title: "Refonte de l'interface et Dashboard",
                description:
                  "Une interface encore plus fluide et un nouveau tableau de bord pour vos événements.",
              },
              {
                date: "Dec 2025",
                title: "L'IA au service de vos courses",
                description:
                  "Génération automatique des ingrédients et quantités adaptées au nombre d'invités.",
              },
              {
                date: "Nov 2025",
                title: "Lancement de CoList",
                description: "Première version publique pour partager vos listes sans compte.",
              },
            ].map((item, i) => (
              <div key={i} className="group flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="mt-2 h-3 w-3 rounded-full bg-primary" />
                  <div className="w-0.5 flex-1 bg-primary/10 group-last:bg-transparent" />
                </div>
                <div className="space-y-1 pb-8">
                  <span className="text-xs font-bold uppercase text-primary">{item.date}</span>
                  <h3 className="text-xl font-bold text-text">{item.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.footer variants={itemVariants} className="border-t border-black/5 pt-8 text-center">
          <p className="text-text/40 flex items-center justify-center gap-2 text-sm">
            Fait avec <Heart className="h-3 w-3 fill-current" /> par un indépendant en France.
          </p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
