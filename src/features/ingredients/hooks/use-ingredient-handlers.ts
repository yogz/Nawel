"use client";

import { useTransition } from "react";
import {
  generateIngredientsAction,
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
  setSuccessMessage,
}: IngredientHandlerParams) {
  const [, startTransition] = useTransition();

  const handleGenerateIngredients = async (
    itemId: number,
    itemName: string,
    peopleCount?: number
  ) => {
    if (readOnly) {
      return [];
    }

    const result = await generateIngredientsAction({
      itemId,
      itemName,
      peopleCount,
      slug,
      key: writeKey,
    });

    if (!result.success) {
      setSuccessMessage({ text: result.error, type: "error" });
      return [];
    }

    const generated = result.data;

    setPlan((prev: PlanData) => ({
      ...prev,
      meals: prev.meals.map((meal) => ({
        ...meal,
        services: meal.services.map((service) => ({
          ...service,
          items: service.items.map((item) =>
            item.id === itemId ? { ...item, ingredients: generated } : item
          ),
        })),
      })),
    }));

    return generated;
  };

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
      await updateIngredientAction({
        id: ingredientId,
        checked,
        slug,
        key: writeKey,
      });
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
      await deleteIngredientAction({ id: ingredientId, slug, key: writeKey });
    });
  };

  const handleCreateIngredient = (itemId: number, name: string, quantity?: string) => {
    if (readOnly) {
      return;
    }

    startTransition(async () => {
      const created = await createIngredientAction({
        itemId,
        name,
        quantity,
        slug,
        key: writeKey,
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
      await deleteAllIngredientsAction({ itemId, slug, key: writeKey });
    });
  };

  return {
    handleGenerateIngredients,
    handleToggleIngredient,
    handleDeleteIngredient,
    handleCreateIngredient,
    handleDeleteAllIngredients,
  };
}
