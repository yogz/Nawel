"use client";

import React from "react";
import { X, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { type MealAssessment } from "@/lib/types";

interface MealAssessmentBannerProps {
  mealId: number;
  /** Input hash the assessment was computed from — part of the dismiss key so
   *  the banner re-surfaces when the suggestions change. */
  inputHash: string | null;
  assessment: MealAssessment | null | undefined;
}

export function MealAssessmentBanner({ mealId, inputHash, assessment }: MealAssessmentBannerProps) {
  const t = useTranslations("EventDashboard.Planning.assessment");
  const dismissKey = `meal-assessment-dismissed:${mealId}:${inputHash ?? ""}`;
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setDismissed(window.localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  // Hidden when there's nothing useful to show, or the user dismissed this exact
  // set of suggestions.
  if (!assessment || assessment.sufficient || assessment.missing.length === 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(dismissKey, "1");
    } catch {
      // localStorage unavailable (private mode) — dismiss for this render only.
    }
    setDismissed(true);
  };

  const rank = { high: 0, medium: 1, low: 2 } as const;
  const missing = [...assessment.missing].sort(
    (a, b) => rank[a.priority ?? "medium"] - rank[b.priority ?? "medium"]
  );

  return (
    <div className="mb-3 rounded-xl bg-accent/5 px-4 py-3 shadow-sm ring-1 ring-accent/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            {t("beta")}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {assessment.summary ? (
        <p className="mt-1 text-sm text-muted-foreground">{assessment.summary}</p>
      ) : null}

      <ul className="mt-2 space-y-1.5">
        {missing.map((entry, index) => (
          <li key={index} className="text-sm text-foreground">
            <span className="font-medium">{entry.name}</span>
            {entry.suggestedQuantity ? (
              <span className="text-muted-foreground"> · {entry.suggestedQuantity}</span>
            ) : null}
            {entry.reason ? (
              <span className="block text-xs text-muted-foreground">{entry.reason}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
