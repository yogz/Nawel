"use client";

import { CalendarRange, Settings, Users, ShoppingCart } from "lucide-react";
import clsx from "clsx";

const authenticatedTabs = [
  { key: "planning", label: "Menu", icon: CalendarRange },
  { key: "people", label: "Convives", icon: Users },
  { key: "shopping", label: "Courses", icon: ShoppingCart },
] as const;

const guestTabs = [
  { key: "planning", label: "Menu", icon: CalendarRange },
  { key: "people", label: "Convives", icon: Users },
  { key: "settings", label: "Prefs", icon: Settings },
] as const;

export type TabKey = "planning" | "people" | "shopping" | "settings";

interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  isAuthenticated?: boolean;
}

export function TabBar({ active, onChange, isAuthenticated }: TabBarProps) {
  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;

  return (
    <nav
      className="bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.05] backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium",
                selected ? "text-accent" : "text-gray-500"
              )}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
