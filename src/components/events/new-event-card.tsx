"use client";

import { Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface NewEventCardProps {
  onClick: () => void;
}

export function NewEventCard({ onClick }: NewEventCardProps) {
  const t = useTranslations("Dashboard.EventList");

  return (
    <motion.div
      whileHover={{ scale: 1.02, translateY: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-[24px] border-2 border-dashed border-accent/20 bg-accent/5 p-5 transition-all hover:border-accent/40 hover:bg-accent/[0.07] hover:shadow-2xl hover:shadow-accent/10 sm:rounded-[32px] sm:p-8"
    >
      {/* Decorative background sparks/glow */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl transition-all group-hover:bg-accent/20" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/15" />

      <div className="relative flex flex-col items-center justify-center space-y-4 py-4 text-center">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-xl shadow-accent/10 transition-transform duration-500 group-hover:rotate-90 sm:h-16 sm:w-16 sm:rounded-[24px]">
            <Plus size={24} strokeWidth={2.5} className="sm:hidden" />
            <Plus size={32} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div className="animate-bounce-slow absolute -right-2 -top-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/20">
              <Sparkles size={12} />
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <h3 className="text-base font-black tracking-tight text-gray-900 sm:text-lg">
            {t("newEvent")}
          </h3>
          <p className="text-[10px] font-semibold text-gray-500/80 sm:text-xs">
            {t("createFirst")}
          </p>
        </div>

        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all group-hover:px-5 sm:mt-2 sm:gap-2 sm:px-4 sm:py-2 sm:text-[10px]">
          <span>{t("new")}</span>
          <Plus size={10} strokeWidth={3} className="sm:hidden" />
          <Plus size={12} strokeWidth={3} className="hidden sm:block" />
        </div>
      </div>
    </motion.div>
  );
}
