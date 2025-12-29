"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import clsx from "clsx";

export function SuccessToast({
  message,
  christmas,
  type = "success",
}: {
  message: string | null;
  christmas?: boolean;
  type?: "success" | "error";
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role={type === "error" ? "alert" : "status"}
          aria-live={type === "error" ? "assertive" : "polite"}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="pointer-events-none fixed inset-x-0 top-24 z-[100] flex justify-center px-4"
        >
          <div
            className={clsx(
              "pointer-events-auto rounded-full border px-5 py-2.5 shadow-xl backdrop-blur-sm",
              type === "error"
                ? "border-red-400/20 bg-red-500/95"
                : "border-white/10 bg-gray-900/95"
            )}
          >
            <div className="flex items-center gap-2.5 text-white">
              {christmas ? (
                <>
                  <span className="text-base">{type === "error" ? "❌" : "🎄"}</span>
                  <span className="text-sm font-semibold">{message}</span>
                  <span className="text-base">{type === "error" ? "" : "✨"}</span>
                </>
              ) : (
                <>
                  <div
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      type === "error" ? "bg-white text-red-500" : "bg-white text-black"
                    )}
                  >
                    {type === "error" ? (
                      <X size={12} strokeWidth={4} />
                    ) : (
                      <Check size={12} strokeWidth={4} />
                    )}
                  </div>
                  <span className="text-sm font-semibold">{message}</span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
