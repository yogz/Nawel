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
      className="bg-surface/80 fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.03] backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-around py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={clsx(
                "group flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]",
                selected ? "text-accent" : "text-gray-400"
              )}
            >
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                  selected
                    ? "bg-accent/10 shadow-[0_0_20px_-5px_rgba(var(--accent),0.3)]"
                    : "bg-transparent group-hover:bg-gray-50"
                )}
              >
                <Icon size={selected ? 22 : 20} strokeWidth={selected ? 2.5 : 2} />
              </div>
              <span
                className={clsx(
                  "text-[10px] font-black uppercase tracking-widest",
                  selected ? "opacity-100" : "opacity-60"
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
