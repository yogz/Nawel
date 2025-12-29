"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function Loading() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="relative h-12 w-12"
        >
          <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-lg">
            <span className="text-2xl">🎄</span>
          </div>
        </motion.div>
        <p className="animate-pulse bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-sm font-medium text-transparent">
          {t("loading")}
        </p>
      </div>
    </div>
  );
}
