"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-[2rem] border-x border-t border-white/20 bg-surface p-4 shadow-2xl sm:rounded-t-[2.5rem] sm:p-6"
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", damping: 22 }}
          >
            <div className="mb-3 flex flex-shrink-0 items-center justify-between sm:mb-4">
              <h3 id="sheet-title" className="text-base font-semibold text-text sm:text-lg">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 active:scale-95 sm:p-2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="-mx-4 flex-1 overflow-y-auto px-4 sm:-mx-6 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
