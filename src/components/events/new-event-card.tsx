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
      className="group relative cursor-pointer overflow-hidden rounded-[24px] border-2 border-dashed border-accent/20 bg-accent/5 p-4 transition-all hover:border-accent/40 hover:bg-accent/[0.07] hover:shadow-2xl hover:shadow-accent/10 sm:rounded-[24px] sm:p-5"
    >
      {/* Decorative background sparks/glow */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-3xl transition-all group-hover:bg-accent/20 sm:h-32 sm:w-32" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/15 sm:h-40 sm:w-40" />

      <div className="relative flex flex-col items-center justify-center space-y-3 py-2 text-center sm:space-y-4 sm:py-4">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent shadow-xl shadow-accent/10 transition-transform duration-500 group-hover:rotate-90 sm:h-12 sm:w-12 sm:rounded-2xl">
            <Plus size={20} strokeWidth={2.5} className="sm:hidden" />
            <Plus size={24} strokeWidth={2.5} className="hidden sm:block" />
          </div>
          <div className="animate-bounce-slow absolute -right-1 -top-1 sm:-right-2 sm:-top-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/20 sm:h-6 sm:w-6">
              <Sparkles size={10} className="sm:h-3 sm:w-3" />
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <h3 className="text-sm font-black tracking-tight text-gray-900 sm:text-base">
            {t("newEvent")}
          </h3>
          <p className="text-[10px] font-semibold text-gray-500/80 sm:text-[10px]">
            {t("createFirst")}
          </p>
        </div>

        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all group-hover:px-3 sm:mt-2 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px]">
          <span>{t("new")}</span>
          <Plus size={9} strokeWidth={3} className="sm:hidden" />
          <Plus size={10} strokeWidth={3} className="hidden sm:block" />
        </div>
      </div>
    </motion.div>
  );
}
