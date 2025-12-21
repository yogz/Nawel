"use client";

import { CalendarRange, ListChecks, Settings, Users } from "lucide-react";
import clsx from "clsx";

const tabs = [
  { key: "planning", label: "Planning", icon: CalendarRange },
  { key: "unassigned", label: "Unassigned", icon: ListChecks },
  { key: "people", label: "People", icon: Users },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
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
