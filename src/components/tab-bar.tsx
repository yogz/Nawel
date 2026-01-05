"use client";

import { CalendarRange, Users, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
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
}

export function TabBar({ active, onChange, isAuthenticated }: TabBarProps) {
  const t = useTranslations("EventDashboard.TabBar");
  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;

  const handleTabChange = (key: TabKey) => {
    if (key !== active) {
      trackTabChange(key, active);
    }
    onChange(key);
  };

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 w-full max-w-sm -translate-x-1/2 px-4">
      <nav
        className="pointer-events-auto flex items-center justify-around gap-1 rounded-full border border-white/20 bg-white/70 p-1.5 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] ring-1 ring-black/5 backdrop-blur-xl transition-all"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={clsx(
                "relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-all active:scale-[0.95]",
                selected ? "text-accent" : "text-gray-400"
              )}
            >
              {selected && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 z-0 rounded-full bg-accent/10"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
              <div
                className={clsx(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                  selected ? "bg-accent text-white shadow-md shadow-accent/20" : "bg-transparent"
                )}
              >
                <Icon size={selected ? 18 : 18} strokeWidth={selected ? 2.5 : 2} />
              </div>
              <span
                className={clsx(
                  "relative z-10 text-[9px] font-black uppercase tracking-tighter transition-all",
                  selected ? "text-accent opacity-100" : "opacity-60"
                )}
              >
                {t(tab.key)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
