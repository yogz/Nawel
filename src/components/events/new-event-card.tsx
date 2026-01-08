"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface NewEventCardProps {
  onClick: () => void;
}

export function NewEventCard({ onClick }: NewEventCardProps) {
  const t = useTranslations("Dashboard.EventList");

  return (
    <motion.div
      id="new-event-card"
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

      <div className="relative flex flex-col items-center justify-center space-y-4 py-2 text-center sm:space-y-5 sm:py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-accent shadow-xl shadow-accent/10 transition-all duration-500 group-hover:rotate-90 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-accent/20 sm:h-20 sm:w-20">
          <Plus size={32} strokeWidth={3} className="sm:h-10 sm:w-10" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold tracking-tight text-text sm:text-base">
            {t("newEvent")}
          </h3>
          <p className="text-xs font-bold text-muted-foreground sm:text-sm">{t("createNew")}</p>
        </div>
      </div>
    </motion.div>
  );
}
