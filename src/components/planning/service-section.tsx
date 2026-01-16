"use client";

import React, { useState, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PlusIcon, Edit3, ChevronRight } from "lucide-react";
import { type PlanningFilter, type Service, type Person, type Item } from "@/lib/types";
import { MenuItemRow } from "./menu-item-row";
import { Button } from "../ui/button";
import { useTranslations } from "next-intl";
import { cn, getServiceIcon } from "@/lib/utils";
import { useTranslatedServiceTitle } from "@/hooks/use-translated-service-title";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceSectionProps {
  service: Service;
  people: Person[];
  readOnly?: boolean;
  onAssign: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreate: () => void;
  onEdit: () => void;
  filter: PlanningFilter;
  activeItemId: number | null;
  handleAssign?: (item: Item, personId: number | null) => void;
  currentUserId?: string;
}

export const ServiceSection = memo(function ServiceSection({
  service,
  people,
  readOnly,
  onAssign,
  onDelete,
  onCreate,
  onEdit,
  filter,
  activeItemId: _activeItemId,
  handleAssign,
  currentUserId,
}: ServiceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const t = useTranslations("EventDashboard.Planning");
  const { setNodeRef, isOver } = useDroppable({
    id: `service-${service.id}`,
  });

  const translatedTitle = useTranslatedServiceTitle(service.title);

  const filteredItems = service.items.filter((i) => {
    if (filter.type === "all") {
      return true;
    }
    if (filter.type === "unassigned") {
      return !i.personId;
    }
    if (filter.type === "person") {
      return i.personId === filter.personId;
    }
    return true;
  });

  if (filter.type !== "all" && filteredItems.length === 0) {
    return null;
  }

  const allPeopleNames = people.map((p) => p.name);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-2xl border border-white/60 bg-white/70 px-2 py-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-white/80 hover:bg-white/75 hover:shadow-xl sm:px-3 sm:py-6",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-50",
        isOver && "scale-[1.01] ring-2 ring-accent/50 ring-offset-2"
      )}
    >
      <div className="relative z-10 mb-5 flex items-center justify-between border-b border-white/40 pb-3">
        <div
          role={readOnly ? undefined : "button"}
          tabIndex={readOnly ? undefined : 0}
          className={cn(
            "group flex items-center gap-2 text-left",
            !readOnly &&
              "cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
          )}
          onClick={() => !readOnly && onEdit()}
          onKeyDown={(e) => {
            if (!readOnly && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onEdit();
            }
          }}
          aria-label={readOnly ? undefined : t("editService", { name: translatedTitle })}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/10 bg-accent/5 transition-all hover:bg-black/5"
              aria-label={isExpanded ? t("collapse") : t("expand")}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ChevronRight className="h-5 w-5 text-accent" />
              </motion.div>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/10 bg-accent/5 text-base shadow-sm transition-all duration-300 group-hover:border-accent/20 group-hover:bg-accent/10 sm:h-9 sm:w-9">
              {service.icon || getServiceIcon(service.title)}
            </div>
            <h3 className="text-gradient-header text-sm font-black uppercase tracking-[0.15em] sm:text-base">
              {translatedTitle}
            </h3>
          </div>
          {!readOnly && (
            <span className="text-accent/20 opacity-0 transition-all group-hover:text-accent group-hover:opacity-100">
              <Edit3 size={12} />
            </span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="flex flex-col gap-1">
              {filteredItems.map((item, index) => (
                <div key={item.id}>
                  <MenuItemRow
                    item={item}
                    person={people.find((p) => p.id === item.personId)}
                    readOnly={readOnly}
                    onAssign={() => onAssign(item)}
                    onDelete={() => onDelete(item)}
                    allPeopleNames={allPeopleNames}
                    peopleCount={service.peopleCount || 0}
                    handleAssign={handleAssign}
                    currentUserId={currentUserId}
                    people={people}
                  />
                </div>
              ))}

              {!readOnly && (
                <Button
                  variant="premium"
                  className="mt-4 h-14 w-full touch-manipulation rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 active:scale-[0.98] sm:mt-3 sm:h-11"
                  icon={<PlusIcon size={16} strokeWidth={3} className="sm:h-[14px] sm:w-[14px]" />}
                  onClick={() => {
                    // Haptic feedback on mobile
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      navigator.vibrate(10);
                    }
                    onCreate();
                  }}
                  aria-label={t("addItem")}
                >
                  <span className="text-xs font-black uppercase tracking-wider sm:text-[10px]">
                    {t("addItem")}
                  </span>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
