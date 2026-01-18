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
  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;
  const [visibleLabel, setVisibleLabel] = useState<TabKey | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const progress = Math.min(scrolled / 200, 1); // Max out at 200px
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const blurRadius = 12 + scrollProgress * 28; // From 12px to 40px
  const shadowOpacity = 0.04 + scrollProgress * 0.08; // Increase depth
  const iconLift = scrollProgress * -4; // Subtle float up

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 w-full max-w-[280px] -translate-x-1/2 px-4 sm:max-w-[260px]">
      <nav
        className="pointer-events-auto flex items-center justify-around gap-2 rounded-full border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/[0.03] transition-all duration-300"
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          backdropFilter: `blur(${blurRadius}px)`,
          WebkitBackdropFilter: `blur(${blurRadius}px)`,
          boxShadow: `0 8px 32px 0 rgba(0, 0, 0, ${shadowOpacity})`,
        }}
        role="tablist"
        aria-label={t("navigation")}
      >
        {tabs.slice(0, 1).map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          const isLabelVisible = visibleLabel === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={selected}
              aria-label={t(tab.key)}
              className={clsx(
                "relative flex h-14 flex-1 flex-col items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 active:scale-[0.9] sm:h-12",
                selected ? "text-accent" : "text-gray-500"
              )}
            >
              {selected && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 z-0 rounded-full bg-accent/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  aria-hidden="true"
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

              <motion.div
                animate={{ y: selected ? iconLift : 0 }}
                className={clsx(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 sm:h-9 sm:w-9",
                  selected ? "bg-accent text-white shadow-md shadow-accent/20" : "bg-transparent"
                )}
                aria-hidden="true"
              >
                <Icon size={selected ? 22 : 20} strokeWidth={1.8} />
              </motion.div>
            </button>
          );
        })}

        {/* Quick Add FAB */}
        <div className="relative -mt-8 flex h-12 w-12 items-center justify-center sm:-mt-6 sm:h-10 sm:w-10">
          <button
            onClick={onQuickAdd}
            className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-pink-500 text-white shadow-lg shadow-accent/30 transition-transform active:scale-95 sm:h-12 sm:w-12"
            aria-label="Quick Add"
          >
            <Plus size={28} strokeWidth={2.5} className="sm:h-6 sm:w-6" />
          </button>
        </div>

        {tabs.slice(1).map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          const isLabelVisible = visibleLabel === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              aria-selected={selected}
              aria-label={t(tab.key)}
              className={clsx(
                "relative flex h-14 flex-1 flex-col items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 active:scale-[0.9] sm:h-12",
                selected ? "text-accent" : "text-gray-500"
              )}
            >
              {selected && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 z-0 rounded-full bg-accent/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  aria-hidden="true"
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

              <motion.div
                animate={{ y: selected ? iconLift : 0 }}
                className={clsx(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 sm:h-9 sm:w-9",
                  selected ? "bg-accent text-white shadow-md shadow-accent/20" : "bg-transparent"
                )}
                aria-hidden="true"
              >
                <Icon size={selected ? 22 : 20} strokeWidth={1.8} />
              </motion.div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
