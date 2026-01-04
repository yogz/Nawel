"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { ServiceSection } from "./service-section";
import { CitationDisplay } from "../common/citation-display";
import { useThemeMode } from "../theme-provider";
import {
  PlusIcon,
  CalendarPlus,
  Clock,
  MapPin,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import {
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { type PlanData, type PlanningFilter, type Item, type Sheet } from "@/lib/types";
import { Button } from "../ui/button";
import { useTranslations } from "next-intl";

interface PlanningTabProps {
  plan: PlanData;
  planningFilter: PlanningFilter;
  activeItemId: number | null;
  readOnly?: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAssign: (item: Item, serviceId?: number) => void;
  onDelete: (item: Item) => void;
  onCreateItem: (serviceId: number) => void;
  onCreateService: (mealId: number) => void;
  setSheet: (sheet: Sheet) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } },
};

export function PlanningTab({
  plan,
  planningFilter,
  activeItemId,
  readOnly,
  sensors,
  onDragStart,
  onDragEnd,
  onAssign,
  onDelete,
  onCreateItem,
  onCreateService,
  setSheet,
}: PlanningTabProps) {
  const t = useTranslations("EventDashboard.Planning");
  const { theme } = useThemeMode();
  const [hasMounted, setHasMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHasMounted(true), []);

  if (!hasMounted) {
    return null;
  }

  const eventName = plan.event?.name || "Événement";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-16"
      >
        {plan.meals.map((meal) => {
          const hasMatch = meal.services.some((s) =>
            s.items.some((i) => {
              if (planningFilter.type === "all") {
                return true;
              }
              if (planningFilter.type === "unassigned") {
                return !i.personId;
              }
              if (planningFilter.type === "person") {
                return i.personId === planningFilter.personId;
              }
              return false;
            })
          );
          if (planningFilter.type !== "all" && !hasMatch) {
            return null;
          }

          const calendarUrl = generateGoogleCalendarUrl(meal, eventName);

          return (
            <motion.div
              key={meal.id}
              variants={itemVariants}
              className="relative"
            >
              {/* Timeline connector line (visual only) */}
              {plan.meals.length > 1 && (
                <div className="absolute left-[29px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent -z-10" />
              )}

              <div className="flex items-start gap-5">
                <div className="relative shrink-0 pt-1">
                  <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
                  <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/40 bg-gradient-to-br from-white to-gray-50 text-3xl shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
                    <span>
                      {theme === "christmas" ? "🎄" : theme === "aurora" ? "✨" : "🍴"}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      {!readOnly ? (
                        <button
                          onClick={() => setSheet({ type: "meal-edit", meal })}
                          className="group flex min-w-0 items-center gap-2 text-left transition-colors"
                          aria-label={`${t("editMeal")} ${meal.title || meal.date}`}
                        >
                          <h2 className="text-3xl font-black tracking-tighter text-gray-800 transition-colors group-hover:text-accent">
                            {meal.title || meal.date}
                          </h2>
                        </button>
                      ) : (
                        <h2 className="text-3xl font-black tracking-tighter text-gray-800">
                          {meal.title || meal.date}
                        </h2>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-500">
                        {meal.time && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-600">
                            <Clock className="h-3.5 w-3.5" />
                            {meal.time}
                          </div>
                        )}
                        {meal.address && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100/80 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gray-600">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="max-w-[200px] truncate">{meal.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center pt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="premium"
                            className="h-10 w-10 rounded-full border border-black/[0.05] bg-white p-0 shadow-sm transition-all hover:scale-105 hover:shadow-md"
                            icon={<CalendarPlus className="h-5 w-5" />}
                            iconClassName="h-full w-full bg-transparent text-accent"
                            aria-label={t("calendar.options")}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="glass w-56 p-2" align="end">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => window.open(calendarUrl, "_blank")}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all hover:bg-accent hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t("calendar.google")}
                            </button>
                            <button
                              onClick={() =>
                                window.open(generateOutlookCalendarUrl(meal, eventName), "_blank")
                              }
                              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all hover:bg-accent hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t("calendar.outlook")}
                            </button>
                            <div className="my-1 border-t border-black/[0.05]" />
                            <button
                              onClick={() => downloadIcsFile(meal, eventName)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all hover:bg-accent hover:text-white"
                            >
                              <Download className="h-4 w-4" />
                              {t("calendar.download")}
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="mt-4 mb-8">
                    <CitationDisplay seed={meal.title || meal.date} />
                  </div>

                  <div className="space-y-4">
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
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      {plan.meals.length === 0 && planningFilter.type === "all" && (
        <div className="px-4 py-8 text-center">
          <p className="mb-4 text-gray-500">{t("noMeals")}</p>
          {!readOnly && (
            <Button
              variant="premium"
              className="w-full border-2 border-dashed border-accent/20 bg-accent/5 p-4 pr-6"
              icon={<PlusIcon />}
              onClick={() => setSheet({ type: "meal-create" })}
            >
              <span className="font-semibold text-accent">{t("addMeal")}</span>
            </Button>
          )}
        </div>
      )}
      {!readOnly && planningFilter.type === "all" && plan.meals.length > 0 && (
        <div className="mt-12 flex flex-col gap-4 px-4">
          <Button
            variant="premium"
            className="w-full h-14 rounded-2xl border-none bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-purple-500/40"
            icon={<PlusIcon className="text-white" />}
            iconClassName="bg-white/20"
            onClick={() => onCreateService(plan.meals[0]?.id ?? -1)}
          >
            <span className="text-sm font-black uppercase tracking-wider">{t("addService")}</span>
          </Button>
        </div>
      )}
    </DndContext>
  );
}
