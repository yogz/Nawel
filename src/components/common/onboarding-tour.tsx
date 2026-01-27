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
    window.addEventListener(`start-tour-${tourKey}`, handleStart as any);

    // Only run the tour if the user hasn't seen it yet
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${tourKey}`);
    if (!hasSeenTour) {
      // Delay it slightly to ensure elements are rendered
      const timer = setTimeout(() => setRun(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener(`start-tour-${tourKey}`, handleStart as any);
      };
    }

    return () => window.removeEventListener(`start-tour-${tourKey}`, handleStart as any);
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
      key={tourInstance}
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      locale={{
        back: t("back"),
        close: t("last"),
        last: t("last"),
        next: t("next"),
        skip: t("skip"),
      }}
      styles={{
        options: {
          primaryColor: "#0ea5e9", // Adjust to match theme
          zIndex: 1000,
        },
      }}
    />
  );
}
