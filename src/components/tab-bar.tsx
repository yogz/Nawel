"use client";

import { CalendarRange, Settings, Users, ShoppingCart, User } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";

const authenticatedTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
  { key: "shopping", icon: ShoppingCart },
  { key: "profile", icon: User },
] as const;

const guestTabs = [
  { key: "planning", icon: CalendarRange },
  { key: "people", icon: Users },
  { key: "settings", icon: Settings },
] as const;

export type TabKey = "planning" | "people" | "shopping" | "settings" | "profile";

interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  isAuthenticated?: boolean;
  userImage?: string | null;
}

export function TabBar({ active, onChange, isAuthenticated, userImage }: TabBarProps) {
  const t = useTranslations("EventDashboard.TabBar");
  const tabs = isAuthenticated ? authenticatedTabs : guestTabs;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-purple-200/30 shadow-[0_-4px_16px_rgba(120,80,180,0.08)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(255, 255, 255, 0.6)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
      }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-around py-2.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          const isProfile = tab.key === "profile";

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={clsx(
                "group flex flex-col items-center gap-1 transition-all active:scale-[0.95]",
                selected ? "text-accent" : "text-gray-400 transition-colors"
              )}
            >
              <div
                className={clsx(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300",
                  isProfile && userImage
                    ? "overflow-hidden ring-2 ring-gray-200"
                    : selected
                    ? "bg-accent text-white shadow-lg"
                    : "bg-transparent group-hover:bg-accent/10"
                )}
              >
                {isProfile && userImage ? (
                  <img
                    src={userImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon size={selected ? 22 : 20} strokeWidth={selected ? 2.5 : 2} />
                )}
              </div>
              <span
                className={clsx(
                  "text-[8.5px] font-black uppercase tracking-widest transition-all",
                  selected ? "opacity-100 text-accent" : "opacity-60"
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
