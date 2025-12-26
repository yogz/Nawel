"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ShoppingBag, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { type Person, type PlanData, type Item, type Ingredient } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShoppingItem {
  type: "ingredient";
  ingredient: Ingredient;
  item: Item;
  mealTitle: string;
  serviceTitle: string;
}

interface ShoppingItemOnly {
  type: "item";
  item: Item;
  mealTitle: string;
  serviceTitle: string;
}

type ShoppingListItem = ShoppingItem | ShoppingItemOnly;

interface ShoppingListSheetProps {
  person: Person;
  plan: PlanData;
  slug: string;
  writeKey?: string;
  onToggleIngredient: (id: number, itemId: number, checked: boolean) => void;
  onToggleItemChecked: (id: number, checked: boolean) => void;
}

export function ShoppingListSheet({
  person,
  plan,
  slug,
  writeKey,
  onToggleIngredient,
  onToggleItemChecked,
}: ShoppingListSheetProps) {
  const fullPageUrl = writeKey
    ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
    : `/event/${slug}/shopping/${person.id}`;
  const [isPending, startTransition] = useTransition();

  // Build shopping list from person's assigned items
  const shoppingList = useMemo(() => {
    const list: ShoppingListItem[] = [];

    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (item.personId !== person.id) return;

          // If item has ingredients, add each ingredient
          if (item.ingredients && item.ingredients.length > 0) {
            item.ingredients.forEach((ing) => {
              list.push({
                type: "ingredient",
                ingredient: ing,
                item,
                mealTitle: meal.title || meal.date,
                serviceTitle: service.title,
              });
            });
          } else {
            // No ingredients, add the item itself
            list.push({
              type: "item",
              item,
              mealTitle: meal.title || meal.date,
              serviceTitle: service.title,
            });
          }
        });
      });
    });

    return list;
  }, [plan.meals, person.id]);

  const checkedCount = shoppingList.filter((item) =>
    item.type === "ingredient" ? item.ingredient.checked : item.item.checked
  ).length;

  const handleToggle = (listItem: ShoppingListItem) => {
    startTransition(() => {
      if (listItem.type === "ingredient") {
        onToggleIngredient(listItem.ingredient.id, listItem.item.id, !listItem.ingredient.checked);
      } else {
        onToggleItemChecked(listItem.item.id, !listItem.item.checked);
      }
    });
  };

  if (shoppingList.length === 0) {
    return (
      <div className="py-8 text-center">
        <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm text-muted-foreground">Aucun article à acheter pour {person.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Full page link - at top for easy access */}
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={fullPageUrl}>
          <ExternalLink size={14} className="mr-2" />
          Ouvrir en plein écran
        </Link>
      </Button>

      {/* Header with progress */}
      <div className="flex items-center justify-between rounded-xl bg-accent/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-xl">
            {getPersonEmoji(
              person.name,
              plan.people.map((p) => p.name),
              person.emoji
            )}
          </div>
          <div>
            <p className="font-semibold text-text">{person.name}</p>
            <p className="text-xs text-muted-foreground">
              {checkedCount}/{shoppingList.length} acheté{checkedCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-accent">
            {Math.round((checkedCount / shoppingList.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Shopping list */}
      <div className="space-y-2">
        {shoppingList.map((listItem, idx) => {
          const isChecked =
            listItem.type === "ingredient" ? listItem.ingredient.checked : listItem.item.checked;
          const key =
            listItem.type === "ingredient"
              ? `ing-${listItem.ingredient.id}`
              : `item-${listItem.item.id}`;

          const itemName =
            listItem.type === "ingredient" ? listItem.ingredient.name : listItem.item.name;

          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => handleToggle(listItem)}
              disabled={isPending}
              aria-label={`${isChecked ? "Décocher" : "Cocher"} ${itemName}`}
              aria-pressed={isChecked}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                isChecked
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-white hover:border-accent/20 hover:bg-accent/5"
              )}
            >
              {/* Checkbox */}
              <div
                className={clsx(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                  isChecked ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                )}
              >
                {isChecked && <Check size={12} strokeWidth={3} />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={clsx(
                      "font-medium",
                      isChecked ? "text-green-700 line-through" : "text-text"
                    )}
                  >
                    {listItem.type === "ingredient" ? listItem.ingredient.name : listItem.item.name}
                  </span>
                  {listItem.type === "ingredient" && listItem.ingredient.quantity && (
                    <span className="text-sm text-muted-foreground">
                      {listItem.ingredient.quantity}
                    </span>
                  )}
                  {listItem.type === "item" && listItem.item.quantity && (
                    <span className="text-sm text-muted-foreground">{listItem.item.quantity}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {listItem.type === "ingredient" ? (
                    <>
                      <span className="font-medium">{listItem.item.name}</span>
                      {" · "}
                    </>
                  ) : null}
                  {listItem.mealTitle} · {listItem.serviceTitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
