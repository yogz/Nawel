"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { ShoppingCart, ExternalLink, Check, UserX, Users } from "lucide-react";
import { renderAvatar, getDisplayName } from "@/lib/utils";
import clsx from "clsx";
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

    return aggregateShoppingList(flatList);
  }, [plan.meals, selectedPersonId, displayPerson, peopleWithItems]);

  // Calculate checked count with optimistic state
  const checkedCount = useMemo(() => {
    return shoppingList.filter((item) => {
      const isOptimisticallyToggled = optimisticToggles.has(item.id);
      return isOptimisticallyToggled ? !item.checked : item.checked;
    }).length;
  }, [shoppingList, optimisticToggles]);

  const progressPercent =
    shoppingList.length > 0 ? Math.round((checkedCount / shoppingList.length) * 100) : 0;

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

        {/* Global progress */}
        <div className="rounded-2xl border border-l-4 border-black/[0.05] border-l-accent bg-white/95 p-5 shadow-sm backdrop-blur-sm transition-all duration-300">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("totalProgress")}</p>
              <p className="text-2xl font-bold text-text">
                {checkedAll}/{totalAll}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{t("items")}</span>
              </p>
            </div>
            <div className="text-3xl font-black text-accent">{progressAll}%</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-accent to-primary transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${progressAll / 100})` }}
            />
          </div>
        </div>

        {/* Per-person cards */}
        <div className="space-y-3">
          {personSummaries.map(({ person, totalItems, checkedItems }) => {
            const progress = Math.round((checkedItems / totalItems) * 100);
            const isComplete = checkedItems === totalItems;
            const url = writeKey
              ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
              : `/event/${slug}/shopping/${person.id}`;

            return (
              <Link
                key={person.id}
                href={url}
                className="group relative block overflow-hidden rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 active:scale-[0.99]"
              >
                {/* Decorative background gradient */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/10" />
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-accent/10 text-2xl">
                      {(() => {
                        const avatar = renderAvatar(
                          person,
                          plan.people.map((p) => p.name)
                        );
                        if (avatar.type === "image") {
                          return (
                            <img
                              src={avatar.src}
                              alt={getDisplayName(person)}
                              className="h-full w-full object-cover"
                            />
                          );
                        }
                        return avatar.value;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-text">{getDisplayName(person)}</h3>
                        {isComplete && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            <Check size={10} />
                            {t("completed")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full w-full origin-left rounded-full transition-transform duration-300 ${isComplete ? "bg-green-500" : "bg-accent"}`}
                            style={{ transform: `scaleX(${progress / 100})` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {checkedItems}/{totalItems}
                        </span>
                      </div>
                    </div>
                    <ExternalLink
                      size={18}
                      className="shrink-0 text-gray-300 transition-colors group-hover:text-accent"
                    />
                  </div>
                </div>
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
      <div className="rounded-2xl border border-l-4 border-black/[0.05] border-l-accent bg-white/95 p-5 shadow-sm backdrop-blur-sm transition-all duration-300">
        <div className="mb-3 flex items-center gap-4">
          {displayPerson && (
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-accent/10 text-3xl">
              {(() => {
                const avatar = renderAvatar(
                  displayPerson,
                  plan.people.map((p) => p.name)
                );
                if (avatar.type === "image") {
                  return (
                    <img
                      src={avatar.src}
                      alt={displayPerson ? getDisplayName(displayPerson) : ""}
                      className="h-full w-full object-cover"
                    />
                  );
                }
                return avatar.value;
              })()}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text">
              {displayPerson ? getDisplayName(displayPerson) : t("myList")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {checkedCount}/{shoppingList.length} {t("items")}{" "}
              {t("bought", { count: checkedCount })}
            </p>
          </div>
          <div className="text-3xl font-black text-accent">{progressPercent}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-accent to-primary transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

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

      {/* Shopping list */}
      <div className="space-y-2">
        {shoppingList.map((aggregatedItem) => {
          // Use optimistic state for instant feedback
          const isChecked = getEffectiveChecked(aggregatedItem);
          const itemName = aggregatedItem.name;

          return (
            <button
              key={aggregatedItem.id}
              type="button"
              onClick={() => handleToggle(aggregatedItem)}
              disabled={isPending}
              aria-label={`${t(isChecked ? "uncheck" : "check")} ${itemName}`}
              aria-pressed={isChecked}
              className={clsx(
                "group relative flex w-full items-start gap-4 overflow-hidden rounded-[24px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.99] sm:p-4",
                isChecked
                  ? "border-green-200 bg-green-50 shadow-sm"
                  : "border border-gray-100 bg-white shadow-sm hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5"
              )}
            >
              {/* Decorative background gradient */}
              {!isChecked && (
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/5 blur-3xl transition-all group-hover:bg-accent/10" />
              )}
              {/* Checkbox */}
              <div
                className={clsx(
                  "relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all sm:h-6 sm:w-6",
                  isChecked ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                )}
              >
                {isChecked && (
                  <Check size={16} strokeWidth={3} className="sm:h-[14px] sm:w-[14px]" />
                )}
              </div>

              {/* Content */}
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={clsx(
                      "text-base font-semibold transition-all sm:text-base",
                      isChecked ? "text-green-700 line-through" : "text-text"
                    )}
                  >
                    {itemName}
                  </span>
                  {(aggregatedItem.quantity !== null || aggregatedItem.unit) && (
                    <span className="text-sm text-muted-foreground sm:text-sm">
                      {formatAggregatedQuantity(aggregatedItem.quantity, aggregatedItem.unit)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-xs">
                  {aggregatedItem.sources.length > 1 ? (
                    <span className="font-medium text-accent">
                      {t("sources", { count: aggregatedItem.sources.length })}
                    </span>
                  ) : (
                    <>
                      {aggregatedItem.sources[0].type === "ingredient" && (
                        <>
                          <span className="font-medium">{aggregatedItem.sources[0].item.name}</span>
                          {" · "}
                        </>
                      )}
                      {aggregatedItem.sources[0].mealTitle} ·{" "}
                      {aggregatedItem.sources[0].serviceTitle}
                    </>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
