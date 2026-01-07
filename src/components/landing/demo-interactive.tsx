"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { trackDemoView, trackDemoStep } from "@/lib/analytics";
import { useTrackView } from "@/hooks/use-track-view";

export function DemoInteractive() {
  const [step, setStep] = useState(0);
  const hasTrackedSteps = useRef<Set<number>>(new Set());

  // Track when demo becomes visible
  const demoRef = useTrackView<HTMLElement>({
    onView: useCallback(() => trackDemoView("landing"), []),
    threshold: 0.3,
  });

  // Auto-advance loop for the demo
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4); // 0: Msg, 1: Loading/Click, 2: App View, 3: Success
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Track demo steps (only once per step)
  useEffect(() => {
    if (!hasTrackedSteps.current.has(step)) {
      hasTrackedSteps.current.add(step);
      trackDemoStep(step, "landing");
    }
  }, [step]);

  const variants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <section ref={demoRef} className="overflow-hidden bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            La preuve par l&apos;exemple
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Voyez ce que vos invités voient. En 3 secondes.
          </p>
        </div>

        <div className="relative mx-auto max-w-[300px] sm:max-w-[320px]">
          {/* Phone Frame */}
          <div className="relative z-10 aspect-[9/19] overflow-hidden rounded-[3rem] border-[8px] border-gray-900 bg-white shadow-2xl">
            {/* Notch */}
            <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-xl bg-gray-900" />

            <div className="relative h-full w-full bg-slate-50">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={variants}
                    transition={{ duration: 0.5 }}
                    className="flex h-full flex-col justify-end bg-[#E5DDD5] p-4 pb-20" // WhatsApp background colorish
                  >
                    <div className="mb-4 flex flex-col gap-2">
                      <div className="max-w-[85%] self-start rounded-lg rounded-tl-none bg-white p-3 text-sm shadow-sm">
                        Salut ! J&apos;organise un dîner samedi pro. 🍝
                      </div>
                      <div className="max-w-[85%] self-start rounded-lg rounded-tl-none bg-white p-3 text-sm shadow-sm">
                        C&apos;est un potluck, chacun ramène un truc ! Regardez ce qu&apos;il manque
                        ici : 👇
                      </div>
                      <div className="max-w-[85%] self-start overflow-hidden rounded-lg bg-white p-2 shadow-sm">
                        <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-100 p-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-indigo-100">
                            <span className="text-lg">🎁</span>
                          </div>
                          <div className="overflow-hidden text-xs text-slate-500">
                            <strong className="block truncate text-slate-800">
                              Noël les copains
                            </strong>
                            colist.fr/event/123...
                          </div>
                        </div>
                        <div className="mt-2 cursor-pointer text-center text-xs font-medium text-blue-500">
                          Toucher pour ouvrir
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {(step === 1 || step === 2 || step === 3) && (
                  <motion.div
                    key="stepApp"
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={variants}
                    transition={{ duration: 0.5 }}
                    className="flex h-full flex-col bg-white"
                  >
                    {/* App Header */}
                    <div className="border-b border-gray-100 bg-white p-4 pt-10">
                      <h3 className="font-bold text-gray-900">Noël chez Nico 🎄</h3>
                      <p className="text-xs text-gray-500">Samedi 24 Déc • 19:30</p>
                    </div>

                    {/* App Content */}
                    <div className="space-y-4 p-4">
                      <div className="text-sm font-medium uppercase tracking-wider text-gray-500">
                        Ce qu&apos;il manque
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                              🍾
                            </div>
                            <span className="text-sm font-medium">Champagne</span>
                          </div>
                          {step >= 2 ? (
                            <div className="flex h-8 w-8 scale-110 items-center justify-center rounded-full bg-green-500 text-white shadow-sm transition-all">
                              <Check className="h-4 w-4" />
                            </div>
                          ) : (
                            <button className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                              Je prends
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 opacity-50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                              🥗
                            </div>
                            <span className="text-sm font-medium">Salade de saison</span>
                          </div>
                          <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-500" />
                          </div>
                        </div>
                      </div>

                      {step >= 3 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 rounded-xl bg-green-50 p-4 text-center"
                        >
                          <p className="text-sm font-medium text-green-800">✅ C&apos;est noté !</p>
                          <p className="mt-1 text-xs text-green-600">Merci pour le champagne !</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Bar Simulation */}
            <div className="absolute bottom-1 left-1/2 mb-1 h-1 w-32 -translate-x-1/2 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>
    </section>
  );
}
