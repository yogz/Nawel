"use client";

import { CalendarRange, Settings, Users, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";

const authenticatedTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
  { key: "shopping", icon: ShoppingCart },
] as const;

const guestTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
  { key: "settings", icon: Settings },
] as const;

export type TabKey = "planning" | "people" | "shopping" | "settings";

interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  isAuthenticated?: boolean;
}

export function TabBar({ active, onChange, isAuthenticated }: TabBarProps) {
  const t = useTranslations("EventDashboard.TabBar");
  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;

  return (
    <nav
      className="bg-white/90 fixed inset-x-0 bottom-0 z-40 border-t border-purple-200/40 backdrop-blur-md shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-around py-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={clsx(
                "group flex flex-col items-center gap-1.5 transition-all active:scale-[0.95]",
                selected ? "text-accent" : "text-gray-400 transition-colors"
              )}
            >
              <div
                className={clsx(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                  selected
                    ? "bg-accent text-white shadow-lg"
                    : "bg-transparent group-hover:bg-accent/10"
                )}
              >
                <Icon size={selected ? 24 : 22} strokeWidth={selected ? 2.5 : 2} />
              </div>
              <span
                className={clsx(
                  "text-[9px] font-black uppercase tracking-widest transition-all",
                  selected ? "opacity-100 text-accent" : "opacity-70"
                )}
              >
                {t(tab.key)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
