"use client";

import { memo } from "react";
import { type Item, type Person } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, CircleHelp, Edit3, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "../ui/button";
import { SwipeableCard } from "../ui/swipeable-card";
import { cn } from "@/lib/utils";

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
    <button
      type="button"
      onClick={() => !readOnly && onAssign()}
      disabled={readOnly}
      aria-label={readOnly ? undefined : t("editItem", { name: item.name })}
      className={cn(
        "group relative flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-all duration-300 hover:z-20 hover:translate-x-1 hover:scale-[1.01] hover:rounded-xl hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.98] active:bg-black/5",
        !readOnly &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
      )}
    >
      {/* Left side: Item Name & Metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5">
          <div className="group flex items-center gap-2">
            <p
              className={cn(
                "text-[16px] font-bold leading-tight transition-colors sm:text-lg",
                "text-gray-900",
                person && "opacity-100"
              )}
            >
              {item.name}
            </p>
            {!readOnly && (
              <Edit3 className="h-3 w-3 shrink-0 text-accent/20 opacity-0 transition-all hover:text-accent group-hover:opacity-100" />
            )}
          </div>

          {(item.quantity ||
            item.note ||
            item.price ||
            (item.ingredients && item.ingredients.length > 0)) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.quantity?.trim() && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  <Scale size={11} className="text-gray-500" />
                  {item.quantity}
                </div>
              )}
              {item.price && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                  <Euro size={11} className="text-green-600/70" />
                  {item.price.toFixed(2)}
                </div>
              )}
              {item.ingredients && item.ingredients.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  <ChefHat size={11} className="text-purple-600/70" />
                  {item.ingredients.filter((i) => i.checked).length}/{item.ingredients.length}
                </div>
              )}
              {item.note && (
                <div className="flex items-center gap-1 text-[10px] font-medium italic text-blue-700">
                  <MessageSquare size={11} className="text-blue-600/70" />
                  <span className="max-w-[140px] truncate">
                    {item.note.startsWith("EventDashboard.")
                      ? t("defaultNote", { count: peopleCount || 0 })
                      : item.note}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Person Name & Avatar */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex flex-col items-end">
          {person ? (
            getDisplayName(person)
          ) : (
            <div
              className="group relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-accent/10 px-2 py-0.5 pr-3 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:bg-accent hover:shadow-md hover:ring-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent transition-all duration-300 group-hover:bg-white group-hover:text-accent">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75 group-hover:bg-white"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent group-hover:bg-white"></span>
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-accent transition-colors duration-300 group-hover:text-white">
                {t("takeAction")}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-500",
              person
                ? "border-white/50 bg-white shadow-sm"
                : "border-dashed border-gray-300 bg-gray-100/30"
            )}
          >
            {(() => {
              if (!person) {
                return (
                  <div className="relative">
                    <Plus size={16} className="text-accent" />
                    <div className="absolute -inset-1 animate-pulse rounded-full bg-accent/20" />
                  </div>
                );
              }
              const avatar = renderAvatar(person, allPeopleNames);
              if (avatar.type === "image") {
                return (
                  <div className="h-full w-full overflow-hidden rounded-full ring-1 ring-accent/10">
                    <img
                      src={avatar.src}
                      alt={getDisplayName(person)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              }
              return <span className="text-[12px] font-black text-accent">{avatar.value}</span>;
            })()}
          </div>
        </div>
      </div>

      {/* Subtle bottom line for separation */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/5" />
    </button>
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
