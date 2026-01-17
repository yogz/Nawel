"use client";

import React, { useState, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PlusIcon, Edit3, ChevronRight } from "lucide-react";
import { type Service, type Person, type Item } from "@/lib/types";
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

  const filteredItems = service.items;

  const allPeopleNames = people.map((p) => p.name);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:shadow-accent/5",
        isOver && "bg-accent/5 ring-1 ring-accent/20"
      )}
    >
      <div className="relative z-10 flex items-center justify-between border-b border-gray-100 px-6 py-5 sm:px-7">
        <div
          role={readOnly ? undefined : "button"}
          tabIndex={readOnly ? undefined : 0}
          className={cn(
            "group flex flex-1 items-center gap-4 text-left",
            !readOnly &&
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-[20px] shadow-lg shadow-accent/20 ring-4 ring-white transition-all duration-300 group-hover:scale-110 sm:h-12 sm:w-12 sm:text-[22px]">
            {service.icon || getServiceIcon(service.title)}
          </div>
          <div className="flex-1">
            <h3 className="text-gradient-header text-sm font-bold uppercase tracking-[0.15em] sm:text-base">
              {translatedTitle}
            </h3>
            {filteredItems.length > 0 && (
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-accent/40">
                {filteredItems.length} {t("items")}
              </p>
            )}
          </div>
          {!readOnly && (
            <span className="text-accent/20 opacity-0 transition-all group-hover:text-accent group-hover:opacity-100">
              <Edit3 size={14} strokeWidth={1.8} />
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/5 text-accent transition-all hover:bg-accent/10 sm:h-10 sm:w-10"
          aria-label={isExpanded ? t("collapse") : t("expand")}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronRight className="h-6 w-6" />
          </motion.div>
        </button>
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
            <div className="flex flex-col">
              {filteredItems.map((item) => (
                <div key={item.id} className="group-item relative">
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
                <div className="p-3 sm:p-4">
                  <Button
                    variant="premium"
                    className="h-12 w-full touch-manipulation rounded-[20px] border border-dashed border-gray-200 bg-white/50 text-gray-500 shadow-sm transition-all duration-300 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-[0.98]"
                    icon={<PlusIcon size={18} strokeWidth={3} />}
                    onClick={() => {
                      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                        navigator.vibrate(10);
                      }
                      onCreate();
                    }}
                    aria-label={t("addItem")}
                  >
                    <span className="text-xs font-black uppercase tracking-[0.2em]">
                      {t("addItem")}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
