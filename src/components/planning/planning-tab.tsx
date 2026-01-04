"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { ServiceSection } from "./service-section";
import { useThemeMode } from "../theme-provider";
import { PlanningFilters } from "./organizer-header";
import { PlusIcon, Edit3, Clock, MapPin, ExternalLink, Download, Calendar } from "lucide-react";
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

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
  const [activeMealId, setActiveMealId] = useState<number | null>(
    plan.meals.length > 0 ? plan.meals[0].id : null
  );

  useEffect(() => {
    setHasMounted(true);
    if (!activeMealId && plan.meals.length > 0) {
      setActiveMealId(plan.meals[0].id);
    }
  }, [plan.meals, activeMealId]);

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
        <div className="flex flex-col gap-4">
          <div className="px-2">
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

          {plan.meals.length > 1 && (
            <div className="px-2">
              <Tabs
                value={activeMealId?.toString()}
                onValueChange={(val) => setActiveMealId(parseInt(val))}
                className="w-full"
              >
                <TabsList className="no-scrollbar h-10 w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
                  {plan.meals.map((meal) => (
                    <TabsTrigger
                      key={meal.id}
                      value={meal.id.toString()}
                      className="rounded-full border border-black/5 bg-white/50 px-4 py-1.5 text-xs font-bold text-gray-500 shadow-sm transition-all data-[state=active]:border-accent/20 data-[state=active]:bg-white data-[state=active]:text-accent data-[state=active]:shadow-md"
                    >
                      {meal.title || meal.date}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {plan.meals
          .filter((meal) => (plan.meals.length > 1 ? meal.id === activeMealId : true))
          .map((meal) => {
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
                className="relative flex flex-col gap-3 pt-2"
              >
                {/* Meal Info Row - Premium & Compact */}
                <div className="mx-2 flex items-center gap-3 rounded-2xl border border-white/40 bg-white/40 p-4 shadow-sm backdrop-blur-sm">
                  {/* Removed Meal Icon div */}

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
                            onClick={() =>
                              window.open(generateOutlookCalendarUrl(meal, eventName), "_blank")
                            }
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
