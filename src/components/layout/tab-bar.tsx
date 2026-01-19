"use client";

import { CalendarRange, Users, ShoppingCart, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { trackTabChange } from "@/lib/analytics";

const authenticatedTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
  { key: "shopping", icon: ShoppingCart },
] as const;

const guestTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
] as const;

export type TabKey = "planning" | "people" | "shopping";

interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  isAuthenticated?: boolean;
  onQuickAdd?: () => void;
}

export function TabBar({ active, onChange, isAuthenticated, onQuickAdd }: TabBarProps) {
  const t = useTranslations("EventDashboard.TabBar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tabs = mounted && isAuthenticated ? authenticatedTabs : guestTabs;
  const [visibleLabel, setVisibleLabel] = useState<TabKey | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTabChange = (key: TabKey) => {
    if (key !== active) {
      trackTabChange(key, active);
    }
    onChange(key);

    // Show label for 1.5 seconds
    setVisibleLabel(key);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setVisibleLabel(null);
    }, 1500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 w-full max-w-[280px] -translate-x-1/2 px-4 sm:max-w-[260px]">
      <nav
        className="pointer-events-auto flex items-center justify-around gap-2 rounded-full border border-white/20 bg-white/70 p-2 shadow-xl backdrop-blur-md transition-all duration-300"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="tablist"
        aria-label={t("navigation")}
      >
        {tabs.slice(0, 1).map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          const isLabelVisible = visibleLabel === tab.key;

          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={selected}
              aria-label={t(tab.key)}
              className={clsx(
                "relative flex h-14 flex-1 flex-col items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 sm:h-12",
                selected ? "text-slate-900" : "text-slate-400"
              )}
            >
              <AnimatePresence>
                {isLabelVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.5, x: "-50%" }}
                    animate={{ opacity: 1, y: -45, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 0, scale: 0.5, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute left-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg sm:text-[9px]"
                  >
                    {t(tab.key)}
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full sm:h-9 sm:w-9"
                aria-hidden="true"
              >
                <Icon size={24} strokeWidth={2.5} />
              </div>
            </motion.button>
          );
        })}

        {/* Quick Add FAB */}
        {/* Quick Add FAB - visually breaking out */}
        <div className="relative flex h-12 w-12 items-center justify-center sm:h-10 sm:w-10">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onQuickAdd}
            className="absolute -translate-y-6 flex h-[48px] w-[48px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#db2777] text-white shadow-lg shadow-purple-500/30 sm:h-[42px] sm:w-[42px]"
            aria-label="Quick Add"
          >
            <Plus size={24} strokeWidth={2.5} />
          </motion.button>
        </div>

        {tabs.slice(1).map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          const isLabelVisible = visibleLabel === tab.key;

          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={selected}
              aria-label={t(tab.key)}
              className={clsx(
                "relative flex h-14 flex-1 flex-col items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 sm:h-12",
                selected ? "text-slate-900" : "text-slate-400"
              )}
            >
              <AnimatePresence>
                {isLabelVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.5, x: "-50%" }}
                    animate={{ opacity: 1, y: -45, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 0, scale: 0.5, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute left-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg sm:text-[9px]"
                  >
                    {t(tab.key)}
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full sm:h-9 sm:w-9"
                aria-hidden="true"
              >
                <Icon size={24} strokeWidth={2.5} />
              </div>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
