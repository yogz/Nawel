"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  Calendar,
  Edit3,
  ExternalLink,
  Download,
  PlusIcon,
  Package,
  ChevronRight,
} from "lucide-react";
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
  onCreateService?: (mealId: number) => void;
  setSheet: (sheet: Sheet) => void;
  handleAssign?: (item: Item, personId: number | null) => void;
  currentUserId?: string;
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
  onCreateService,
  setSheet,
  handleAssign,
  currentUserId,
}: MealContainerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const t = useTranslations("EventDashboard.Planning");
  const locale = useLocale();
  const format = useFormatter();
  const eventName = plan.event?.name || "Event";
  const calendarTitle = meal.title ? `${eventName} - ${meal.title}` : eventName;
  const calendarDescription = t("calendar.description", { title: calendarTitle });
  const calendarUrl = generateGoogleCalendarUrl(meal, eventName, calendarDescription);

  const getFullDateDisplay = () => {
    if (!meal.date || meal.date === "common") {
      return null;
    }
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
    } catch (_e) {
      return meal.date;
    }
  };

  const fullDate = getFullDateDisplay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 50, damping: 20 }}
      className={cn("relative flex flex-col gap-6 pt-2", plan.meals.length === 1 && "gap-0 pt-0")}
    >
      {/* Meal Info Row - Premium & Compact */}
      {plan.meals.length > 1 && (
        <div className="group/meal-card relative mx-0 overflow-hidden rounded-3xl border border-white/40 bg-white/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-500 hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 sm:p-6">
          {/* Decorative background accent */}
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover/meal-card:bg-accent/10" />

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div
              className={cn(
                "group flex items-center gap-3 text-left",
                !readOnly &&
                  "cursor-pointer rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
              )}
              onClick={() => !readOnly && setSheet({ type: "meal-edit", meal })}
              role={readOnly ? undefined : "button"}
              tabIndex={readOnly ? undefined : 0}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setSheet({ type: "meal-edit", meal });
                }
              }}
              aria-label={readOnly ? undefined : t("editMeal", { name: meal.title || meal.date })}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/5 text-accent transition-all hover:bg-accent/10 active:scale-90"
                aria-label={isExpanded ? t("collapse") : t("expand")}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChevronRight className="h-6 w-6" />
                </motion.div>
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-gradient-header truncate text-xl font-black tracking-tight sm:text-2xl">
                  {meal.date === "common" ? t("common") : meal.title || meal.date}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] sm:text-xs">
                  {fullDate && (
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-accent">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {fullDate}
                    </div>
                  )}
                  {meal.address && (
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-gray-500">
                      <MapPin className="h-3 w-3 text-gray-400" aria-hidden="true" />
                      <span className="truncate">{meal.address}</span>
                    </div>
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-accent/20 opacity-0 transition-all group-hover:bg-accent/5 group-hover:text-accent group-hover:opacity-100">
                  <Edit3 className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service Cards */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 px-0 pb-4">
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
                  handleAssign={handleAssign}
                  currentUserId={currentUserId}
                />
              ))}
              {!readOnly && onCreateService && (
                <Button
                  variant="premium"
                  className="h-14 w-full rounded-2xl border border-white/50 bg-white/80 text-accent shadow-accent backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-accent-lg focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 active:scale-95"
                  icon={<PlusIcon size={20} />}
                  shine
                  onClick={() => onCreateService(meal.id)}
                  aria-label={t("addService")}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent">
                    {t("addService")}
                  </span>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
