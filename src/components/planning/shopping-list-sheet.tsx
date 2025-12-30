"use client";

import { useMemo, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Check, ShoppingBag, ExternalLink } from "lucide-react";
import clsx from "clsx";
import { type Person, type PlanData, type Item, type Ingredient } from "@/lib/types";
import { renderAvatar } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  aggregateShoppingList,
  formatAggregatedQuantity,
  type AggregatedShoppingItem,
} from "@/lib/shopping-utils";

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
  const t = useTranslations("EventDashboard.Shopping");
  const fullPageUrl = writeKey
    ? `/event/${slug}/shopping/${person.id}?key=${writeKey}`
    : `/event/${slug}/shopping/${person.id}`;
  const [isPending, startTransition] = useTransition();

  // Build shopping list from person's assigned items
  const shoppingList = useMemo(() => {
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

          // If item has ingredients, add each ingredient
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
            // No ingredients, add the item itself
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
  }, [plan.meals, person.id]);

  const checkedCount = shoppingList.filter((item) => item.checked).length;

  const handleToggle = (aggregatedItem: AggregatedShoppingItem) => {
    startTransition(() => {
      const newChecked = !aggregatedItem.checked;
      aggregatedItem.sources.forEach((source) => {
        if (source.type === "ingredient") {
          onToggleIngredient(source.ingredient!.id, source.item.id, newChecked);
        } else {
          onToggleItemChecked(source.item.id, newChecked);
        }
      });
    });
  };

  if (shoppingList.length === 0) {
    return (
      <div className="py-8 text-center">
        <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm text-muted-foreground">{t("noItemsFor", { name: person.name })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Full page link - at top for easy access */}
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={fullPageUrl}>
          <ExternalLink size={14} className="mr-2" />
          {t("openFullScreen")}
        </Link>
      </Button>

      {/* Header with progress */}
      <div className="flex items-center justify-between rounded-xl bg-accent/5 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-accent/10 text-xl">
            {(() => {
              const avatar = renderAvatar(
                person,
                plan.people.map((p) => p.name)
              );
              if (avatar.type === "image") {
                return (
                  <img src={avatar.src} alt={person.name} className="h-full w-full object-cover" />
                );
              }
              return avatar.value;
            })()}
          </div>
          <div>
            <p className="font-semibold text-text">{person.name}</p>
            <p className="text-xs text-muted-foreground">
              {checkedCount}/{shoppingList.length} {t("bought", { count: checkedCount })}
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
        {shoppingList.map((aggregatedItem, idx) => {
          const isChecked = aggregatedItem.checked;
          const itemName = aggregatedItem.name;

          return (
            <motion.button
              key={aggregatedItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => handleToggle(aggregatedItem)}
              disabled={isPending}
              aria-label={`${t(isChecked ? "uncheck" : "check")} ${itemName}`}
              aria-pressed={isChecked}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                isChecked
                  ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-white shadow-sm hover:border-accent/20 hover:bg-accent/5"
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
                    {itemName}
                  </span>
                  {(aggregatedItem.quantity !== null || aggregatedItem.unit) && (
                    <span className="text-sm text-muted-foreground">
                      {formatAggregatedQuantity(aggregatedItem.quantity, aggregatedItem.unit)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {aggregatedItem.sources.length > 1 ? (
                    <span className="font-medium text-accent">
                      {t("sources", { count: aggregatedItem.sources.length })}
                    </span>
                  ) : (
                    <>
                      {aggregatedItem.sources[0].type === "ingredient" ? (
                        <>
                          <span className="font-medium">{aggregatedItem.sources[0].item.name}</span>
                          {" · "}
                        </>
                      ) : null}
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
