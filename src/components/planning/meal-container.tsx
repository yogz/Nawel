"use client";

import { motion, type Variants } from "framer-motion";
import { Clock, MapPin, Calendar, Edit3, ExternalLink, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ServiceSection } from "./service-section";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
  cn,
} from "@/lib/utils";
import { type Meal, type PlanData, type PlanningFilter, type Item, type Sheet } from "@/lib/types";
import { useTranslations, useLocale, useFormatter } from "next-intl";

interface MealContainerProps {
  meal: Meal;
  plan: PlanData;
  planningFilter: PlanningFilter;
  activeItemId: number | null;
  readOnly?: boolean;
  onAssign: (item: Item, serviceId?: number) => void;
  onDelete: (item: Item) => void;
  onCreateItem: (serviceId: number) => void;
  setSheet: (sheet: Sheet) => void;
  itemVariants: Variants;
}

export function MealContainer({
  meal,
  plan,
  planningFilter,
  activeItemId,
  readOnly,
  onAssign,
  onDelete,
  onCreateItem,
  setSheet,
  itemVariants,
}: MealContainerProps) {
  const t = useTranslations("EventDashboard.Planning");
  const locale = useLocale();
  const format = useFormatter();
  const eventName = plan.event?.name || "Événement";
  const calendarUrl = generateGoogleCalendarUrl(meal, eventName);

  const getFullDateDisplay = () => {
    if (!meal.date) return null;
    try {
      const d = new Date(`${meal.date}T${meal.time || "12:00"}`);
      let full = format.dateTime(d, {
        dateStyle: "full",
        timeStyle: meal.time ? "short" : undefined,
      });

      if (locale === "fr") {
        full = full.replace(":", "h");
      }

      return full.charAt(0).toUpperCase() + full.slice(1);
    } catch (e) {
      return meal.date;
    }
  };

  const fullDate = getFullDateDisplay();

  return (
    <motion.div variants={itemVariants} className="relative flex flex-col gap-3 pt-2">
      {/* Meal Info Row - Premium & Compact */}
      <div className="mx-2 flex items-center gap-3 rounded-2xl border border-l-4 border-black/[0.05] border-l-accent bg-white/95 p-4 shadow-sm backdrop-blur-sm transition-all duration-300">
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            className={cn("group flex items-center gap-2 text-left", !readOnly && "cursor-pointer")}
            onClick={() => !readOnly && setSheet({ type: "meal-edit", meal })}
            disabled={readOnly}
          >
            <h2 className="text-gradient-header truncate text-lg font-black tracking-tight">
              {meal.title || meal.date}
            </h2>
            {!readOnly && (
              <span className="shrink-0 text-accent/20 opacity-0 transition-all group-hover:text-accent group-hover:opacity-100">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
            )}
          </button>

          <div className="mt-1.5 flex flex-col gap-1 text-[11px]">
            {fullDate && (
              <div className="flex items-center gap-1.5 font-bold text-accent">
                <Clock className="h-3 w-3" />
                {fullDate}
              </div>
            )}
            {meal.address && (
              <div className="flex items-center gap-1.5 font-medium text-gray-500">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="truncate">{meal.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="premium"
                className="h-7 w-7 rounded-full border border-black/[0.05] bg-white p-0 shadow-sm transition-all hover:scale-105 hover:shadow-md"
                icon={<Calendar className="h-3 w-3" />}
                iconClassName="h-full w-full bg-transparent text-accent"
              />
            </PopoverTrigger>
            <PopoverContent className="glass w-56 p-2" align="end">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => window.open(calendarUrl, "_blank")}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("calendar.google")}
                </button>
                <button
                  onClick={() => window.open(generateOutlookCalendarUrl(meal, eventName), "_blank")}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("calendar.outlook")}
                </button>
                <div className="my-1 border-t border-black/[0.05]" />
                <button
                  onClick={() => downloadIcsFile(meal, eventName)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("calendar.download")}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Service Cards */}
      <div className="space-y-4 px-2 pb-4">
        {meal.services.map((service) => (
          <ServiceSection
            key={service.id}
            service={service}
            people={plan.people}
            readOnly={readOnly}
            onAssign={(item) => onAssign(item, service.id)}
            onDelete={onDelete}
            onCreate={() => onCreateItem(service.id)}
            onEdit={() => setSheet({ type: "service-edit", service })}
            filter={planningFilter}
            activeItemId={activeItemId}
          />
        ))}
      </div>
    </motion.div>
  );
}
