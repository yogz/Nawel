"use client";

import React, { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from "react-joyride";
import { useTranslations } from "next-intl";

interface OnboardingTourProps {
  tourKey: string;
}

export function OnboardingTour({ tourKey }: OnboardingTourProps) {
  const t = useTranslations("Tour");
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourInstance, setTourInstance] = useState(0); // Used to force re-mount

  useEffect(() => {
    const handleStart = () => {
      localStorage.removeItem(`has_seen_tour_${tourKey}`);
      // Force a re-mount and restart
      setTourInstance((prev) => prev + 1);
      setStepIndex(0);
      setRun(true);
    };

    // Listen for manual trigger
    window.addEventListener(`start-tour-${tourKey}`, handleStart);

    // Only run the tour if the user hasn't seen it yet
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${tourKey}`);
    if (!hasSeenTour) {
      // Delay it slightly to ensure elements are rendered
      const timer = setTimeout(() => setRun(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(`start-tour-${tourKey}`, handleStart);
      };
    }

    return () => window.removeEventListener(`start-tour-${tourKey}`, handleStart);
  }, [tourKey]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Update internal state to match Joyride's progress
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem(`has_seen_tour_${tourKey}`, "true");
    }
  };

  const steps: Step[] =
    tourKey === "dashboard"
      ? [
          {
            target: "#new-event-card",
            title: t("steps.dashboard.create.title"),
            content: t("steps.dashboard.create.content"),
            placement: "auto",
            disableBeacon: true,
          },
          {
            target: "#user-nav-avatar",
            title: t("steps.dashboard.profile.title"),
            content: t("steps.dashboard.profile.content"),
            placement: "bottom-end",
          },
          {
            target: "#feedback-button",
            title: t("steps.dashboard.feedback.title"),
            content: t("steps.dashboard.feedback.content"),
            placement: "top",
          },
        ]
      : [];

  return (
    <Joyride
      key={`${tourKey}-${tourInstance}`}
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      stepIndex={stepIndex}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          primaryColor: "hsl(var(--accent))",
          zIndex: 10000,
          backgroundColor: "hsl(var(--card))",
          textColor: "hsl(var(--card-foreground))",
          arrowColor: "hsl(var(--card))",
        },
        tooltip: {
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          backdropFilter: "blur(8px)",
          border: "1px solid hsl(var(--border) / 0.5)",
        },
        tooltipContainer: {
          textAlign: "left",
          fontSize: "15px",
          lineHeight: "1.6",
        },
        tooltipTitle: {
          fontWeight: "800",
          fontSize: "18px",
          marginBottom: "10px",
          background: "linear-gradient(to right, hsl(var(--accent)), hsl(var(--primary)))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--accent))",
          borderRadius: "12px",
          padding: "10px 20px",
          color: "#fff",
          fontWeight: "600",
          boxShadow: "0 4px 14px 0 hsl(var(--accent) / 0.39)",
        },
        buttonBack: {
          marginRight: "8px",
          fontWeight: "600",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "13px",
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
