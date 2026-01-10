"use client";

import { useState } from "react";
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
  Send,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/app/actions/feedback-actions";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";

interface Cost {
  id: number;
  amount: number;
  category: string;
  description: string | null;
  date: Date | string; // Handle both Date objects and string timestamps
  frequency: "once" | "monthly" | "yearly";
  isActive: boolean;
  stoppedAt: Date | string | null;
}

interface BehindTheScenesProps {
  costs: Cost[];
}

export function BehindTheScenes({ costs }: BehindTheScenesProps) {
  const t = useTranslations("BehindTheScenes");
  const feedbackT = useTranslations("Feedback");
  const commonT = useTranslations("common");
  const { showToast } = useToast();
  const pathname = usePathname();

  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await submitFeedbackAction({
        content: content.trim(),
        url: typeof window !== "undefined" ? window.location.href : pathname,
      });

      if (result.success) {
        showToast({
          text: feedbackT("successDescription"),
          type: "success",
        });
        setContent("");
      }
    } catch (error) {
      showToast({
        text: error instanceof Error ? error.message : feedbackT("errorDescription"),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const currentYear = today.getFullYear();

  // Helper to expand recurring costs into flat list of occurrences
  const expandedOccurrences = costs.flatMap((cost) => {
    const startDate = new Date(cost.date);
    const endDate = cost.isActive ? today : cost.stoppedAt ? new Date(cost.stoppedAt) : today;
    const occurrences: { amount: number; date: Date; category: string }[] = [];

    if (cost.frequency === "once") {
      occurrences.push({ amount: cost.amount, date: startDate, category: cost.category });
    } else if (cost.frequency === "monthly") {
      const current = new Date(startDate);
      // Ensure we don't go past today even if stoppedAt is in future
      const actualEnd = endDate > today ? today : endDate;

      while (current <= actualEnd) {
        occurrences.push({
          amount: cost.amount,
          date: new Date(current),
          category: cost.category,
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (cost.frequency === "yearly") {
      const current = new Date(startDate);
      const actualEnd = endDate > today ? today : endDate;

      while (current <= actualEnd) {
        occurrences.push({
          amount: cost.amount,
          date: new Date(current),
          category: cost.category,
        });
        current.setFullYear(current.getFullYear() + 1);
      }
    }

    return occurrences;
  });

  // Group by month and category for the chart
  const monthlyCategoryCosts = expandedOccurrences.reduce(
    (acc, occ) => {
      const monthKey = `${occ.date.getFullYear()}-${String(occ.date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!acc[monthKey]) acc[monthKey] = {};
      acc[monthKey][occ.category] = (acc[monthKey][occ.category] || 0) + occ.amount;
      return acc;
    },
    {} as Record<string, Record<string, number>>
  );

  const totalSinceStart = expandedOccurrences.reduce((sum, occ) => sum + occ.amount, 0);
  const totalThisYear = expandedOccurrences
    .filter((occ) => occ.date.getFullYear() === currentYear)
    .reduce((sum, occ) => sum + occ.amount, 0);

  // Group by category for the breakdown
  const categoryTotals = expandedOccurrences.reduce(
    (acc, occ) => {
      acc[occ.category] = (acc[occ.category] || 0) + occ.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const CATEGORIES = ["hosting", "domain", "ai", "email", "dev", "services", "other"] as const;
  const CATEGORY_COLORS: Record<string, string> = {
    hosting: "bg-blue-500",
    domain: "bg-cyan-500",
    ai: "bg-purple-500",
    email: "bg-pink-500",
    dev: "bg-orange-500",
    services: "bg-emerald-500",
    other: "bg-slate-400",
  };

  // Get last 6 months for the chart
  const lastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();

  const maxMonthCost = Math.max(
    ...lastMonths.map((m) => {
      const costs = monthlyCategoryCosts[m] || {};
      return Object.values(costs).reduce((sum, a) => sum + a, 0);
    }),
    10
  );

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
          <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/90 p-8 shadow-lg backdrop-blur-md sm:p-10">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative z-10">
              <div className="absolute -right-4 -top-4 md:-right-6 md:-top-6">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-accent opacity-20 blur" />
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/50 shadow-lg sm:h-24 sm:w-24">
                    <img
                      src="/me.jpg"
                      alt="Nicolas"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-4 md:pr-24">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                  {t("bioTitle")}
                </h2>
                <p className="text-text/80 whitespace-pre-line text-base font-medium leading-relaxed">
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

              <div className="flex h-48 items-end gap-3 px-2 sm:gap-4 md:gap-6">
                {lastMonths.map((month) => {
                  const costs = monthlyCategoryCosts[month] || {};
                  const total = Object.values(costs).reduce((sum, a) => sum + a, 0);
                  const [year, m] = month.split("-");
                  const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString(
                    "fr-FR",
                    { month: "short" }
                  );

                  return (
                    <div key={month} className="group relative flex flex-1 flex-col items-center">
                      {/* Stacked Bar */}
                      <div className="relative flex h-32 w-full flex-col justify-end overflow-hidden rounded-lg bg-black/5 transition-all group-hover:bg-black/10">
                        {CATEGORIES.map((cat) => {
                          const amount = costs[cat] || 0;
                          if (amount === 0) return null;
                          const height = (amount / maxMonthCost) * 100;
                          return (
                            <div
                              key={cat}
                              className={`w-full ${CATEGORY_COLORS[cat]} transition-all duration-500`}
                              style={{ height: `${height}%` }}
                            />
                          );
                        })}

                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text p-2 text-[10px] text-white opacity-0 shadow-xl transition-all group-hover:-top-14 group-hover:opacity-100">
                          <div className="font-bold">{monthName}</div>
                          <div className="text-primary">{total.toFixed(2)} €</div>
                        </div>
                      </div>
                      <span className="mt-3 text-[10px] font-bold uppercase text-muted-foreground">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-black/5 pt-4">
                {CATEGORIES.map((cat) => {
                  if ((categoryTotals[cat] || 0) === 0) return null;
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[cat]}`} />
                      <span className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
                        {t(`categories.${cat}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Categories breakdown if costs exist */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {["hosting", "domain", "ai", "email", "dev", "services", "other"].map((cat) => {
                const amount = categoryTotals[cat] || 0;
                if (amount === 0) return null;
                return (
                  <div key={cat} className="rounded-xl border border-white/20 bg-white/40 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t(`categories.${cat}`)}
                    </p>
                    <p className="text-lg font-bold text-text">{amount.toFixed(2)} €</p>
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Coffee className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <h2 className="text-2xl font-bold text-text">{t("supportTitle")}</h2>
              <p className="text-text/70">{t("supportDescription")}</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 md:w-auto">
              <Button
                className="group h-12 rounded-2xl border-none bg-[#FFDD00] px-8 text-black shadow-lg transition-transform hover:scale-[1.02] hover:bg-[#FFDD00]/95 active:scale-[0.98]"
                asChild
              >
                <a
                  href="https://www.buymeacoffee.com/colist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <img
                    src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
                    alt="Buy Me a Coffee"
                    className="mr-3 h-6 w-6"
                  />
                  <span className="text-base font-bold uppercase tracking-tight">
                    {t("buyMeACoffee")}
                  </span>
                  <ArrowUpRight className="ml-2 h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
                </a>
              </Button>
              <Button
                className="group h-12 rounded-2xl border-none bg-white px-8 text-black shadow-lg transition-transform hover:scale-[1.02] hover:bg-gray-50 active:scale-[0.98]"
                asChild
              >
                <a
                  href="https://revolut.me/yogzgo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="mr-3 h-6 w-6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 20C0 8.95431 8.95431 0 20 0H80C91.0457 0 100 8.95431 100 20V80C100 91.0457 91.0457 100 80 100H20C8.95431 100 0 91.0457 0 80V20Z"
                      fill="black"
                    />
                    <path d="M25 35H75V43H53V75H45V43H25V35Z" fill="white" />
                  </svg>
                  <span className="text-base font-bold uppercase tracking-tight">
                    {t("revolut")}
                  </span>
                  <ArrowUpRight className="ml-2 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
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

        {/* Contact Section */}
        <motion.section
          variants={itemVariants}
          className="rounded-3xl border border-white/40 bg-white/60 p-8 shadow-sm backdrop-blur-sm sm:p-10"
        >
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text">{feedbackT("title")}</h2>
              <p className="mt-2 text-muted-foreground">{feedbackT("description")}</p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={feedbackT("placeholder")}
                className="min-h-[150px] rounded-2xl border-white/60 bg-white/80 transition-all focus:bg-white"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                variant="premium"
                className="shadow-accent-sm h-12 w-full rounded-2xl"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? commonT("loading") : feedbackT("submit")}
              </Button>
            </form>
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
