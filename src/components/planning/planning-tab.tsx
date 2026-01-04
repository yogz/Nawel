"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { ServiceSection } from "./service-section";
import { useThemeMode } from "../theme-provider";
import { PlanningFilters } from "./organizer-header";
import { PlusIcon, CalendarPlus, Clock, MapPin, ExternalLink, Download } from "lucide-react";
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
  // eslint-disable-next-line no-unused-vars
  setPlanningFilter: (filter: PlanningFilter) => void;
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
  sheet: Sheet | null;
  slug: string;
  writeKey?: string;
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
  setPlanningFilter,
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
  sheet,
  slug,
  writeKey,
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
  const unassignedItemsCount = plan.meals.reduce(
    (acc, meal) =>
      acc +
      meal.services.reduce(
        (acc2, service) => acc2 + service.items.filter((i) => !i.personId).length,
        0
      ),
    0
  );

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
        className="space-y-2 pt-0"
      >
        <div className="px-0 pt-0">
          <PlanningFilters
            plan={plan}
            planningFilter={planningFilter}
            setPlanningFilter={setPlanningFilter}
            setSheet={setSheet}
            sheet={sheet}
            unassignedItemsCount={unassignedItemsCount}
            slug={slug}
            writeKey={writeKey}
            readOnly={!!readOnly}
          />
        </div>

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
              className="relative flex flex-col gap-3 pt-4"
            >
              {/* Meal Title Row - Aligned horizontally */}
              <div className="flex items-center gap-3 px-1">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-accent/20 blur-lg" />
                  <div className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/40 bg-white/40 text-xl shadow-sm backdrop-blur-sm">
                    <span>{theme === "christmas" ? "🎄" : theme === "aurora" ? "✨" : "🍴"}</span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  {!readOnly ? (
                    <button
                      onClick={() => setSheet({ type: "meal-edit", meal })}
                      className="group flex min-w-0 items-center justify-between text-left transition-colors"
                      aria-label={`${t("editMeal")} ${meal.title || meal.date}`}
                    >
                      <h2 className="truncate text-xl font-black tracking-tight text-gray-800 transition-colors group-hover:text-accent">
                        {meal.title || meal.date}
                      </h2>
                    </button>
                  ) : (
                    <h2 className="truncate text-xl font-black tracking-tight text-gray-800">
                      {meal.title || meal.date}
                    </h2>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                    {meal.time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meal.time}
                      </div>
                    )}
                    {meal.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[150px] truncate">{meal.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="premium"
                        className="h-8 w-8 rounded-full border border-black/[0.05] bg-white p-0 shadow-sm transition-all hover:scale-105 hover:shadow-md"
                        icon={<CalendarPlus className="h-4 w-4" />}
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

              {/* Service Cards - Now Full Width matching the header */}
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
        <div className="mt-8 flex flex-col gap-4 px-4 pb-12">
          <Button
            variant="premium"
            className="h-12 w-full rounded-2xl border-none bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:shadow-purple-500/40"
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
