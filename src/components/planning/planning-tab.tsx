"use client";

import { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { ServiceSection } from "./service-section";
import { useThemeMode } from "../theme-provider";
import { PlanningFilters } from "./organizer-header";
import { PlusIcon, Calendar } from "lucide-react";
import { MealContainer } from "./meal-container";
import { cn } from "@/lib/utils";
import { DangerZoneTrigger, DangerZoneContent } from "../common/danger-zone";
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
  const { theme } = useThemeMode();
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);

  const [isDeleteRevealed, setIsDeleteRevealed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteWrapper = async () => {
    if (!onDeleteEvent) return;
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

          {/* Danger Zone - Two-step process */}
          {isOwner && onDeleteEvent && (
            <div className="mt-4 flex w-full flex-col items-center gap-4">
              {!isDeleteRevealed ? (
                <div className="w-full max-w-sm">
                  <DangerZoneTrigger
                    onClick={() => setIsDeleteRevealed(true)}
                    label={`${tSettings("dangerZone")} / ${tSettings("deleteEvent")}`}
                    className="bg-transparent opacity-60 hover:bg-red-50 hover:opacity-100"
                  />
                </div>
              ) : (
                <div className="w-full animate-in fade-in slide-in-from-bottom-2">
                  <DangerZoneContent
                    onDelete={handleDeleteWrapper}
                    onCancel={() => setIsDeleteRevealed(false)}
                    isDeleting={isDeleting}
                    title={tSettings("deleteEvent")}
                    warningMessage="Attention : Cette action est irréversible. Toutes les données de l'événement seront définitivement supprimées."
                    deleteButtonLabel={tSettings("deleteEvent")}
                    confirmationConfig={{
                      title: tSettings("deleteEvent"),
                      description:
                        "Cette action est irréversible. Veuillez taper le nom de l'événement pour confirmer.",
                      confirmationInput: plan.event?.name,
                      confirmLabel: tSettings("deleteEvent"),
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DndContext>
  );
}
