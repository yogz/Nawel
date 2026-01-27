"use client";

import { useTransition } from "react";
import {
  createIngredientAction,
  updateIngredientAction,
  deleteIngredientAction,
  deleteAllIngredientsAction,
} from "@/app/actions";
import type { PlanData } from "@/lib/types";
import type { IngredientHandlerParams } from "@/features/shared/types";

export function useIngredientHandlers({
  setPlan,
  slug,
  writeKey,
  readOnly,
  token,
}: IngredientHandlerParams) {
  const [, startTransition] = useTransition();

  const handleToggleIngredient = (ingredientId: number, itemId: number, checked: boolean) => {
    if (readOnly) {
      return;
    }

    // Optimistic update
    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ingredients: item.ingredients?.map((ing) =>
                    ing.id === ingredientId ? { ...ing, checked } : ing
                  ),
                }
              : item
          ),
        })),
      })),
    }));

    startTransition(async () => {
      try {
        await updateIngredientAction({
          id: ingredientId,
          checked,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
      } catch (error) {
        console.error("Failed to toggle ingredient:", error);
      }
    });
  };

  const handleDeleteIngredient = (ingredientId: number, itemId: number) => {
    if (readOnly) {
      return;
    }

    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ingredients: item.ingredients?.filter((ing) => ing.id !== ingredientId),
                }
              : item
          ),
        })),
      })),
    }));

    startTransition(async () => {
      try {
        await deleteIngredientAction({
          id: ingredientId,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
      } catch (error) {
        console.error("Failed to delete ingredient:", error);
      }
    });
  };

  const handleCreateIngredient = (itemId: number, name: string, quantity?: string) => {
    if (readOnly) {
      return;
    }

    startTransition(async () => {
      try {
        const created = await createIngredientAction({
          itemId,
          name,
          quantity,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });

        setPlan((prev: PlanData) => ({
          ...prev,
          meals: prev.meals.map((meal) => ({
            ...meal,
            services: meal.services.map((service) => ({
              ...service,
              items: service.items.map((item) =>
                item.id === itemId
                  ? { ...item, ingredients: [...(item.ingredients || []), created] }
                  : item
              ),
            })),
          })),
        }));
      } catch (error) {
        console.error("Failed to create ingredient:", error);
      }
    });
  };

  const handleDeleteAllIngredients = (itemId: number) => {
    if (readOnly) {
      return;
    }

    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.id === itemId ? { ...item, ingredients: [] } : item
          ),
        })),
      })),
    }));

    startTransition(async () => {
      try {
        await deleteAllIngredientsAction({
          itemId,
          slug,
          key: writeKey,
          token: token ?? undefined,
        });
      } catch (error) {
        console.error("Failed to delete all ingredients:", error);
      }
    });
  };

  return {
    handleToggleIngredient,
    handleDeleteIngredient,
    handleCreateIngredient,
    handleDeleteAllIngredients,
  };
}
