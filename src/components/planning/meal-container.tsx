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
} from "@/lib/utils";
import { type Meal, type PlanData, type PlanningFilter, type Item, type Sheet } from "@/lib/types";
import { useTranslations } from "next-intl";

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
  const eventName = plan.event?.name || "Événement";
  const calendarUrl = generateGoogleCalendarUrl(meal, eventName);

  return (
    <motion.div variants={itemVariants} className="relative flex flex-col gap-3 pt-2">
      {/* Meal Info Row - Premium & Compact */}
      <div className="mx-2 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-black tracking-tight text-black">
              {meal.title || meal.date}
            </h2>
            {!readOnly && (
              <button
                onClick={() => setSheet({ type: "meal-edit", meal })}
                className="text-accent/40 transition-colors hover:text-accent"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-400">
            {(meal.date || meal.time) && (
              <div className="flex items-center gap-1 text-accent">
                <Clock className="h-3 w-3" />
                {meal.date} {meal.time && `• ${meal.time}`}
              </div>
            )}
            {meal.address && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{meal.address}</span>
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
