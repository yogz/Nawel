"use client";

import { memo, useState, useEffect } from "react";
import { type Item, type Person } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, Plus, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

import { SwipeableCard } from "../ui/swipeable-card";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface ItemRowProps {
  item: Item;
  person?: Person | null;
  onAssign: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  allPeopleNames?: string[];
  peopleCount?: number;
  handleAssign?: (item: Item, personId: number | null) => void;
  currentUserId?: string;
  people?: Person[];
}

function ItemRowComponent({
  item,
  person,
  onAssign,
  onDelete,
  readOnly,
  allPeopleNames,
  peopleCount,
  handleAssign,
  currentUserId,
  people,
}: ItemRowProps) {
  const t = useTranslations("EventDashboard.ItemForm");
  const tShared = useTranslations("EventDashboard.Shared");
  const isMobile = useIsMobile();
  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("colist_swipe_hint_seen") === "true";
    }
    return false;
  });

  // Haptic feedback on mobile
  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  useEffect(() => {
    if (hasSeenSwipeHint) {
      return;
    }
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setHasSeenSwipeHint(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("colist_swipe_hint_seen", "true");
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasSeenSwipeHint]);

  // Find current user's person if they are linked
  const currentPerson =
    currentUserId && people ? people.find((p) => p.userId === currentUserId) : null;

  // Handle click: if user has a person and item is not assigned, assign directly
  const handleClick = () => {
    if (readOnly) {
      return;
    }

    triggerHaptic();

    // If user is identified/linked to a person and item is not assigned, assign directly
    if (currentPerson && !item.personId && handleAssign) {
      handleAssign(item, currentPerson.id);
    } else {
      // Otherwise, open the drawer to edit/assign
      onAssign();
    }
  };

  const content = (
    <div
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? undefined : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!readOnly && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={readOnly ? undefined : t("editItem", { name: item.name })}
      className={cn(
        "group relative flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-all duration-300 active:scale-[0.99] sm:px-5 sm:py-4",
        "hover:bg-accent/[0.03]",
        !readOnly &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
      )}
    >
      {/* Main Content Container */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2">
          {/* Header row: Item Name */}
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-base font-semibold leading-tight transition-colors sm:text-[15px]",
                "text-gray-900",
                person && "opacity-100"
              )}
            >
              {item.name}
            </p>
          </div>

          {/* Metadata Row */}
          {(item.quantity ||
            item.note ||
            item.price ||
            (item.ingredients && item.ingredients.length > 0)) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {item.quantity?.trim() && (
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground sm:text-[11px]">
                  <Scale
                    size={12}
                    className="text-muted-foreground opacity-70"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {item.quantity}
                </div>
              )}
              {item.price && (
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50/50 px-2 py-0.5 text-[10px] font-bold text-green-700 ring-1 ring-green-500/10">
                  <Euro size={10} className="text-green-600" strokeWidth={1.8} aria-hidden="true" />
                  {item.price.toFixed(2)}
                </div>
              )}
              {item.ingredients && item.ingredients.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-100/80 px-2 py-0.5 text-[10px] font-bold text-gray-600 ring-1 ring-gray-200/50">
                  <ChefHat
                    size={10}
                    className="text-gray-500"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  {item.ingredients.filter((i) => i.checked).length}/{item.ingredients.length}
                </div>
              )}
              {item.note && (
                <div className="flex items-center gap-1.5 text-xs font-medium italic text-blue-700 sm:text-[10px]">
                  <MessageSquare
                    size={13}
                    className="text-blue-600 sm:h-[11px] sm:w-[11px]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
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

      {/* Person & Avatar / Take Action - Always on the right */}
      <div className="flex shrink-0 items-center">
        <div className="flex flex-col items-end">
          {person ? (
            <div className="group/avatar relative flex items-center gap-2 rounded-lg bg-accent/5 px-2 py-1 transition-all hover:bg-accent/10">
              <span className="text-[10px] font-bold text-accent">{getDisplayName(person)}</span>
              <div className="shrink-0">
                {(() => {
                  const avatar = renderAvatar(person, allPeopleNames);
                  if (avatar.type === "image") {
                    return (
                      <div className="h-5 w-5 overflow-hidden rounded-md shadow-sm ring-1 ring-white">
                        <img
                          src={avatar.src}
                          alt={getDisplayName(person)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    );
                  }
                  return (
                    <span className="text-xs font-black text-accent" aria-hidden="true">
                      {avatar.value}
                    </span>
                  );
                })()}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent/10 transition-all duration-300 hover:bg-accent/20 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                if (currentPerson && handleAssign) {
                  triggerHaptic();
                  handleAssign(item, currentPerson.id);
                } else {
                  onAssign();
                }
              }}
              aria-label={t("takeAction")}
              title={t("takeAction")}
            >
              <Plus size={16} className="text-accent" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Subtle bottom line for separation */}
      {/* Subtle bottom line for separation - non-full width */}
      <div className="absolute bottom-0 left-12 right-4 h-px bg-slate-100 group-last:hidden" />

      {/* Swipe hint for mobile */}
      {!readOnly && isMobile && !hasSeenSwipeHint && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 top-0 flex items-center rounded-l-lg bg-accent/10 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setHasSeenSwipeHint(true);
              if (typeof window !== "undefined") {
                localStorage.setItem("colist_swipe_hint_seen", "true");
              }
            }}
          >
            <ArrowRight className="h-4 w-4 animate-pulse text-accent" aria-hidden="true" />
          </motion.div>
        </AnimatePresence>
      )}
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
export const MenuItemRow = memo(ItemRowComponent, (prev, next) => {
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
