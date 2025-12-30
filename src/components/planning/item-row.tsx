"use client";

import { memo } from "react";
import { type Item, type Person } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "../ui/button";
import { SwipeableCard } from "../ui/swipeable-card";

interface ItemRowProps {
  item: Item;
  person?: Person | null;
  onAssign: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  allPeopleNames?: string[];
  peopleCount?: number;
}

function ItemRowComponent({
  item,
  person,
  onAssign,
  onDelete,
  readOnly,
  allPeopleNames,
  peopleCount,
}: ItemRowProps) {
  const t = useTranslations("EventDashboard.ItemForm");
  const tShared = useTranslations("EventDashboard.Shared");

  const content = (
    <div
      onClick={() => !readOnly && onAssign()}
      className="group mb-2 flex cursor-pointer items-center gap-2 rounded-2xl border border-black/[0.03] bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 hover:border-accent/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] sm:mb-3 sm:gap-3 sm:p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-bold text-text transition-colors group-hover:text-accent">
            {item.name}
          </p>
          <div className="shrink-0">
            <Button
              variant="premium"
              size="premium"
              className="h-8 p-1 pr-3"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              disabled={readOnly}
              icon={
                person ? (
                  <span className="text-sm">
                    {getPersonEmoji(person.name, allPeopleNames, person.emoji)}
                  </span>
                ) : (
                  <CircleHelp size={14} />
                )
              }
              iconClassName={
                !person
                  ? "bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                  : ""
              }
            >
              <span className="inline-block max-w-[80px] truncate text-[10px] font-black uppercase tracking-wider text-gray-700 sm:max-w-none">
                {person ? person.name : t("unassigned")}
              </span>
            </Button>
          </div>
        </div>

        {(item.quantity ||
          item.note ||
          item.price ||
          (item.ingredients && item.ingredients.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.quantity?.trim() && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-gray-500">
                <Scale size={12} className="text-gray-400" />
                {item.quantity}
              </div>
            )}
            {item.price && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-green-600">
                <Euro size={12} className="text-green-500" />
                {item.price.toFixed(2)} €
              </div>
            )}
            {item.note && (
              <div className="flex items-center gap-1 text-[11px] font-bold italic tracking-tight text-gray-500">
                <MessageSquare size={12} className="text-gray-400" />
                <span className="max-w-[150px] truncate">
                  {item.note.startsWith("EventDashboard.")
                    ? t("defaultNote", { count: peopleCount || 0 })
                    : item.note}
                </span>
              </div>
            )}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-tight text-purple-500">
                <ChefHat size={12} className="text-purple-400" />
                {item.ingredients.filter((i) => i.checked).length}/{item.ingredients.length}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (readOnly) {
    return content;
  }

  return (
    <SwipeableCard
      onSwipeLeft={onDelete}
      onSwipeRight={onAssign}
      leftLabel={tShared("delete")}
      rightLabel={tShared("edit")}
      confirmLeft
      confirmLeftTitle={tShared("delete")}
      confirmLeftMessage={`${tShared("delete")} "${item.name}" ?`}
      disabled={readOnly}
    >
      {content}
    </SwipeableCard>
  );
}

// Memoize to prevent re-renders when parent re-renders but item hasn't changed
export const ItemRow = memo(ItemRowComponent, (prev, next) => {
  // Custom comparison for performance - only re-render when these change
  return (
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.quantity === next.item.quantity &&
    prev.item.note === next.item.note &&
    prev.item.price === next.item.price &&
    prev.item.personId === next.item.personId &&
    prev.item.ingredients?.length === next.item.ingredients?.length &&
    prev.person?.id === next.person?.id &&
    prev.person?.name === next.person?.name &&
    prev.readOnly === next.readOnly &&
    prev.peopleCount === next.peopleCount
  );
});
