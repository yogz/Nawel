"use client";

import type { PlanData } from "@/lib/types";
import type { SheetState } from "./use-event-state";
import { useItemHandlers } from "@/features/items";
import { useMealHandlers } from "@/features/meals";
import { useServiceHandlers } from "@/features/services";
import { usePersonHandlers } from "@/features/people";
import { useIngredientHandlers } from "@/features/ingredients";
import { useEventHandlers as useEventDeleteHandler } from "@/features/events";

interface UseEventHandlersParams {
  plan: PlanData;
  setPlan: React.Dispatch<React.SetStateAction<PlanData>>;
  slug: string;
  writeKey?: string;
  readOnly: boolean;
  setSheet: (sheet: SheetState | null) => void;
  setSuccessMessage: (message: { text: string; type?: "success" | "error" } | null) => void;
  setSelectedPerson?: (id: number | null) => void;
}

/**
 * Composite hook that combines all event-related handlers.
 *
 * For better code organization and tree-shaking, you can also import
 * individual feature hooks directly:
 *
 * @example
 * import { useItemHandlers } from "@/features/items";
 * import { useMealHandlers } from "@/features/meals";
 * import { useServiceHandlers } from "@/features/services";
 * import { usePersonHandlers } from "@/features/people";
 * import { useIngredientHandlers } from "@/features/ingredients";
 * import { useEventHandlers } from "@/features/events";
 */
export function useEventHandlers(params: UseEventHandlersParams) {
  const itemHandlers = useItemHandlers(params);
  const mealHandlers = useMealHandlers(params);
  const serviceHandlers = useServiceHandlers(params);
  const personHandlers = usePersonHandlers(params);
  const ingredientHandlers = useIngredientHandlers(params);
  const eventHandlers = useEventDeleteHandler(params);

  return {
    // Item handlers
    handleCreateItem: itemHandlers.handleCreateItem,
    handleUpdateItem: itemHandlers.handleUpdateItem,
    handleAssign: itemHandlers.handleAssign,
    handleDelete: itemHandlers.handleDelete,
    handleMoveItem: itemHandlers.handleMoveItem,
    findItem: itemHandlers.findItem,

    // Meal handlers
    handleCreateMeal: mealHandlers.handleCreateMeal,
    handleCreateMealWithServices: mealHandlers.handleCreateMealWithServices,
    handleUpdateMeal: mealHandlers.handleUpdateMeal,
    handleDeleteMeal: mealHandlers.handleDeleteMeal,

    // Service handlers
    handleCreateService: serviceHandlers.handleCreateService,
    handleUpdateService: serviceHandlers.handleUpdateService,
    handleDeleteService: serviceHandlers.handleDeleteService,

    // Person handlers
    handleCreatePerson: personHandlers.handleCreatePerson,
    handleUpdatePerson: personHandlers.handleUpdatePerson,
    handleDeletePerson: personHandlers.handleDeletePerson,

    // Event handlers
    handleDeleteEvent: eventHandlers.handleDeleteEvent,

    // Ingredient handlers
    handleGenerateIngredients: ingredientHandlers.handleGenerateIngredients,
    handleToggleIngredient: ingredientHandlers.handleToggleIngredient,
    handleDeleteIngredient: ingredientHandlers.handleDeleteIngredient,
    handleCreateIngredient: ingredientHandlers.handleCreateIngredient,
    handleDeleteAllIngredients: ingredientHandlers.handleDeleteAllIngredients,
  };
}
