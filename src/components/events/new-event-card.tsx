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
      className="group relative cursor-pointer overflow-hidden rounded-[32px] border-2 border-dashed border-accent/20 bg-accent/5 p-8 transition-all hover:border-accent/40 hover:bg-accent/[0.07] hover:shadow-2xl hover:shadow-accent/10"
    >
      {/* Decorative background sparks/glow */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl transition-all group-hover:bg-accent/20" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/15" />

      <div className="relative flex flex-col items-center justify-center space-y-4 py-4 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-accent shadow-xl shadow-accent/10 transition-transform duration-500 group-hover:rotate-90">
            <Plus size={32} strokeWidth={2.5} />
          </div>
          <div className="animate-bounce-slow absolute -right-2 -top-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/20">
              <Sparkles size={12} />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black tracking-tight text-gray-900">{t("newEvent")}</h3>
          <p className="text-xs font-semibold text-gray-500/80">{t("createFirst")}</p>
        </div>

        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all group-hover:px-6">
          <span>{t("new")}</span>
          <Plus size={12} strokeWidth={3} />
        </div>
      </div>
    </motion.div>
  );
}
