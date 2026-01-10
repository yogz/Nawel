"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarDays, Stars, Package } from "lucide-react";

interface DayTabsProps {
  days: string[]; // Format: 'YYYY-MM-DD'
  selectedDate: string; // 'all' or 'YYYY-MM-DD'
  onSelect: (date: string) => void;
}

export function DayTabs({ days, selectedDate, onSelect }: DayTabsProps) {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("EventDashboard.Planning");

  const getDayDisplay = (dateStr: string) => {
    if (dateStr === "all") {
      return {
        label: t("all"),
        sublabel: null,
      };
    }
    if (dateStr === "common") {
      return {
        label: t("common"),
        sublabel: null,
      };
    }
    try {
      const d = new Date(dateStr + "T12:00:00");
      // Format like "Fri" or "Vendredi"
      const dayName = format.dateTime(d, { weekday: "short" });
      // Format like "12"
      const dayNum = format.dateTime(d, { day: "numeric" });
      // Month like "Jan."
      const month = format.dateTime(d, { month: "short" });

      return {
        label: `${dayName} ${dayNum}`,
        sublabel: month,
      };
    } catch {
      return { label: dateStr, sublabel: null };
    }
  };

  if (days.length <= 1) return null;

  return (
    <div className="relative mb-6">
      {/* Scrollable Container */}
      <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto px-1 pb-2 pt-1">
        <TabItem
          id="all"
          selected={selectedDate === "all"}
          onClick={() => onSelect("all")}
          display={getDayDisplay("all")}
          icon={<Stars size={14} />}
        />
        {days.map((day) => (
          <TabItem
            key={day}
            id={day}
            selected={selectedDate === day}
            onClick={() => onSelect(day)}
            display={getDayDisplay(day)}
            icon={day === "common" ? <Package size={14} /> : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function TabItem({
  id,
  selected,
  onClick,
  display,
  icon,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  display: { label: string; sublabel: string | null };
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex min-w-[70px] shrink-0 flex-col items-center justify-center rounded-2xl px-4 py-2.5 transition-all duration-300 active:scale-95",
        selected ? "text-accent" : "text-gray-400 hover:bg-gray-100/50 hover:text-gray-600"
      )}
    >
      {selected && (
        <motion.div
          layoutId="day-tab-bg"
          className="absolute inset-0 rounded-2xl bg-white shadow-md shadow-accent/5 ring-1 ring-black/[0.05]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}

      <div className="relative flex flex-col items-center gap-0.5">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-widest transition-colors",
            selected ? "text-accent" : "text-gray-400"
          )}
        >
          {display.label}
        </span>
        {display.sublabel && (
          <span
            className={cn(
              "text-[9px] font-bold opacity-60",
              selected ? "text-accent/70" : "text-gray-400"
            )}
          >
            {display.sublabel}
          </span>
        )}
        {icon && (
          <div
            className={cn("mt-0.5 transition-colors", selected ? "text-accent" : "text-gray-300")}
          >
            {icon}
          </div>
        )}
      </div>

      {selected && (
        <motion.div
          layoutId="day-tab-indicator"
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-accent"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
