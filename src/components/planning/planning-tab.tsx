"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { ServiceSection } from "./service-section";
import { useThemeMode } from "../theme-provider";
import { PlanningFilters } from "./organizer-header";
import { PlusIcon, Edit3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealContainer } from "./meal-container";
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
  isOwner?: boolean;
  onDeleteEvent?: () => void;
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
  isOwner,
  onDeleteEvent,
}: PlanningTabProps) {
  const t = useTranslations("EventDashboard.Planning");
  const tSettings = useTranslations("EventDashboard.Settings");
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

            return (
              <MealContainer
                key={meal.id}
                meal={meal}
                plan={plan}
                planningFilter={planningFilter}
                activeItemId={activeItemId}
                readOnly={readOnly}
                onAssign={onAssign}
                onDelete={onDelete}
                onCreateItem={onCreateItem}
                setSheet={setSheet}
                itemVariants={itemVariants}
              />
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
        <div className="mt-8 flex flex-col gap-3 px-4 pb-12">
          {/* Main Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="premium"
              className="h-12 w-full rounded-2xl border-none bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-95"
              icon={<PlusIcon className="text-white/80" size={18} />}
              onClick={() => onCreateService(activeMealId ?? plan.meals[0]?.id ?? -1)}
            >
              <span className="text-[11px] font-black uppercase tracking-wider">
                {t("addService")}
              </span>
            </Button>

            <Button
              variant="premium"
              className="h-12 w-full rounded-2xl border border-white/20 bg-white/60 text-gray-900 shadow-lg shadow-gray-200/50 backdrop-blur-xl transition-all hover:scale-[1.02] hover:bg-white active:scale-95"
              icon={<PlusIcon className="text-gray-400" size={18} />}
              onClick={() => setSheet({ type: "meal-create" })}
            >
              <span className="text-[11px] font-black uppercase tracking-wider">
                {t("addMeal")}
              </span>
            </Button>
          </div>

          {/* Danger Zone - Only for owner */}
          {isOwner && onDeleteEvent && (
            <button
              onClick={onDeleteEvent}
              className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/30 py-4 text-red-500/60 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98]"
            >
              <PlusIcon
                className="rotate-45 transition-transform group-hover:scale-110"
                size={16}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {tSettings("dangerZone")} / {t("deleteEvent")}
              </span>
            </button>
          )}
        </div>
      )}
    </DndContext>
  );
}
