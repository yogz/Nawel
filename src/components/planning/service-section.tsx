"use client";

import React, { useState, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { type Service, type Person, type Item } from "@/lib/types";
import { MenuItemRow } from "./menu-item-row";
import { useTranslations } from "next-intl";
import { cn, getServiceIcon } from "@/lib/utils";
import { useTranslatedServiceTitle } from "@/hooks/use-translated-service-title";
import { motion, AnimatePresence } from "framer-motion";
import { InlineItemInput } from "./inline-item-input";

interface ServiceSectionProps {
  service: Service;
  people: Person[];
  readOnly?: boolean;
  onAssign: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreate: () => void;
  onEdit: () => void;
  onInlineAdd?: (name: string) => Promise<void> | void;
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
  onInlineAdd,
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
      className={cn("relative transition-all duration-500", isOver && "bg-accent/5")}
    >
      <div className="relative z-20 flex items-center justify-between px-4 py-3 mb-8">
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-[16px] shadow-sm transition-all duration-300 group-hover:scale-110">
            {service.icon || getServiceIcon(service.title)}
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 text-sm font-extrabold tracking-tight">
              {translatedTitle}
            </h3>
            {filteredItems.length > 0 && (
              <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                {filteredItems.length} {t("items")}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-500 transition-all hover:bg-black/[0.08] active:scale-95"
          aria-label={isExpanded ? t("collapse") : t("expand")}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronRight className="h-5 w-5" />
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
            <div className="flex flex-col gap-1">
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
                  {onInlineAdd ? (
                    <div className="flex items-center gap-2">
                      <InlineItemInput
                        onAdd={onInlineAdd}
                        placeholder={t("addItemPlaceholder")}
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                            navigator.vibrate(10);
                          }
                          onCreate();
                        }}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 active:scale-95"
                        aria-label={t("addItemDetails")}
                        title={t("addItemDetails")}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                          navigator.vibrate(10);
                        }
                        onCreate();
                      }}
                      className="flex items-center gap-1 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
                      aria-label={t("addItem")}
                    >
                      <MoreHorizontal size={14} className="mt-0.5" />
                      <span>{t("addItem")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
