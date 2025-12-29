"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { ServiceSection } from "./service-section";
import { CitationDisplay } from "../common/citation-display";
import {
  PlusIcon,
  Pencil,
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
      <div className="space-y-12">
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 px-2">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rotate-6 rounded-2xl bg-accent/20 blur-xl transition-transform group-hover:rotate-12" />
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-accent to-accent/80 text-white shadow-xl ring-4 ring-accent/5 backdrop-blur-sm">
                    <span className="text-2xl drop-shadow-sm">🎄</span>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col pt-0.5">
                  <div className="flex items-center gap-2">
                    {!readOnly ? (
                      <button
                        onClick={() => setSheet({ type: "meal-edit", meal })}
                        className="group flex min-w-0 items-center gap-2 text-left transition-colors"
                        aria-label={`${t("editMeal")} ${meal.title || meal.date}`}
                      >
                        <h2 className="truncate text-2xl font-black tracking-tight text-text decoration-accent/30 decoration-2 underline-offset-4 transition-all group-hover:text-accent group-hover:underline">
                          {meal.title || meal.date}
                        </h2>
                      </button>
                    ) : (
                      <h2 className="truncate text-2xl font-black tracking-tight text-text">
                        {meal.title || meal.date}
                      </h2>
                    )}

                    <div className="flex items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="premium"
                            className="h-8 w-8 rounded-full border border-black/[0.03] bg-white/50 p-0 shadow-sm transition-all hover:bg-white hover:shadow-md"
                            icon={<CalendarPlus className="h-4 w-4 text-accent" />}
                            iconClassName="h-7 w-7 bg-transparent shadow-none ring-0"
                            aria-label={t("calendar.options")}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="glass w-56 p-2" align="start">
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

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {meal.time && (
                      <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {meal.time}
                      </div>
                    )}
                    {meal.address && (
                      <div className="flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-accent">
                        <MapPin className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">{meal.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 pl-0.5">
                    <CitationDisplay />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
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
      </div>
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
        <div className="mt-8 flex flex-col gap-3 px-4">
          <Button
            variant="premium"
            className="w-full border-2 border-dashed border-gray-200 p-4 pr-6"
            icon={<PlusIcon />}
            iconClassName="bg-gray-100 text-gray-400 group-hover:bg-gray-900"
            onClick={() => onCreateService(plan.meals[0]?.id ?? -1)}
          >
            <span className="font-semibold text-gray-600">{t("addService")}</span>
          </Button>
          <Button
            variant="premium"
            className="w-full border-2 border-dashed border-accent/20 bg-accent/5 p-4 pr-6"
            icon={<PlusIcon />}
            onClick={() => setSheet({ type: "meal-create" })}
          >
            <span className="font-semibold text-accent">{t("addMeal")}</span>
          </Button>
        </div>
      )}
    </DndContext>
  );
}
