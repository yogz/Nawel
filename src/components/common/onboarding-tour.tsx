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
            target: "#dashboard-title",
            content: t("steps.dashboard.welcome.content"),
            title: t("steps.dashboard.welcome.title"),
            placement: "bottom",
            disableBeacon: true,
          },
          {
            target: "#new-event-card",
            title: t("steps.dashboard.create.title"),
            content: t("steps.dashboard.create.content"),
            placement: "auto",
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
      tooltipComponent={Tooltip}
      locale={{
        back: t("back"),
        close: t("last"),
        last: t("last"),
        next: t("next"),
        skip: t("skip"),
      }}
      styles={{
        options: {
          primaryColor: "#a855f7", // Violet accent
          zIndex: 1000,
          overlayColor: "rgba(0, 0, 0, 0.4)",
        },
        spotlight: {
          borderRadius: 24,
        },
      }}
    />
  );
}

function Tooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: any) {
  return (
    <div
      {...tooltipProps}
      className="max-w-[320px] overflow-hidden rounded-[24px] border border-white/40 bg-white/80 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 sm:max-w-sm"
    >
      <div className="space-y-4">
        {step.title && (
          <h3 className="text-lg font-black tracking-tight text-gray-900">{step.title}</h3>
        )}
        <div className="text-sm font-medium leading-relaxed text-gray-600">{step.content}</div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {!isLastStep && (
              <button
                {...skipProps}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-gray-900"
              >
                {skipProps.title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="flex h-10 items-center justify-center rounded-full bg-gray-100 px-4 text-xs font-bold uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
              >
                {backProps.title}
              </button>
            )}
            <button
              {...primaryProps}
              className="flex h-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-105 hover:shadow-purple-500/40 active:scale-95"
            >
              {primaryProps.title}
            </button>
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="mt-6 flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= index ? "bg-purple-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
