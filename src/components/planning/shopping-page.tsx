"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Share2, ShoppingBag, Copy, CheckCircle } from "lucide-react";
import clsx from "clsx";
import { type Person, type PlanData, type Item, type Ingredient } from "@/lib/types";
import { getPersonEmoji } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateIngredientAction, toggleItemCheckedAction } from "@/app/actions";

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

interface ShoppingPageProps {
  initialPlan: PlanData;
  person: Person;
  slug: string;
  writeKey?: string;
  writeEnabled: boolean;
}

export function ShoppingPage({
  initialPlan,
  person,
  slug,
  writeKey,
  writeEnabled,
}: ShoppingPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Build shopping list from person's assigned items
  const shoppingList = useMemo(() => {
    const list: ShoppingListItem[] = [];

    plan.meals.forEach((meal) => {
      meal.services.forEach((service) => {
        service.items.forEach((item) => {
          if (item.personId !== person.id) return;

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

  const progressPercent =
    shoppingList.length > 0 ? Math.round((checkedCount / shoppingList.length) * 100) : 0;

  const handleToggle = (listItem: ShoppingListItem) => {
    if (!writeEnabled) return;

    startTransition(async () => {
      if (listItem.type === "ingredient") {
        const newChecked = !listItem.ingredient.checked;

        // Optimistic update
        setPlan((prev) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === listItem.item.id
                  ? {
                      ...item,
                      ingredients: item.ingredients?.map((ing) =>
                        ing.id === listItem.ingredient.id ? { ...ing, checked: newChecked } : ing
                      ),
                    }
                  : item
              ),
            })),
          })),
        }));

        await updateIngredientAction({
          id: listItem.ingredient.id,
          checked: newChecked,
          slug,
          key: writeKey,
        });
      } else {
        const newChecked = !listItem.item.checked;

        // Optimistic update
        setPlan((prev) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === listItem.item.id ? { ...item, checked: newChecked } : item
              ),
            })),
          })),
        }));

        await toggleItemCheckedAction({
          id: listItem.item.id,
          checked: newChecked,
          slug,
          key: writeKey,
        });
      }
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Liste de courses - ${person.name}`,
          text: `Liste de courses de ${person.name} pour ${plan.event?.name || slug}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const backUrl = writeKey ? `/event/${slug}?key=${writeKey}` : `/event/${slug}`;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link
            href={backUrl}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-text"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Retour</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-lg">
              {getPersonEmoji(
                person.name,
                plan.people.map((p) => p.name),
                person.emoji
              )}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text">{person.name}</h1>
              <p className="text-xs text-muted-foreground">Liste de courses</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Partager cette liste">
            {copied ? <CheckCircle size={18} className="text-green-500" /> : <Share2 size={18} />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* Progress card */}
        <div className="mb-6 rounded-2xl border border-white/20 bg-white/80 p-4 shadow-lg backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Progression</p>
              <p className="text-2xl font-bold text-text">
                {checkedCount}/{shoppingList.length}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  article{shoppingList.length > 1 ? "s" : ""}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-accent">{progressPercent}%</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Shopping list */}
        {shoppingList.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground">Aucun article assigné</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shoppingList.map((listItem, idx) => {
              const isChecked =
                listItem.type === "ingredient"
                  ? listItem.ingredient.checked
                  : listItem.item.checked;
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
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleToggle(listItem)}
                  disabled={isPending || !writeEnabled}
                  aria-label={`${isChecked ? "Décocher" : "Cocher"} ${itemName}`}
                  aria-pressed={isChecked}
                  className={clsx(
                    "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                    isChecked
                      ? "border-green-200 bg-green-50"
                      : "border-white/20 bg-white/80 shadow-sm hover:border-accent/20 hover:bg-accent/5",
                    !writeEnabled && "cursor-default"
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
                      {listItem.type === "ingredient" && listItem.ingredient.quantity && (
                        <span className="text-sm text-muted-foreground">
                          {listItem.ingredient.quantity}
                        </span>
                      )}
                      {listItem.type === "item" && listItem.item.quantity && (
                        <span className="text-sm text-muted-foreground">
                          {listItem.item.quantity}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {listItem.type === "ingredient" && (
                        <>
                          <span className="font-medium">{listItem.item.name}</span>
                          {" · "}
                        </>
                      )}
                      {listItem.mealTitle} · {listItem.serviceTitle}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Read-only notice */}
        {!writeEnabled && shoppingList.length > 0 && (
          <div className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700">
            Mode lecture seule. Demandez le lien d&apos;édition pour cocher les articles.
          </div>
        )}
      </main>
    </div>
  );
}
