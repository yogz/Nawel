"use client";

import { memo } from "react";
import { type Item, type Person } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, CircleHelp } from "lucide-react";
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
    <div
      onClick={() => !readOnly && onAssign()}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 px-1 py-3.5 transition-all active:bg-gray-100/50 sm:gap-4"
      )}
    >
      {/* Status Column - Fixed Width */}
      <div className="shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full border border-white/50 p-0 shadow-sm transition-all duration-500",
            person
              ? "rotate-0 scale-100 bg-white"
              : "rotate-0 border-dashed border-gray-300 bg-gray-100/30"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onAssign();
          }}
          disabled={readOnly}
        >
          {(() => {
            if (!person) {
              return <CircleHelp size={18} className="text-gray-300" />;
            }
            const avatar = renderAvatar(person, allPeopleNames);
            if (avatar.type === "image") {
              return (
                <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-accent/10">
                  <img
                    src={avatar.src}
                    alt={getDisplayName(person)}
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            }
            return <span className="text-sm font-black text-accent">{avatar.value}</span>;
          })()}
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p
              className={cn(
                "text-[15px] font-extrabold leading-tight transition-colors sm:text-base",
                person ? "text-gray-400 line-through decoration-gray-300/50" : "text-gray-800"
              )}
            >
              {item.name}
            </p>
            <p
              className={cn(
                "mt-0.5 text-[10px] font-black uppercase tracking-widest",
                person ? "text-accent" : "text-gray-400"
              )}
            >
              {person ? getDisplayName(person) : t("unassigned")}
            </p>
          </div>
        </div>

        {(item.quantity ||
          item.note ||
          item.price ||
          (item.ingredients && item.ingredients.length > 0)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.quantity?.trim() && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <Scale size={11} className="text-gray-400/70" />
                {item.quantity}
              </div>
            )}
            {item.price && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                <Euro size={11} className="text-green-500/70" />
                {item.price.toFixed(2)}
              </div>
            )}
            {item.note && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium italic text-blue-500">
                <MessageSquare size={11} className="text-blue-400/70" />
                <span className="max-w-[150px] truncate">
                  {item.note.startsWith("EventDashboard.")
                    ? t("defaultNote", { count: peopleCount || 0 })
                    : item.note}
                </span>
              </div>
            )}
            {item.ingredients && item.ingredients.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                <ChefHat size={11} className="text-purple-400/70" />
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
