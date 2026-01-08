"use client";

import React, { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useTranslations } from "next-intl";

interface OnboardingTourProps {
  tourKey: string;
}

export function OnboardingTour({ tourKey }: OnboardingTourProps) {
  const t = useTranslations("Tour");
  const [run, setRun] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setRun(true);
      localStorage.removeItem(`has_seen_tour_${tourKey}`);
    };

    // Listen for manual trigger
    window.addEventListener(`start-tour-${tourKey}`, handleStart);

    // Only run the tour if the user hasn't seen it yet
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${tourKey}`);
    if (!hasSeenTour) {
      // Delay it slightly to ensure elements are rendered
      const timer = setTimeout(() => setRun(true), 1500); // Increased delay slightly to be safe
      return () => {
        clearTimeout(timer);
        window.removeEventListener(`start-tour-${tourKey}`, handleStart);
      };
    }

    return () => window.removeEventListener(`start-tour-${tourKey}`, handleStart);
  }, [tourKey]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(`has_seen_tour_${tourKey}`, "true");
    }
  };

  const steps: Step[] =
    tourKey === "dashboard"
      ? [
          {
            target: "#dashboard-title",
            title: t("steps.dashboard.welcome.title"),
            content: t("steps.dashboard.welcome.content"),
            placement: "bottom",
            disableBeacon: true,
          },
          {
            target: "#new-event-card",
            title: t("steps.dashboard.create.title"),
            content: t("steps.dashboard.create.content"),
            placement: "right",
          },
          {
            target: "#event-list-container",
            title: t("steps.dashboard.list.title"),
            content: t("steps.dashboard.list.content"),
            placement: "top",
          },
          {
            target: "#user-nav-avatar",
            title: t("steps.dashboard.profile.title"),
            content: t("steps.dashboard.profile.content"),
            placement: "left",
          },
        ]
      : [];

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          primaryColor: "hsl(var(--accent))",
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: "left",
          fontSize: "14px",
        },
        tooltipTitle: {
          fontWeight: "bold",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--accent))",
          borderRadius: "8px",
          padding: "8px 16px",
          color: "#fff",
        },
        buttonBack: {
          marginRight: "8px",
        },
        buttonSkip: {
          color: "hsl(var(--gray-500))",
        },
      }}
      locale={{
        back: t("back"),
        close: t("last"),
        last: t("last"),
        next: t("next"),
        skip: t("skip"),
      }}
    />
  );
}
