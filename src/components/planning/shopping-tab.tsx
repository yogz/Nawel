"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { ShoppingCart, ExternalLink, Check, UserX, Users } from "lucide-react";
import { renderAvatar, getDisplayName, cn } from "@/lib/utils";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { type PlanData, type Item, type Ingredient, type Person } from "@/lib/types";
import { updateIngredientAction, toggleItemCheckedAction } from "@/app/actions";
import {
  aggregateShoppingList,
  formatAggregatedQuantity,
  type AggregatedShoppingItem,
} from "@/lib/shopping-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTranslations } from "next-intl";
import { SectionHeader } from "./section-header";
import { PersonAvatar } from "../common/person-avatar";

interface ShoppingTabProps {
  plan: PlanData;
  slug: string;
  writeKey?: string;
  currentUserId?: string;
}

export function ShoppingTab({ plan, slug, writeKey, currentUserId }: ShoppingTabProps) {
  const t = useTranslations("EventDashboard.Shopping");
  const [isPending, startTransition] = useTransition();

  // Optimistic state: track items being toggled for instant UI feedback
  const [optimisticToggles, setOptimisticToggles] = useState<Set<string>>(new Set());

  // Check if current user is the event owner
  const isOwner = currentUserId && plan.event?.ownerId === currentUserId;

  // Find the person linked to the current user
  const currentPerson = useMemo(() => {
    return plan.people.find((p) => p.userId === currentUserId);
  }, [plan.people, currentUserId]);

  // Get all people with assigned items (for owner view)
  const peopleWithItems = useMemo(() => {
    return plan.people.filter((person) => {
      return plan.meals.some((meal) =>
        meal.services.some((service) => service.items.some((item) => item.personId === person.id))
      );
    });
  }, [plan.meals, plan.people]);

  // For owner: default to "all" or their own person, for regular user: their person
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    isOwner ? "all" : currentPerson?.id.toString() || ""
  );

  // Determine which person(s) to show
  const displayPerson = useMemo((): Person | null => {
    if (selectedPersonId === "all") {
      return null;
    }
    const id = parseInt(selectedPersonId);
    return plan.people.find((p) => p.id === id) || null;
  }, [selectedPersonId, plan.people]);

  // Build shopping list for selected person or all
  const shoppingList = useMemo(() => {
    const flatList: {
      type: "ingredient" | "item";
      ingredient?: Ingredient;
      item: Item;
      mealTitle: string;
      serviceTitle: string;
    }[] = [];

    const targetPersonIds =
      selectedPersonId === "all"
        ? peopleWithItems.map((p) => p.id)
        : displayPerson
          ? [displayPerson.id]
          : [];

    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (!targetPersonIds.includes(item.personId!)) {
            return;
          }

          if (item.ingredients && item.ingredients.length > 0) {
            item.ingredients.forEach((ing) => {
              flatList.push({
                type: "ingredient",
                ingredient: ing,
                item,
                mealTitle: meal.title || meal.date,
                serviceTitle: service.title,
              });
            });
          } else {
            flatList.push({
              type: "item",
              item,
              mealTitle: meal.title || meal.date,
              serviceTitle: service.title,
            });
          }
        });
      });
    });

    const aggregated = aggregateShoppingList(flatList);

    // Group by category
    const grouped: Record<string, AggregatedShoppingItem[]> = {};
    aggregated.forEach((item) => {
      // For ingredients, use the category from the first source
      // For items (manual), default to "misc"
      const category = (item.sources[0].ingredient as Ingredient | undefined)?.category || "misc";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  }, [plan.meals, selectedPersonId, displayPerson, peopleWithItems]);

  // Calculate checked count with optimistic state
  const checkedCount = useMemo(() => {
    const allAggregated = Object.values(shoppingList).flat();
    return allAggregated.filter((item) => {
      const isOptimisticallyToggled = optimisticToggles.has(item.id);
      return isOptimisticallyToggled ? !item.checked : item.checked;
    }).length;
  }, [shoppingList, optimisticToggles]);

  const allItems = useMemo(() => Object.values(shoppingList).flat(), [shoppingList]);

  const progressPercent =
    allItems.length > 0 ? Math.round((checkedCount / allItems.length) * 100) : 0;

  // Optimistic toggle: update UI instantly, sync with server in background
  const handleToggle = useCallback(
    (aggregatedItem: AggregatedShoppingItem) => {
      const itemId = aggregatedItem.id;

      // 1. Optimistic update - toggle immediately in UI
      setOptimisticToggles((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });

      // 2. Sync with server in background
      startTransition(async () => {
        const newChecked = !aggregatedItem.checked;

        const promises = aggregatedItem.sources.map((source) => {
          if (source.type === "ingredient") {
            return updateIngredientAction({
              id: source.ingredient!.id,
              checked: newChecked,
              slug,
              key: writeKey,
            });
          } else {
            return toggleItemCheckedAction({
              id: source.item.id,
              checked: newChecked,
              slug,
              key: writeKey,
            });
          }
        });

        try {
          await Promise.all(promises);
          // Server sync successful - clear optimistic state (server state will take over)
          setOptimisticToggles((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        } catch {
          // Rollback on error - remove from optimistic toggles
          setOptimisticToggles((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }
      });
    },
    [slug, writeKey]
  );

  // Helper to get effective checked state (considering optimistic toggles)
  const getEffectiveChecked = useCallback(
    (item: AggregatedShoppingItem) => {
      const isOptimisticallyToggled = optimisticToggles.has(item.id);
      return isOptimisticallyToggled ? !item.checked : item.checked;
    },
    [optimisticToggles]
  );

  // Calculate per-person summaries for "all" view (must be before early returns)
  const personSummaries = useMemo(() => {
    return peopleWithItems.map((person) => {
      const flatList: {
        type: "ingredient" | "item";
        ingredient?: Ingredient;
        item: Item;
        mealTitle: string;
        serviceTitle: string;
      }[] = [];

      plan.meals.forEach((meal) => {
        meal.services.forEach((service) => {
          service.items.forEach((item) => {
            if (item.personId !== person.id) {
              return;
            }

            if (item.ingredients && item.ingredients.length > 0) {
              item.ingredients.forEach((ing) => {
                flatList.push({
                  type: "ingredient",
                  ingredient: ing,
                  item,
                  mealTitle: meal.title || meal.date,
                  serviceTitle: service.title,
                });
              });
            } else {
              flatList.push({
                type: "item",
                item,
                mealTitle: meal.title || meal.date,
                serviceTitle: service.title,
              });
            }
          });
        });
      });

      const aggregated = aggregateShoppingList(flatList);
      const totalItems = aggregated.length;
      const checkedItems = aggregated.filter((i) => i.checked).length;

      return { person, totalItems, checkedItems };
    });
  }, [plan.meals, peopleWithItems]);

  // Non-owner user not linked to any person
  if (!isOwner && !currentPerson) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserX className="mb-4 h-16 w-16 text-gray-200" />
        <h3 className="mb-2 text-lg font-bold text-text">{t("notAssociated")}</h3>
        <p className="text-sm text-muted-foreground">{t("notAssociatedDesc")}</p>
      </div>
    );
  }

  // No items assigned at all
  if (peopleWithItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingCart className="mb-4 h-16 w-16 text-gray-200" />
        <h3 className="mb-2 text-lg font-bold text-text">{t("noShopping")}</h3>
        <p className="text-sm text-muted-foreground">
          {isOwner ? t("noShoppingOwnerDesc") : t("noShoppingUserDesc")}
        </p>
      </div>
    );
  }

  const fullPageUrl =
    displayPerson && writeKey
      ? `/event/${slug}/shopping/${displayPerson.id}?key=${writeKey}`
      : displayPerson
        ? `/event/${slug}/shopping/${displayPerson.id}`
        : null;

  // "All" view for owner - show person cards
  if (selectedPersonId === "all" && isOwner) {
    const totalAll = personSummaries.reduce((acc, s) => acc + s.totalItems, 0);
    const checkedAll = personSummaries.reduce((acc, s) => acc + s.checkedItems, 0);
    const progressAll = totalAll > 0 ? Math.round((checkedAll / totalAll) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Owner dropdown selector */}
        <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
          <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-base font-medium focus:ring-2 focus:ring-accent/50 sm:h-12">
            <SelectValue placeholder={t("selectGuest")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <span>Tous les convives</span>
              </div>
            </SelectItem>
            {peopleWithItems.map((person) => (
              <SelectItem key={person.id} value={person.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>
                    {(() => {
                      const avatar = renderAvatar(
                        person,
                        plan.people.map((p) => p.name)
                      );
                      if (avatar.type === "image") {
                        return (
                          <div className="h-4 w-4 overflow-hidden rounded-full">
                            <img
                              src={avatar.src}
                              alt={getDisplayName(person)}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        );
                      }
                      return avatar.value;
                    })()}
                  </span>
                  <span>{getDisplayName(person)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Global shopping list card */}
        <Link
          href={
            writeKey ? `/event/${slug}/shopping/all?key=${writeKey}` : `/event/${slug}/shopping/all`
          }
          className="block active:scale-[0.99] transition-all"
        >
          <SectionHeader
            title={t("allListTitle")}
            description={
              progressAll === 100 ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                  <Check size={10} />
                  {t("completed")}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-gray-400 capitalize">
                  {checkedAll}/{totalAll} {t("items")}
                </span>
              )
            }
            icon={
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-sm ring-1 ring-gray-100">
                <Users size={20} />
              </div>
            }
            actions={
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-full origin-left rounded-full transition-transform duration-300",
                        progressAll === 100 ? "bg-green-500" : "bg-accent"
                      )}
                      style={{ transform: `scaleX(${progressAll / 100})` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-accent/40">{progressAll}%</span>
                </div>
                <ExternalLink
                  size={14}
                  className="text-gray-300 transition-colors group-hover:text-accent"
                />
              </div>
            }
          />
        </Link>

        {/* Per-person cards */}
        <div className="space-y-3">
          {personSummaries.map(({ person, totalItems, checkedItems }) => {
            const progress = Math.round((checkedItems / totalItems) * 100);
            const isComplete = checkedItems === totalItems;
            const url = writeKey
              ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
              : `/event/${slug}/shopping/${person.id}`;

            return (
              <Link key={person.id} href={url} className="block active:scale-[0.99] transition-all">
                <SectionHeader
                  title={getDisplayName(person)}
                  description={
                    isComplete ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                        <Check size={10} />
                        {t("completed")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-400 capitalize">
                        {checkedItems}/{totalItems} {t("items")}
                      </span>
                    )
                  }
                  icon={
                    <PersonAvatar
                      person={person}
                      allNames={plan.people.map((p) => p.name)}
                      size="md"
                      className="shadow-sm ring-1 ring-gray-100"
                    />
                  }
                  actions={
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-full origin-left rounded-full transition-transform duration-300",
                              isComplete ? "bg-green-500" : "bg-accent"
                            )}
                            style={{ transform: `scaleX(${progress / 100})` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-accent/40">{progress}%</span>
                      </div>
                      <ExternalLink
                        size={14}
                        className="text-gray-300 transition-colors group-hover:text-accent"
                      />
                    </div>
                  }
                />
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Single person view (for owner selecting a person, or regular user)
  return (
    <div className="space-y-4">
      {/* Owner dropdown selector */}
      {isOwner && (
        <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
          <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-base font-medium focus:ring-2 focus:ring-accent/50 sm:h-12">
            <SelectValue placeholder={t("selectGuest")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <span>Tous les convives</span>
              </div>
            </SelectItem>
            {peopleWithItems.map((person) => (
              <SelectItem key={person.id} value={person.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>
                    {(() => {
                      const avatar = renderAvatar(
                        person,
                        plan.people.map((p) => p.name)
                      );
                      if (avatar.type === "image") {
                        return (
                          <div className="h-4 w-4 overflow-hidden rounded-full">
                            <img
                              src={avatar.src}
                              alt={getDisplayName(person)}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        );
                      }
                      return avatar.value;
                    })()}
                  </span>
                  <span>{getDisplayName(person)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Header with progress */}
      <SectionHeader
        title={displayPerson ? getDisplayName(displayPerson) : t("myList")}
        description={
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {checkedCount}/{allItems.length} {t("items")}
          </span>
        }
        icon={
          displayPerson ? (
            <PersonAvatar
              person={displayPerson}
              allNames={plan.people.map((p) => p.name)}
              size="md"
              className="shadow-sm ring-1 ring-gray-100"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <ShoppingCart size={20} />
            </div>
          )
        }
        actions={
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black text-accent/20">{progressPercent}%</div>
            <div className="relative h-2 w-24 overflow-hidden rounded-full bg-gray-100 hidden sm:block">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progressPercent / 100 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 origin-left bg-gradient-to-r from-accent to-accent/80"
              />
            </div>
          </div>
        }
      />

      {/* Full screen link */}
      {fullPageUrl && (
        <Link
          href={fullPageUrl}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-95 sm:h-auto"
        >
          <ExternalLink size={18} className="sm:h-4 sm:w-4" />
          {t("openFullScreen")}
        </Link>
      )}

      {/* Shopping list grouped by category */}
      <div className="space-y-6">
        {Object.entries(shoppingList)
          .sort(([catA], [catB]) => {
            // Put 'misc' at the end
            if (catA === "misc") {
              return 1;
            }
            if (catB === "misc") {
              return -1;
            }
            return catA.localeCompare(catB);
          })
          .map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent/40">
                  {t(`aisles.${category}` as Parameters<typeof t>[0])}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-black/[0.05] to-transparent" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col">
                  {items.map((aggregatedItem) => {
                    const isChecked = getEffectiveChecked(aggregatedItem);
                    const itemName = aggregatedItem.name;

                    return (
                      <motion.button
                        key={aggregatedItem.id}
                        type="button"
                        whileTap={{ scale: 0.995 }}
                        onClick={() => handleToggle(aggregatedItem)}
                        disabled={isPending}
                        aria-label={`${t(isChecked ? "uncheck" : "check") as string} ${itemName}`}
                        aria-pressed={isChecked}
                        className={clsx(
                          "group relative flex w-full items-center gap-4 px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.99]",
                          isChecked ? "bg-gray-50/50" : "hover:bg-gray-50"
                        )}
                      >
                        {/* Checkbox */}
                        <div
                          className={clsx(
                            "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300",
                            isChecked
                              ? "border-green-500 bg-green-500 text-white shadow-sm"
                              : "border-gray-200 bg-white group-hover:border-gray-300"
                          )}
                        >
                          <AnimatePresence mode="wait">
                            {isChecked ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                key="check"
                              >
                                <Check size={14} strokeWidth={4} />
                              </motion.div>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key="empty"
                              />
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                "truncate text-base font-semibold tracking-tight transition-all",
                                isChecked ? "text-gray-400 line-through" : "text-gray-900"
                              )}
                            >
                              {itemName}
                            </span>
                            {(aggregatedItem.quantity !== null || aggregatedItem.unit) && (
                              <span
                                className={cn(
                                  "rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500",
                                  isChecked && "opacity-50"
                                )}
                              >
                                {formatAggregatedQuantity(
                                  aggregatedItem.quantity,
                                  aggregatedItem.unit
                                )}
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 transition-colors",
                              isChecked && "opacity-50"
                            )}
                          >
                            {aggregatedItem.sources.length > 1 ? (
                              <span className="text-accent/60">
                                {t("sources", { count: aggregatedItem.sources.length })}
                              </span>
                            ) : (
                              <span className="truncate block">
                                {aggregatedItem.sources[0].type === "ingredient" && (
                                  <>
                                    <span className="text-muted-foreground">
                                      {aggregatedItem.sources[0].item.name}
                                    </span>
                                    {" • "}
                                  </>
                                )}
                                {plan.meals.length > 1 && (
                                  <>{aggregatedItem.sources[0].mealTitle} • </>
                                )}
                                {aggregatedItem.sources[0].serviceTitle}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Subtle separator */}
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gray-50 group-last:hidden" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
