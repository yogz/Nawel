"use client";

import { useTranslations } from "next-intl";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackFaqInteraction } from "@/lib/analytics";

export function Faq() {
  const t = useTranslations("FAQ");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    trackFaqInteraction(index, isOpening ? "opened" : "closed");
  };

  const questions = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
  ];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h2 className="mb-16 text-center text-3xl font-bold leading-10 tracking-tight text-gray-900 sm:text-4xl">
          {t("title")}
        </h2>
        <dl className="space-y-6 divide-y divide-gray-100">
          {questions.map((faq, index) => (
            <div key={index} className="pt-6">
              <dt>
                <button
                  onClick={() => handleToggle(index)}
                  className="flex w-full items-start justify-between text-left text-gray-900"
                >
                  <span className="text-base font-semibold leading-7">{faq.q}</span>
                  <span className="ml-6 flex h-7 items-center">
                    {openIndex === index ? (
                      <Minus className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Plus className="h-6 w-6" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </dt>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.dd
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pr-12"
                  >
                    <p className="py-4 text-base leading-7 text-gray-600">{faq.a}</p>
                  </motion.dd>
                )}
              </AnimatePresence>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
