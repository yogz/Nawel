"use client";

import { memo, useState, useEffect } from "react";
import { type Item, type Person } from "@/lib/types";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import { Scale, Euro, MessageSquare, ChefHat, Edit3, Plus, ArrowRight } from "lucide-react";
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
    <button
      type="button"
      onClick={handleClick}
      disabled={readOnly}
      aria-label={readOnly ? undefined : t("editItem", { name: item.name })}
      className={cn(
        "group relative flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-all duration-300 hover:z-20 hover:translate-x-1 hover:scale-[1.01] hover:rounded-xl hover:bg-white hover:shadow-lg active:scale-[0.96] active:bg-gray-100 sm:px-3 sm:py-4",
        !readOnly &&
          "cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
      )}
    >
      {/* Main Content Container */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2">
          {/* Header row: Item Name */}
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
              <Edit3
                className="h-4 w-4 shrink-0 text-accent/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:h-3.5 sm:w-3.5"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Bottom row: Metadata & Person Action */}
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            {/* Metadata (quantity, price, etc.) */}
            {(item.quantity ||
              item.note ||
              item.price ||
              (item.ingredients && item.ingredients.length > 0)) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {item.quantity?.trim() && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-700 sm:text-[10px]">
                    <Scale
                      size={13}
                      className="text-gray-600 sm:h-[11px] sm:w-[11px]"
                      aria-hidden="true"
                    />
                    {item.quantity}
                  </div>
                )}
                {item.price && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700 sm:text-[10px]">
                    <Euro
                      size={13}
                      className="text-green-600 sm:h-[11px] sm:w-[11px]"
                      aria-hidden="true"
                    />
                    {item.price.toFixed(2)}
                  </div>
                )}
                {item.ingredients && item.ingredients.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-700 sm:text-[10px]">
                    <ChefHat
                      size={13}
                      className="text-purple-600 sm:h-[11px] sm:w-[11px]"
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

            {/* Person & Avatar / Take Action (moved here) */}
            <div
              className={cn(
                "flex shrink-0 items-center gap-2",
                person ? "rounded-lg border border-accent/20 bg-accent/10 px-2 py-1" : "gap-3"
              )}
            >
              <div className="flex flex-col items-end">
                {person ? (
                  <span className="text-xs font-semibold text-accent sm:text-[10px]">
                    {getDisplayName(person)}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="group relative flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 border-dashed border-gray-300 bg-transparent px-2.5 py-1 pr-3 transition-all duration-300 hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 active:scale-95 sm:h-9"
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
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-all duration-300 group-hover:text-accent sm:h-8 sm:w-8">
                      <Plus size={18} className="transition-colors duration-300 sm:h-4 sm:w-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-600 transition-colors duration-300 group-hover:text-accent sm:text-[10px]">
                      {t("takeAction")}
                    </span>
                  </button>
                )}
              </div>

              {person && (
                <div className="shrink-0">
                  {(() => {
                    const avatar = renderAvatar(person, allPeopleNames);
                    if (avatar.type === "image") {
                      return (
                        <img
                          src={avatar.src}
                          alt={getDisplayName(person)}
                          className="h-6 w-6 rounded object-cover sm:h-5 sm:w-5"
                          loading="lazy"
                          decoding="async"
                        />
                      );
                    }
                    return (
                      <span
                        className="text-base font-black text-accent sm:text-sm"
                        aria-hidden="true"
                      >
                        {avatar.value}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle bottom line for separation */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-black/5" />

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
