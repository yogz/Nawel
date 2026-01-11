"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Mail,
  Loader2,
  Send,
  Target,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Coffee,
  Euro,
  Heart,
  Server,
  Globe,
  Database,
  Webhook,
  Code2,
  Puzzle,
  CircleEllipsis,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedbackAction } from "@/app/actions/feedback-actions";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from "next/navigation";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

  const CATEGORIES = [
    "hosting",
    "domain",
    "database",
    "api",
    "ai",
    "email",
    "dev",
    "services",
    "other",
  ] as const;
  const CATEGORY_COLORS: Record<string, string> = {
    hosting: "bg-blue-500",
    domain: "bg-cyan-500",
    database: "bg-indigo-500",
    api: "bg-violet-500",
    ai: "bg-purple-500",
    email: "bg-pink-500",
    dev: "bg-orange-500",
    services: "bg-emerald-500",
    other: "bg-slate-400",
  };

  const CATEGORY_ICONS: Record<string, any> = {
    hosting: Server,
    domain: Globe,
    database: Database,
    api: Webhook,
    ai: Sparkles,
    email: Mail,
    dev: Code2,
    services: Puzzle,
    other: CircleEllipsis,
  };

  // Chart config for shadcn/ui
  const chartConfig = {
    hosting: {
      label: t("categories.hosting"),
      color: "hsl(217, 91%, 60%)", // blue-500
    },
    domain: {
      label: t("categories.domain"),
      color: "hsl(189, 94%, 43%)", // cyan-500
    },
    ai: {
      label: t("categories.ai"),
      color: "hsl(271, 91%, 65%)", // purple-500
    },
    email: {
      label: t("categories.email"),
      color: "hsl(330, 81%, 60%)", // pink-500
    },
    dev: {
      label: t("categories.dev"),
      color: "hsl(25, 95%, 53%)", // orange-500
    },
    services: {
      label: t("categories.services"),
      color: "hsl(160, 84%, 39%)", // emerald-500
    },
    database: {
      label: t("categories.database"),
      color: "hsl(226, 70%, 55%)", // indigo-500
    },
    api: {
      label: t("categories.api"),
      color: "hsl(262, 83%, 58%)", // violet-500
    },
    other: {
      label: t("categories.other"),
      color: "hsl(215, 16%, 47%)", // slate-400
    },
  };

  // Get last 6 months for the chart
  const lastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }).reverse();

  // Transform data for recharts
  const chartData = lastMonths.map((month) => {
    const costs = monthlyCategoryCosts[month] || {};
    const [year, m] = month.split("-");
    const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("fr-FR", {
      month: "short",
    });

    const dataPoint: Record<string, string | number> = {
      month: monthName,
    };

    CATEGORIES.forEach((cat) => {
      dataPoint[cat] = costs[cat] || 0;
    });

    return dataPoint;
  });

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
                <div className="flex justify-end pt-4">
                  <span className="font-handwriting text-lg font-bold italic text-primary opacity-70">
                    Nicolas
                  </span>
                </div>
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
              <div className="rounded-2xl border border-white/20 bg-white/60 p-6 shadow-md backdrop-blur-sm">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("developmentTime")}
                </p>
                <div className="flex items-baseline gap-2 text-3xl font-black text-violet-500">
                  ~250 Hours
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            <div className="rounded-2xl border border-white/20 bg-white/60 p-3 shadow-md backdrop-blur-sm sm:p-6 md:col-span-2">
              <div className="mb-4 flex items-center justify-between sm:mb-8">
                <h3 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                  <TrendingUp className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                  {t("monthlyView")}
                </h3>
              </div>

              <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
                <BarChart accessibilityLayer data={chartData} margin={{ left: -20, right: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(_, payload) => {
                          if (payload && payload[0]) {
                            const total = CATEGORIES.reduce(
                              (sum, cat) => sum + ((payload[0].payload[cat] as number) || 0),
                              0
                            );
                            return (
                              <div className="flex flex-col gap-2">
                                <span className="font-bold">{payload[0].payload.month}</span>
                                <span className="text-sm font-semibold text-primary">
                                  Total: {total.toFixed(2)} €
                                </span>
                              </div>
                            );
                          }
                          return null;
                        }}
                        formatter={(value, name) => {
                          const Icon = CATEGORY_ICONS[name as string];
                          return (
                            <div className="flex w-full items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-muted-foreground">
                                  {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                </span>
                              </div>
                              <span className="font-mono font-medium">{value} €</span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {(() => {
                    // Find the last category (top of stack) that has data
                    const lastCategoryWithData = [...CATEGORIES]
                      .reverse()
                      .find((c) => (categoryTotals[c] || 0) > 0);

                    return CATEGORIES.map((cat) => {
                      if ((categoryTotals[cat] || 0) === 0) return null;
                      return (
                        <Bar
                          key={cat}
                          dataKey={cat}
                          stackId="a"
                          fill={`var(--color-${cat})`}
                          radius={cat === lastCategoryWithData ? [4, 4, 0, 0] : 0}
                        />
                      );
                    });
                  })()}
                </BarChart>
              </ChartContainer>
            </div>
          </div>
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
                className="group h-12 rounded-2xl border-none bg-black px-8 text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-black/90 active:scale-[0.98]"
                asChild
              >
                <a
                  href="https://revolut.me/yogzgo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <svg
                    viewBox="0 0 25 32"
                    className="mr-3 h-5 w-auto"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M0 7.831h5.835v23.9H0v-23.9Zm24.131 1.366C24.131 4.126 20.055 0 15.043 0H0v5.104h14.328c2.268 0 4.146 1.805 4.188 4.023a4.103 4.103 0 0 1-1.159 2.952 3.996 3.996 0 0 1-2.89 1.23H8.886a.362.362 0 0 0-.362.364v4.536c0 .077.024.151.068.213l9.47 13.31h6.932l-9.492-13.346c4.78-.244 8.627-4.312 8.627-9.188Z" />
                  </svg>
                  <span className="text-base font-bold uppercase tracking-tight">
                    {t("revolut")}
                  </span>
                  <ArrowUpRight className="ml-2 h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
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
            {t.raw("changelog.items").map((item: any, i: number) => (
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
            Fait avec 🇪🇺❤️🐻 par un indépendant
          </p>
        </motion.footer>
      </motion.div>
    </div>
  );
}
