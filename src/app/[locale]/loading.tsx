"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useThemeMode } from "@/components/theme-provider";

export default function Loading() {
  const t = useTranslations("common");
  const { resolvedTheme } = useThemeMode();
  const theme = resolvedTheme; // Alias for easier refactor

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-zinc-950">
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
          <div
            className={`absolute inset-0 animate-ping rounded-full opacity-20 ${
              theme === "aurora" ? "bg-purple-400" : "bg-zinc-400"
            }`}
          />
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-lg dark:bg-zinc-900">
            <span className="text-2xl">{theme === "aurora" ? "✨" : "🌙"}</span>
          </div>
        </motion.div>
        <p
          className={`animate-pulse bg-gradient-to-r bg-clip-text text-sm font-medium text-transparent ${
            theme === "aurora" ? "from-purple-600 to-blue-600" : "from-zinc-400 to-zinc-600"
          }`}
        >
          {t("loading")}
        </p>
      </div>
    </div>
  );
}
