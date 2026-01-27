"use client";

import { CalendarRange, Users, ShoppingCart } from "lucide-react";
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
  hasWriteAccess?: boolean;
}

export function TabBar({ active, onChange, hasWriteAccess }: TabBarProps) {
  const t = useTranslations("EventDashboard.TabBar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tabs = mounted && hasWriteAccess ? authenticatedTabs : guestTabs;
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
    <div
      className="pointer-events-none fixed left-1/2 z-40 w-full max-w-[280px] -translate-x-1/2 px-4 sm:max-w-[260px]"
      style={{
        bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
      }}
    >
      <nav
        id="navigation"
        className="pointer-events-auto flex items-center justify-around gap-2 rounded-full glass-panel border border-white/20 p-2 shadow-xl transition-all duration-300"
        role="tablist"
        aria-label={t("navigation")}
      >
        {tabs.map((tab) => {
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
                "relative flex h-14 flex-1 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 sm:h-12",
                selected ? "text-accent" : "text-gray-500"
              )}
            >
              {/* Active indicator pill */}
              {selected && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-1 rounded-full bg-accent/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

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
