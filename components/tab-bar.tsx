"use client";

import { CalendarRange, ListChecks, Settings, Users, History } from "lucide-react";
import clsx from "clsx";

const tabs = [
  { key: "planning", label: "Menu", icon: CalendarRange },
  { key: "people", label: "Invités", icon: Users },
  { key: "logs", label: "Historique", icon: History },
  { key: "settings", label: "Prefs", icon: Settings },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.05] bg-surface/90 backdrop-blur-lg">
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

export type { TabKey };
