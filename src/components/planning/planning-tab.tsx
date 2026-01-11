"use client";

import { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { useThemeMode } from "../theme-provider";
import { PlanningFilters } from "./event-planner-header";
import { PlusIcon, Calendar, Coffee, ArrowUpRight } from "lucide-react";
import { MealContainer } from "./meal-container";
import { DayTabs } from "./day-tabs";
import { Link } from "@/i18n/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  onDeleteEvent?: () => Promise<void>;
  handleAssign?: (item: Item, personId: number | null) => void;
  currentUserId?: string;
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
  handleAssign,
  currentUserId,
}: PlanningTabProps) {
  const t = useTranslations("EventDashboard.Planning");
  const tSettings = useTranslations("EventDashboard.Settings");
  const { theme: _theme } = useThemeMode();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract unique sorted dates from meals
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    plan.meals.forEach((m) => {
      if (m.date) dates.add(m.date);
    });
    const sorted = Array.from(dates)
      .filter((d) => d !== "common")
      .sort();
    if (dates.has("common")) {
      return ["common", ...sorted];
    }
    return sorted;
  }, [plan.meals]);

  const [selectedDate, setSelectedDate] = useState<string>("all");

  // Reset selected date if it's not in the list anymore (unless it's 'all')
  useEffect(() => {
    if (selectedDate !== "all" && !uniqueDates.includes(selectedDate)) {
      setSelectedDate("all");
    }
  }, [uniqueDates, selectedDate]);

  const handleDeleteWrapper = async () => {
    if (!onDeleteEvent) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteEvent();
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // All hooks must be called before any conditional returns
  const unassignedItemsCount = useMemo(
    () =>
      plan.meals.reduce(
        (acc, meal) =>
          acc +
          meal.services.reduce(
            (acc2, service) => acc2 + service.items.filter((i) => !i.personId).length,
            0
          ),
        0
      ),
    [plan.meals]
  );

  // Reset filter to "all" when no more unassigned items
  useEffect(() => {
    if (planningFilter.type === "unassigned" && unassignedItemsCount === 0) {
      setPlanningFilter({ type: "all" });
    }
  }, [unassignedItemsCount, planningFilter.type, setPlanningFilter]);

  // Early return after all hooks are called
  if (!hasMounted) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <motion.div
        variants={isMobile ? {} : containerVariants}
        initial={isMobile ? false : "hidden"}
        animate={isMobile ? false : "show"}
        className="space-y-2 pt-0"
      >
        <div className="flex flex-col gap-3">
          {unassignedItemsCount > 0 && (
            <div className="px-0">
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
          )}

          <DayTabs days={uniqueDates} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        {plan.meals
          .filter((meal) => {
            // Afficher tous les repas (même vides) pour le filtre "all"
            if (planningFilter.type === "all") {
              return true;
            }
            // Pour les autres filtres, vérifier s'il y a des correspondances
            // Si le repas n'a pas de services, il n'y a pas de correspondance
            if (!meal.services || meal.services.length === 0) {
              return false;
            }
            const hasMatch = meal.services.some((s) =>
              s.items.some((i) => {
                if (planningFilter.type === "unassigned") {
                  return !i.personId;
                }
                if (planningFilter.type === "person") {
                  return i.personId === planningFilter.personId;
                }
                return false;
              })
            );
            return hasMatch;
          })
          .filter((meal) => {
            if (selectedDate === "all") return true;
            return meal.date === selectedDate;
          })
          .sort((a, b) => {
            // Toujours mettre 'common' en premier dans la vue 'all'
            if (a.date === "common") return -1;
            if (b.date === "common") return 1;
            return (a.date || "").localeCompare(b.date || "");
          })
          .map((meal) => {
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
                onCreateService={onCreateService}
                setSheet={setSheet}
                handleAssign={handleAssign}
                currentUserId={currentUserId}
              />
            );
          })}
      </motion.div>
      {plan.meals.length === 0 && planningFilter.type === "all" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-12 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mb-6 flex justify-center"
          >
            <Calendar className="h-20 w-20 text-gray-300" />
          </motion.div>
          <h3 className="mb-2 text-lg font-bold text-gray-900">{t("noMeals")}</h3>
          <p className="mx-auto mb-6 max-w-sm text-sm text-gray-500">
            Créez votre premier repas pour commencer à organiser votre événement
          </p>
          {!readOnly && (
            <Button
              variant="premium"
              className="h-14 w-full max-w-xs text-base font-bold sm:h-12 sm:text-sm"
              icon={<PlusIcon size={24} className="sm:h-5 sm:w-5" />}
              onClick={() => setSheet({ type: "meal-create" })}
            >
              {t("addMeal")}
            </Button>
          )}
        </motion.div>
      )}
      {!readOnly && planningFilter.type === "all" && plan.meals.length > 0 && (
        <div className="mt-12 flex flex-col items-center gap-6 px-4 pb-12">
          {/* Main Actions Stack - Glassmorphism style */}
          <div className="flex w-full flex-col gap-3">
            <Button
              variant="premium"
              className="h-12 w-full rounded-2xl border border-white/20 bg-white/40 text-gray-500 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 hover:text-accent active:scale-95"
              icon={<PlusIcon size={16} />}
              shine
              onClick={() => setSheet({ type: "meal-create" })}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("addMeal")}</span>
            </Button>
          </div>

          {/* Premium Footer Actions */}
          <div className="mt-8 flex w-full flex-col items-center justify-center gap-6 border-t border-black/5 pt-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-none bg-[#FFDD00] px-6 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-200/50 transition-all hover:scale-[1.02] hover:bg-[#FFDD00]/90 active:scale-95"
                asChild
              >
                <a
                  href="https://www.buymeacoffee.com/colist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Coffee size={14} />
                  Buy Me a Coffee
                </a>
              </Button>

              <Link
                href="/behind-the-scenes"
                className="text-text/40 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors hover:text-accent"
              >
                {tSettings("behindTheScenes") || "Behind the Scenes"}
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <p className="text-text/20 text-[10px] font-medium italic">
              Fait avec ❤️ par un indépendant
            </p>
          </div>
        </div>
      )}
    </DndContext>
  );
}
