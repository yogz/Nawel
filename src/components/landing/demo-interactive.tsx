"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Send } from "lucide-react";
import { trackDemoView, trackDemoStep } from "@/lib/analytics";
import { useTrackView } from "@/hooks/use-track-view";
import { useTranslations } from "next-intl";

export function DemoInteractive() {
  const t = useTranslations("Demo");
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const hasTrackedSteps = useRef<Set<number>>(new Set());

  // Track when demo becomes visible
  const demoRef = useTrackView<HTMLElement>({
    onView: useCallback(() => trackDemoView("landing"), []),
    threshold: 0.3,
  });

  // Steps definition:
  // 0: WhatsApp Invite
  // 1: App View - Initial ("Ce qu'on apporte")
  // 2: Selection - Click "Champagne"
  // 3: Input Focus - Show Keyboard/Input
  // 4: Typing - Translation key: typingText
  // 5: Final - Success View

  useEffect(() => {
    const timer = setInterval(
      () => {
        setStep((prev) => (prev + 1) % 6);
      },
      step === 4 ? 3000 : 4000
    ); // Give more time for typing if needed
    return () => clearInterval(timer);
  }, [step]);

  // Typing animation for step 4
  useEffect(() => {
    if (step === 4) {
      const text = t("typingText");
      let i = 0;
      setTypedText("");
      const typeInterval = setInterval(() => {
        setTypedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(typeInterval);
      }, 70);
      return () => clearInterval(typeInterval);
    } else if (step < 4) {
      setTypedText("");
    }
  }, [step, t]);

  // Track demo steps
  useEffect(() => {
    if (!hasTrackedSteps.current.has(step)) {
      hasTrackedSteps.current.add(step);
      trackDemoStep(step, "landing");
    }
  }, [step]);

  const variants = {
    enter: { opacity: 0, scale: 0.95, y: 10 },
    center: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.05, y: -10 },
  };

  return (
    <section ref={demoRef} className="relative z-10 overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            {t.rich("title", {
              orange: (chunks) => <span className="text-orange-600">{chunks}</span>,
            })}
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">{t("description")}</p>
        </div>

        <div className="relative mx-auto max-w-[320px]">
          {/* Enhanced Phone Frame */}
          <div className="relative z-10 aspect-[9/19.5] overflow-hidden rounded-[3.5rem] border-[12px] border-gray-950 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)]">
            {/* Dynamic Island Style Notch */}
            <div className="absolute left-1/2 top-0 z-20 mt-4 h-7 w-28 -translate-x-1/2 rounded-full bg-gray-950" />

            <div className="relative h-full w-full bg-slate-50">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="whatsapp"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={variants}
                    transition={{ duration: 0.4 }}
                    className="flex h-full flex-col justify-end bg-[#E5DDD5] p-4 pb-20"
                  >
                    <div className="mb-4 flex flex-col gap-2">
                      <div className="max-w-[85%] self-start rounded-2xl rounded-tl-none bg-white p-3 text-[14px] shadow-sm ring-1 ring-black/5">
                        {t("waInvite1")}
                      </div>
                      <div className="max-w-[85%] self-start rounded-2xl rounded-tl-none bg-white p-3 text-[14px] shadow-sm ring-1 ring-black/5">
                        {t("waInvite2")}
                      </div>
                      <div className="max-w-[85%] self-start overflow-hidden rounded-2xl bg-white p-2 shadow-md ring-1 ring-black/5">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-2xl">
                            🥳
                          </div>
                          <div className="overflow-hidden">
                            <strong className="block truncate text-sm text-slate-900">
                              {t("waEventTitle")}
                            </strong>
                            <span className="text-[11px] text-slate-500">{t("waLink")}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-center text-xs font-bold text-blue-600">
                          {t("waCta")}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 1 && (
                  <motion.div
                    key="app"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={variants}
                    transition={{ duration: 0.4 }}
                    className="flex h-full flex-col bg-white"
                  >
                    {/* App Header */}
                    <div className="bg-white px-6 pb-4 pt-16">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black leading-tight text-gray-900">
                            {t("appTitle")}
                          </h3>
                          <p className="text-xs font-semibold text-orange-600">{t("appDate")}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg">
                          👩‍🍳
                        </div>
                      </div>
                    </div>

                    {/* App Content */}
                    <div className="flex-1 space-y-6 overflow-y-auto px-6">
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                          {t("listTitle")}
                        </h4>

                        {/* Item 1: Champagne */}
                        <div
                          className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-300 ${step >= 2 ? "border-green-100 bg-green-50" : "border-gray-100 bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🍾</span>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {t("itemChampagne")}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {step >= 2 ? t("itemReserved") : t("itemNeeded")}
                              </p>
                            </div>
                          </div>
                          {step >= 2 ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white"
                            >
                              <Check className="h-4 w-4 stroke-[3]" />
                            </motion.div>
                          ) : (
                            <button className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[11px] font-bold text-gray-900 shadow-sm">
                              {t("itemTake")}
                            </button>
                          )}
                        </div>

                        {/* Item 2: Existing taker */}
                        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-4 opacity-70">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🥗</span>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{t("itemSalad")}</p>
                            </div>
                          </div>
                          <div className="flex -space-x-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-[10px] font-bold text-white">
                              M
                            </div>
                          </div>
                        </div>

                        {/* NEW ITEM SECTION */}
                        <AnimatePresence>
                          {step >= 5 && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 p-4"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">🍰</span>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">
                                    {t("typingText")}
                                  </p>
                                  <p className="text-[10px] font-bold text-orange-600">
                                    {t("itemNew")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
                                <Check className="h-4 w-4 stroke-[3]" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Bottom Input Area */}
                    <div className="p-6 pt-2">
                      <div
                        className={`relative flex items-center gap-2 rounded-2xl bg-slate-100 p-2 transition-all duration-300 ${step === 3 || step === 4 ? "bg-white shadow-lg ring-2 ring-orange-500" : ""}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-sm font-medium text-slate-500">
                          {step >= 4 ? (
                            <span className="text-gray-900">
                              {typedText}
                              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-orange-500" />
                            </span>
                          ) : (
                            t("placeholder")
                          )}
                        </div>
                        {step === 4 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white"
                          >
                            <Send className="h-4 w-4" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 h-1.5 w-36 -translate-x-1/2 rounded-full bg-gray-200" />
          </div>

          {/* Background Decorative Elements */}
          <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-orange-100/50 blur-3xl" />
          <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
