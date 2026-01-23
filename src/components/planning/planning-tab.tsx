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
        className="space-y-4 pt-0 sm:space-y-6"
      >
        {/* RSVP Section at the top of the page */}
        <div className="space-y-4 bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-white/20 shadow-sm mb-2">
          <RSVPSummary
            plan={plan}
            selectedPersonId={null} // No filter here by default or keep it synced?
            onSelectPerson={() => {}} // No filtering in planning tab for now
            onAddPerson={readOnly ? undefined : () => setSheet({ type: "person" })}
            readOnly={readOnly}
          />

          {currentPersonId && handleUpdateStatus && handleUpdateGuestCount && (
            <RSVPControl
              person={plan.people.find((p) => p.id === currentPersonId)!}
              token={null} // use current session/token automatically via handler
              readOnly={readOnly}
              onUpdateStatus={handleUpdateStatus}
              onUpdateGuestCount={handleUpdateGuestCount}
              variant="card"
            />
          )}
        </div>

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-20 text-center"
        >
          <div className="group relative mb-8">
            <div className="absolute -inset-8 animate-pulse rounded-full bg-accent/5 blur-2xl transition-all group-hover:bg-accent/10" />
            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [0, -2, 2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative rounded-3xl bg-white/50 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
            >
              <Calendar className="h-20 w-20 text-accent/20" strokeWidth={1.5} />
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 shadow-lg ring-1 ring-accent/20">
                <PlusIcon className="h-5 w-5 text-accent" strokeWidth={2.5} />
              </div>
            </motion.div>
          </div>

          <h3 className="mb-3 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            {t("noMeals")}
          </h3>
          <p className="mb-10 max-w-sm text-base font-medium leading-relaxed text-gray-500">
            {t("noMealsDesc") ||
              "Donnez vie à votre événement ! Ajoutez votre premier repas pour commencer à vous organiser en toute simplicité."}
          </p>

          {!readOnly && (
            <Button
              variant="premium"
              size="lg"
              className="h-14 w-full max-w-xs rounded-full bg-accent text-lg font-black uppercase tracking-widest text-white shadow-[0_20px_40px_-15px_rgba(var(--accent-rgb),0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_25px_45px_-15px_rgba(var(--accent-rgb),0.4)] active:scale-95"
              icon={<PlusIcon size={24} />}
              onClick={() => setSheet({ type: "meal-create" })}
            >
              {t("addMeal")}
            </Button>
          )}
        </motion.div>
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
