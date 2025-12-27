"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, ExternalLink, Check, UserX, ChevronDown, Users } from "lucide-react";
import { getPersonEmoji } from "@/lib/utils";
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

interface ShoppingTabProps {
  plan: PlanData;
  slug: string;
  writeKey?: string;
  currentUserId?: string;
}

export function ShoppingTab({ plan, slug, writeKey, currentUserId }: ShoppingTabProps) {
  const [isPending, startTransition] = useTransition();

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
    if (selectedPersonId === "all") return null;
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
          if (!targetPersonIds.includes(item.personId!)) return;

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

  const checkedCount = shoppingList.filter((item) => item.checked).length;

  const progressPercent =
    shoppingList.length > 0 ? Math.round((checkedCount / shoppingList.length) * 100) : 0;

  const handleToggle = (aggregatedItem: AggregatedShoppingItem) => {
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

      await Promise.all(promises);
    });
  };

  // Non-owner user not linked to any person
  if (!isOwner && !currentPerson) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserX className="mb-4 h-16 w-16 text-gray-200" />
        <h3 className="mb-2 text-lg font-bold text-text">Profil non associé</h3>
        <p className="text-sm text-muted-foreground">
          Allez dans l&apos;onglet &quot;Convives&quot; et cliquez sur &quot;C&apos;est moi !&quot;
          pour vous associer à un profil.
        </p>
      </div>
    );
  }

  // No items assigned at all
  if (peopleWithItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingCart className="mb-4 h-16 w-16 text-gray-200" />
        <h3 className="mb-2 text-lg font-bold text-text">Aucune course</h3>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Aucun article n'est assigné pour le moment."
            : "Aucun article ne vous est assigné pour le moment."}
        </p>
      </div>
    );
  }

  // Calculate per-person summaries for "all" view
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
            if (item.personId !== person.id) return;

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
          <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-base font-medium">
            <SelectValue placeholder="Sélectionner un convive" />
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
                    {getPersonEmoji(
                      person.name,
                      plan.people.map((p) => p.name),
                      person.emoji
                    )}
                  </span>
                  <span>{person.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Global progress */}
        <div className="premium-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progression totale</p>
              <p className="text-2xl font-bold text-text">
                {checkedAll}/{totalAll}
                <span className="ml-2 text-sm font-normal text-muted-foreground">articles</span>
              </p>
            </div>
            <div className="text-3xl font-black text-accent">{progressAll}%</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressAll}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
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
                className="group block rounded-2xl border border-black/[0.03] bg-white p-4 shadow-sm transition-all hover:border-accent/20 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
                    {getPersonEmoji(
                      person.name,
                      plan.people.map((p) => p.name),
                      person.emoji
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-text">{person.name}</h3>
                      {isComplete && (
                        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          <Check size={10} />
                          Terminé
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          className={`h-full rounded-full ${isComplete ? "bg-green-500" : "bg-accent"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
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
          <SelectTrigger className="h-12 rounded-2xl border-gray-200 bg-white text-base font-medium">
            <SelectValue placeholder="Sélectionner un convive" />
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
                    {getPersonEmoji(
                      person.name,
                      plan.people.map((p) => p.name),
                      person.emoji
                    )}
                  </span>
                  <span>{person.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Header with progress */}
      <div className="premium-card p-5">
        <div className="mb-3 flex items-center gap-4">
          {displayPerson && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-3xl">
              {getPersonEmoji(
                displayPerson.name,
                plan.people.map((p) => p.name),
                displayPerson.emoji
              )}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-text">{displayPerson?.name || "Ma liste"}</h2>
            <p className="text-sm text-muted-foreground">
              {checkedCount}/{shoppingList.length} article{shoppingList.length > 1 ? "s" : ""}{" "}
              acheté
              {checkedCount > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-3xl font-black text-accent">{progressPercent}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Full screen link */}
      {fullPageUrl && (
        <Link
          href={fullPageUrl}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
        >
          <ExternalLink size={16} />
          Ouvrir en plein écran
        </Link>
      )}

      {/* Shopping list */}
      <div className="space-y-2">
        {shoppingList.map((aggregatedItem, idx) => {
          const isChecked = aggregatedItem.checked;
          const itemName = aggregatedItem.name;

          return (
            <motion.button
              key={aggregatedItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => handleToggle(aggregatedItem)}
              disabled={isPending}
              aria-label={`${isChecked ? "Décocher" : "Cocher"} ${itemName}`}
              aria-pressed={isChecked}
              className={clsx(
                "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                isChecked
                  ? "border-green-200 bg-green-50"
                  : "border-white/20 bg-white shadow-sm hover:border-accent/20 hover:bg-accent/5"
              )}
            >
              {/* Checkbox */}
              <div
                className={clsx(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                  isChecked ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                )}
              >
                {isChecked && <Check size={14} strokeWidth={3} />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={clsx(
                      "text-base font-semibold",
                      isChecked ? "text-green-700 line-through" : "text-text"
                    )}
                  >
                    {itemName}
                  </span>
                  {(aggregatedItem.quantity !== null || aggregatedItem.unit) && (
                    <span className="text-sm text-muted-foreground">
                      {formatAggregatedQuantity(aggregatedItem.quantity, aggregatedItem.unit)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {aggregatedItem.sources.length > 1 ? (
                    <span className="font-medium text-accent">
                      {aggregatedItem.sources.length} sources
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
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
