"use client";

import { useState, useEffect, useMemo } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion, type Variants } from "framer-motion";
import { useThemeMode } from "../theme-provider";
import { PlusIcon, Calendar, Coffee, ArrowUpRight } from "lucide-react";
import { MealContainer } from "./meal-container";
import { DayTabs } from "./day-tabs";
import { Link } from "@/i18n/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CitationDisplay } from "../common/citation-display";
import { RSVPSummary } from "@/features/people/components/rsvp-summary";
import { RSVPControl } from "@/features/people/components/rsvp-control";

import {
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { type PlanData, type Item, type Sheet } from "@/lib/types";
import { Button } from "../ui/button";
import { useTranslations } from "next-intl";
import { EmptyState } from "../common/empty-state";
import { AriaLiveRegion } from "../common/aria-live-region";

interface PlanningTabProps {
  plan: PlanData;
  activeItemId: number | null;
  readOnly?: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAssign: (item: Item, serviceId?: number) => void;
  onDelete: (item: Item) => void;
  onCreateItem: (serviceId: number) => void;
  onInlineAdd?: (serviceId: number, name: string) => Promise<void> | void;
  onCreateService: (mealId: number) => void;
  setSheet: (sheet: Sheet) => void;
  sheet: Sheet | null;
  slug: string;
  writeKey?: string;
  isOwner?: boolean;
  onDeleteEvent?: () => Promise<void>;
  handleAssign?: (item: Item, personId: number | null) => void;
  handleUpdateStatus?: (
    id: number,
    status: "confirmed" | "declined" | "maybe",
    token?: string | null
  ) => void;
  handleUpdateGuestCount?: (
    id: number,
    adults: number,
    children: number,
    token?: string | null
  ) => void;
  currentUserId?: string;
  currentPersonId?: number;
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
  activeItemId,
  readOnly,
  sensors,
  onDragStart,
  onDragEnd,
  onAssign,
  onDelete,
  onCreateItem,
  onInlineAdd,
  onCreateService,
  setSheet,
  sheet,
  slug,
  writeKey,
  isOwner,
  onDeleteEvent,
  handleAssign,
  handleUpdateStatus,
  handleUpdateGuestCount,
  currentUserId,
  currentPersonId,
}: PlanningTabProps) {
  const t = useTranslations("EventDashboard.Planning");
  const tSettings = useTranslations("EventDashboard.Settings");
  // Theme hook removed
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
      <AriaLiveRegion>{plan.meals.length > 0 && `${plan.meals.length} repas`}</AriaLiveRegion>
      <motion.div
        variants={isMobile ? {} : containerVariants}
        initial={isMobile ? false : "hidden"}
        animate={isMobile ? false : "show"}
        className="space-y-4 pt-0 sm:space-y-6"
      >
        {/* RSVP Section at the top of the page */}
        {currentPersonId && handleUpdateStatus && handleUpdateGuestCount && (
          <RSVPControl
            person={plan.people.find((p) => p.id === currentPersonId)!}
            token={null} // use current session/token automatically via handler
            readOnly={readOnly}
            onUpdateStatus={handleUpdateStatus}
            onUpdateGuestCount={handleUpdateGuestCount}
            onValidated={() => {}} // Planning tab currently doesn't manage external edit state
            variant="card"
          />
        )}

        <div className="flex flex-col gap-2">
          <DayTabs days={uniqueDates} selectedDate={selectedDate} onSelect={setSelectedDate} />
        </div>

        {plan.meals
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
                activeItemId={activeItemId}
                readOnly={readOnly}
                onAssign={onAssign}
                onDelete={onDelete}
                onCreateItem={onCreateItem}
                onInlineAdd={onInlineAdd}
                onCreateService={onCreateService}
                setSheet={setSheet}
                handleAssign={handleAssign}
                currentUserId={currentUserId}
                currentPersonId={currentPersonId}
              />
            );
          })}
      </motion.div>
      {plan.meals.length === 0 && (
        <EmptyState
          icon={<Calendar className="h-20 w-20" strokeWidth={1.5} />}
          title={t("noMeals")}
          description={
            t("noMealsDesc") ||
            "Donnez vie à votre événement ! Ajoutez votre premier repas pour commencer à vous organiser en toute simplicité."
          }
          action={
            !readOnly
              ? {
                  label: t("addMeal"),
                  onClick: () => setSheet({ type: "meal-create" }),
                  icon: <PlusIcon size={24} />,
                }
              : undefined
          }
        />
      )}
      {!readOnly && plan.meals.length > 0 && (
        <div className="mt-12 flex flex-col items-center gap-6 px-4 pb-12">
          {/* Main Actions Stack - Glassmorphism style */}
          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => setSheet({ type: "meal-create" })}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent/5 px-5 py-3 text-sm font-semibold text-accent/80 transition-all hover:bg-accent/10 hover:text-accent active:scale-95"
            >
              <PlusIcon size={16} strokeWidth={2.5} />
              <span>{t("addMeal")}</span>
            </button>
          </div>

          {/* Poetic Quote before buttons */}
          <div className="mt-12 w-full max-w-md px-4 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <CitationDisplay seed={slug} className="text-center" />
          </div>

          {/* Premium Footer Actions */}
          <div className="mt-8 flex w-full flex-col items-center justify-center gap-6 border-t border-black/5 pt-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                className="h-10 w-44 rounded-2xl border-none bg-accent text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] hover:bg-accent/90 active:scale-95"
                asChild
              >
                <Link href="/behind-the-scenes" className="flex items-center justify-center gap-2">
                  <ArrowUpRight size={14} />
                  {tSettings("behindTheScenes") || "Behind the Scenes"}
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-10 w-44 rounded-2xl border-none bg-[#FFDD00] text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-yellow-200/50 transition-all hover:scale-[1.02] hover:bg-[#FFDD00]/90 active:scale-95"
                asChild
              >
                <a
                  href="https://www.buymeacoffee.com/colist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <Coffee size={14} />
                  Buy Me a Coffee
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
