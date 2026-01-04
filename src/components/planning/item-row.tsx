"use client";

import { memo } from "react";
import { type Item, type Person } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, CircleHelp, Trash2, Pencil } from "lucide-react";
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
        "group relative mb-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:mb-3 sm:gap-4 sm:p-4",
        person ? "border-l-4 border-l-accent" : "border-l-4 border-l-transparent hover:border-l-gray-300"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-bold leading-snug text-gray-800 transition-colors group-hover:text-accent sm:text-base">
            {item.name}
          </p>
          <div className="shrink-0">
            <Button
              variant="premium"
              size="premium"
              className={cn(
                "h-7 px-2 transition-all duration-300",
                person ? "bg-accent/10 hover:bg-accent/20" : "bg-gray-100 hover:bg-gray-200"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              disabled={readOnly}
              icon={(() => {
                if (!person) {
                  return <CircleHelp size={14} className="text-gray-400" />;
                }
                const avatar = renderAvatar(person, allPeopleNames);
                if (avatar.type === "image") {
                  return (
                    <div className="h-5 w-5 overflow-hidden rounded-full ring-2 ring-white">
                      <img
                        src={avatar.src}
                        alt={getDisplayName(person)}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  );
                }
                return <span className="text-xs font-bold">{avatar.value}</span>;
              })()}
              iconClassName="bg-transparent"
            >
              <span className={cn(
                "inline-block max-w-[80px] truncate text-[10px] font-black uppercase tracking-wider sm:max-w-none",
                person ? "text-accent" : "text-gray-500"
              )}>
                {person ? getDisplayName(person) : t("unassigned")}
              </span>
            </Button>
          </div>
        </div>

        {(item.quantity ||
          item.note ||
          item.price ||
          (item.ingredients && item.ingredients.length > 0)) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {item.quantity?.trim() && (
                <div className="flex items-center gap-1.5 rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <Scale size={11} className="text-gray-400" />
                  {item.quantity}
                </div>
              )}
              {item.price && (
                <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                  <Euro size={11} className="text-green-600" />
                  {item.price.toFixed(2)}
                </div>
              )}
              {item.note && (
                <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium italic text-blue-600">
                  <MessageSquare size={11} className="text-blue-500" />
                  <span className="max-w-[150px] truncate">
                    {item.note.startsWith("EventDashboard.")
                      ? t("defaultNote", { count: peopleCount || 0 })
                      : item.note}
                  </span>
                </div>
              )}
              {item.ingredients && item.ingredients.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  <ChefHat size={11} className="text-purple-500" />
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
