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
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6">
      <nav
        className="w-[80%] max-w-3xl rounded-3xl border border-black/5"
        style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center justify-around px-6 py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className="group flex flex-col items-center gap-0.5 transition-all active:scale-95"
              >
                <Icon
                  size={24}
                  strokeWidth={2}
                  className={clsx("transition-colors", selected ? "text-accent" : "text-gray-400")}
                />
                <span
                  className={clsx(
                    "text-[10px] font-medium transition-colors",
                    selected ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {t(tab.key)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
