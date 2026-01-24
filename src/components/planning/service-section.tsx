"use client";

import React, { useState, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { type Service, type Person, type Item } from "@/lib/types";
import { MenuItemRow } from "./menu-item-row";
import { useTranslations } from "next-intl";
import { cn, getServiceIcon } from "@/lib/utils";
import { useTranslatedServiceTitle } from "@/hooks/use-translated-service-title";
import { splitServiceTitle } from "@/lib/service-utils";
import { motion, AnimatePresence } from "framer-motion";
import { InlineItemInput } from "./inline-item-input";

import { SectionHeader } from "./section-header";

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
  currentPersonId?: number;
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
  currentPersonId,
}: ServiceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const t = useTranslations("EventDashboard.Planning");
  const { setNodeRef, isOver } = useDroppable({
    id: `service-${service.id}`,
  });
  const translatedTitle = useTranslatedServiceTitle(service.title);
  const { main, details } = splitServiceTitle(translatedTitle);

  // Prefer stored description if available, otherwise fallback to parsed details
  const displayTitle = service.description ? translatedTitle : main;

  // Try to translate description if it matches a known key
  const descriptionKey = service.description || details;
  const isDescriptionKey = descriptionKey?.startsWith("desc_");
  const translatedDescription = isDescriptionKey
    ? t(`serviceTypes.${descriptionKey}`)
    : descriptionKey;

  const displayDescription = translatedDescription;

  const filteredItems = service.items;

  const allPeopleNames = people.map((p) => p.name);

  return (
    <div
      ref={setNodeRef}
      className={cn("relative transition-all duration-500", isOver && "bg-accent/5")}
    >
      <SectionHeader
        className="sticky top-[calc(env(safe-area-inset-top)+142px)] z-30 mx-1"
        readOnly={readOnly}
        onClick={onEdit}
        icon={service.icon || getServiceIcon(service.title)}
        title={displayTitle}
        description={displayDescription ? `${displayDescription}...` : undefined}
        actions={
          <div className="flex items-center gap-3">
            {filteredItems.length > 0 && (
              <span className="text-xs font-medium text-gray-400">
                {filteredItems.length} {t("items")}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 active:scale-95"
              aria-label={isExpanded ? t("collapse") : t("expand")}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 180 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <ChevronRight className="h-4 w-4" />
              </motion.div>
            </button>
          </div>
        }
      />

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
                    currentPersonId={currentPersonId}
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
